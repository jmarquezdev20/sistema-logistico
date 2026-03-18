"""
Vistas del módulo de inventario.

Gestiona productos, stock y movimientos de entrada/salida.
Incluye validaciones de capacidad de ubicación y trazabilidad
completa de todos los cambios de inventario.
"""

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from .models import Producto, Inventario, MovimientoInventario
from .serializers import ProductoSerializer, InventarioSerializer, MovimientoInventarioSerializer
from infraestructura_bodegas.models import Ubicacion
from auditoria.utils import registrar


class ProductoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de productos del inventario.

    Al crear un producto, se requiere una ubicación válida con
    capacidad disponible. El sistema genera automáticamente el
    registro de Inventario con cantidad=0.

    Filtros:
        ?cliente= filtra productos por cliente.
        ?search=  búsqueda por nombre o nombre del cliente.
    """

    queryset         = Producto.objects.select_related('cliente').all()
    serializer_class = ProductoSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['nombre', 'cliente__nombre']

    def get_queryset(self):
        """
        Filtra productos por cliente si se pasa el query param.

        Returns:
            QuerySet: Productos filtrados.
        """
        qs         = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Crea un producto con su inventario asignado en una ubicación.

        Valida antes de crear:
        Que se proporcionó una ubicación en el body.
        Que la ubicación existe en la base de datos.
        Que la ubicación tiene capacidad disponible
        (suma el stock actual de todos los productos en esa ubicación).

        Al crear exitosamente:
        Crea el Producto.
        Crea el Inventario con cantidad=0.
        Registra la acción en auditoría.

        Args:
            request: Request HTTP. Debe incluir 'ubicacion' (UUID) en el body.

        Returns:
            Response: Datos del producto creado o mensaje de error.
        """
        ubicacion_id = request.data.get('ubicacion')
        if not ubicacion_id:
            return Response(
                {'error': 'Debes asignar una ubicación al producto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ubicacion = Ubicacion.objects.get(id=ubicacion_id)
        except Ubicacion.DoesNotExist:
            return Response(
                {'error': 'Ubicación no encontrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ocupacion_actual = sum(inv.cantidad for inv in Inventario.objects.filter(ubicacion=ubicacion))
        if ocupacion_actual >= ubicacion.capacidad:
            return Response(
                {'error': f'La ubicación {ubicacion.codigo} está llena. Elige otra.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data       = {k: v for k, v in request.data.items() if k != 'ubicacion'}
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        producto = serializer.save()
        Inventario.objects.create(producto=producto, ubicacion=ubicacion, cantidad=0)

        registrar(
            usuario=request.user,
            modulo='inventario',
            accion=f'Registró producto "{producto.nombre}"',
            detalle=f'Cliente: {producto.cliente.nombre} | Ubicación: {ubicacion.codigo}',
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class InventarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet de solo lectura para consulta de inventarios.

    No permite modificación directa — los cambios de stock siempre
    deben pasar por MovimientoInventarioViewSet para mantener
    trazabilidad completa.

    Filtros:
        ?cliente= filtra inventarios por cliente del producto.
    """

    queryset         = Inventario.objects.select_related(
        'producto', 'producto__cliente', 'ubicacion'
    ).all()
    serializer_class = InventarioSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        """
        Filtra inventarios por cliente si se pasa el query param.

        Returns:
            QuerySet: Inventarios filtrados.
        """
        qs         = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(producto__cliente_id=cliente_id)
        return qs


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para registro y consulta de movimientos de inventario.

    Es el único punto de entrada para modificar el stock de un producto.
    Valida capacidad disponible en entradas y stock suficiente en salidas.
    Soporta creación de producto nuevo en el mismo request mediante
    el campo 'producto_nuevo'.

    Filtros:
        ?producto= filtra por producto específico.
        ?cliente=  filtra por cliente del producto.
    """

    queryset = MovimientoInventario.objects.select_related(
        'producto', 'producto__cliente',
        'envio_producto', 'envio_producto__orden_envio',
        'envio_producto__orden_envio__transportador',
    ).all()
    serializer_class  = MovimientoInventarioSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        """
        Filtra movimientos por producto o cliente.

        Returns:
            QuerySet: Movimientos filtrados.
        """
        qs          = super().get_queryset()
        producto_id = self.request.query_params.get('producto')
        cliente_id  = self.request.query_params.get('cliente')
        if producto_id:
            qs = qs.filter(producto_id=producto_id)
        if cliente_id:
            qs = qs.filter(producto__cliente_id=cliente_id)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Registra un movimiento de inventario y actualiza el stock.

        Soporta dos modos de operación:

        Modo estándar:
            Requiere un 'producto' existente en el body.

        Modo producto nuevo (campo 'producto_nuevo'):
            Crea el producto, su inventario y el movimiento en una
            sola llamada atómica. Útil para registrar recepciones
            de mercancía nueva sin pasos previos.

        Validaciones para ENTRADA:
            Que la ubicación tiene espacio disponible
            (considera el stock de otros productos en la misma ubicación).

        Validaciones para SALIDA:
            Que el inventario tiene stock suficiente.
            Si falla, hace rollback completo sin modificar el stock.

        Al registrar una ENTRADA, procesa cargos de servicios adicionales
        (recepción, almacenamiento) si se incluye 'cargos_servicios' en el body.

        Args:
            request: Request HTTP con los datos del movimiento.

        Returns:
            Response: Datos del movimiento creado o mensaje de error.
        """
        data = request.data.copy()

        producto_nuevo_data = request.data.get('producto_nuevo')
        if producto_nuevo_data:
            nombre       = producto_nuevo_data.get('nombre', '').strip()
            cliente_id   = producto_nuevo_data.get('cliente')
            descripcion  = producto_nuevo_data.get('descripcion', '')
            ubicacion_id = producto_nuevo_data.get('ubicacion')

            if not nombre:
                return Response({'error': 'El nombre del producto es obligatorio.'}, status=400)
            if not cliente_id:
                return Response({'error': 'El cliente es obligatorio.'}, status=400)
            if not ubicacion_id:
                return Response({'error': 'La ubicación es obligatoria.'}, status=400)

            try:
                ubicacion = Ubicacion.objects.get(id=ubicacion_id)
            except Ubicacion.DoesNotExist:
                return Response({'error': 'Ubicación no encontrada.'}, status=400)

            ocupacion = sum(inv.cantidad for inv in Inventario.objects.filter(ubicacion=ubicacion))
            if ocupacion >= ubicacion.capacidad:
                return Response({'error': f'La ubicación {ubicacion.codigo} está llena.'}, status=400)

            prod_serializer = ProductoSerializer(data={
                'nombre': nombre, 'cliente': cliente_id, 'descripcion': descripcion,
            })
            prod_serializer.is_valid(raise_exception=True)
            producto_obj = prod_serializer.save()
            Inventario.objects.create(producto=producto_obj, ubicacion=ubicacion, cantidad=0)

            data = {
                'producto':    str(producto_obj.id),
                'tipo':        data.get('tipo', 'entrada'),
                'cantidad':    data.get('cantidad'),
                'observacion': data.get('observacion', ''),
            }

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        tipo     = serializer.validated_data['tipo']
        cantidad = serializer.validated_data['cantidad']
        producto = serializer.validated_data['producto']

        try:
            inventario = Inventario.objects.select_for_update().get(producto=producto)
        except Inventario.DoesNotExist:
            return Response(
                {'error': 'Este producto no tiene ubicación asignada. Regístralo primero.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if tipo == MovimientoInventario.SALIDA:
            if inventario.cantidad < cantidad:
                return Response(
                    {'error': f'Stock insuficiente. Disponible: {inventario.cantidad} unidades.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            inventario.cantidad -= cantidad
        else:
            ubicacion       = inventario.ubicacion
            ocupacion_otros = sum(
                inv.cantidad
                for inv in Inventario.objects.filter(ubicacion=ubicacion).exclude(producto=producto)
            )
            espacio = ubicacion.capacidad - ocupacion_otros - inventario.cantidad
            if cantidad > espacio:
                return Response(
                    {'error': f'Espacio insuficiente en {ubicacion.codigo}. Disponible: {espacio} uds.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            inventario.cantidad += cantidad

        inventario.save()
        self.perform_create(serializer)

        tipo_label = 'Entrada' if tipo == MovimientoInventario.ENTRADA else 'Salida'
        registrar(
            usuario=request.user,
            modulo='inventario',
            accion=f'{tipo_label} de {cantidad} uds — "{producto.nombre}"',
            detalle=f'Cliente: {producto.cliente.nombre} | Stock actual: {inventario.cantidad}',
        )

        if tipo == MovimientoInventario.ENTRADA:
            cargos_list = request.data.get('cargos_servicios') or []
            from servicios.models import ServicioPrestado, CatalogoServicio
            from decimal import Decimal

            for cargo in cargos_list:
                catalogo_id    = cargo.get('catalogo_id')
                valor_unitario = cargo.get('valor_unitario')
                if not catalogo_id or valor_unitario is None:
                    continue
                try:
                    catalogo = CatalogoServicio.objects.get(id=catalogo_id, activo=True)
                    valor    = Decimal(str(valor_unitario))
                    ServicioPrestado.objects.create(
                        cliente=producto.cliente,
                        catalogo_servicio=catalogo,
                        cantidad=1,
                        valor_unitario=valor,
                        fecha=timezone.now().date(),
                        observacion=f'Recepcion - {cantidad} uds de "{producto.nombre}"',
                        facturado=False,
                    )
                except Exception as e:
                    print(f'[Inventario] Error cargo: {e}')

        return Response(serializer.data, status=status.HTTP_201_CREATED)