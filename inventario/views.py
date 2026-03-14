from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from .models import Producto, Inventario, MovimientoInventario
from .serializers import ProductoSerializer, InventarioSerializer, MovimientoInventarioSerializer
from infraestructura_bodegas.models import Ubicacion
from auditoria.utils import registrar


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.select_related('cliente').all()
    serializer_class = ProductoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'cliente__nombre']

    def get_queryset(self):
        qs = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        ubicacion_id = request.data.get('ubicacion')
        if not ubicacion_id:
            return Response({'error': 'Debes asignar una ubicación al producto.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ubicacion = Ubicacion.objects.get(id=ubicacion_id)
        except Ubicacion.DoesNotExist:
            return Response({'error': 'Ubicación no encontrada.'}, status=status.HTTP_400_BAD_REQUEST)

        ocupacion_actual = sum(inv.cantidad for inv in Inventario.objects.filter(ubicacion=ubicacion))
        if ocupacion_actual >= ubicacion.capacidad:
            return Response({'error': f'La ubicación {ubicacion.codigo} está llena. Elige otra.'}, status=status.HTTP_400_BAD_REQUEST)

        data = {k: v for k, v in request.data.items() if k != 'ubicacion'}
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
    queryset = Inventario.objects.select_related('producto', 'producto__cliente', 'ubicacion').all()
    serializer_class = InventarioSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(producto__cliente_id=cliente_id)  # ← filtro por cliente
        return qs


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    queryset = MovimientoInventario.objects.select_related(
        'producto', 'producto__cliente',
        'envio_producto', 'envio_producto__orden_envio',
        'envio_producto__orden_envio__transportador'
    ).all()
    serializer_class = MovimientoInventarioSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        producto_id = self.request.query_params.get('producto')
        cliente_id  = self.request.query_params.get('cliente')
        if producto_id:
            qs = qs.filter(producto_id=producto_id)
        if cliente_id:
            qs = qs.filter(producto__cliente_id=cliente_id)  # ← filtro por cliente
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
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

            prod_serializer = ProductoSerializer(data={'nombre': nombre, 'cliente': cliente_id, 'descripcion': descripcion})
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
                status=status.HTTP_400_BAD_REQUEST
            )

        if tipo == MovimientoInventario.SALIDA:
            if inventario.cantidad < cantidad:
                return Response(
                    {'error': f'Stock insuficiente. Disponible: {inventario.cantidad} unidades.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            inventario.cantidad -= cantidad
        else:
            ubicacion       = inventario.ubicacion
            ocupacion_otros = sum(inv.cantidad for inv in Inventario.objects.filter(ubicacion=ubicacion).exclude(producto=producto))
            espacio         = ubicacion.capacidad - ocupacion_otros - inventario.cantidad
            if cantidad > espacio:
                return Response({'error': f'Espacio insuficiente en {ubicacion.codigo}. Disponible: {espacio} uds.'}, status=status.HTTP_400_BAD_REQUEST)
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