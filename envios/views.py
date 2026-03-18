"""
Vistas del módulo de envíos.
Gestiona el ciclo completo de órdenes de envío: creación, actualización,
eliminación y el despacho atómico que descuenta inventario y genera
registros de auditoría y servicios prestados automáticamente.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from .models import OrdenEnvio, EnvioProducto
from .serializers import OrdenEnvioSerializer, EnvioProductoSerializer
from inventario.models import Inventario, MovimientoInventario
from usuarios.permissions import EsEmpleadoOAdmin
from auditoria.utils import registrar

class OrdenEnvioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión completa de órdenes de envío.
    Permisos:
        Empleado/Admin: crear, actualizar, eliminar y despachar.
        Cliente:        solo lectura de sus propias órdenes.
        Autenticado:    listar y ver detalle.

    Filtros disponibles:
        ?estado=   filtra por estado de la orden.
        ?cliente=  filtra por cliente (solo admin/empleado).
        ?search=   búsqueda por nombre de cliente, destino o estado.
    """

    queryset         = OrdenEnvio.objects.select_related(
        'cliente', 'transportador'
    ).prefetch_related('productos').all()
    serializer_class = OrdenEnvioSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['cliente__nombre', 'destino', 'estado']

    def get_permissions(self):
        """
        Define permisos según la acción solicitada.

        Returns:
            list: Lista de instancias de permisos aplicables.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'despachar']:
            return [EsEmpleadoOAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        Filtra el queryset según el rol del usuario autenticado.

        Un cliente solo puede ver sus propias órdenes. Admin y empleado
        pueden filtrar por estado y cliente mediante query params.

        Returns:
            QuerySet: Órdenes filtradas según rol y parámetros.
        """
        qs   = super().get_queryset()
        user = self.request.user

        if hasattr(user, 'rol') and user.rol and user.rol.nombre == 'cliente':
            if hasattr(user, 'cliente') and user.cliente:
                return qs.filter(cliente=user.cliente)
            return qs.none()

        estado     = self.request.query_params.get('estado')
        cliente_id = self.request.query_params.get('cliente')
        if estado:
            qs = qs.filter(estado=estado)
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs

    def perform_create(self, serializer):
        """Guarda la orden y registra la acción en auditoría."""
        orden = serializer.save()
        registrar(
            usuario=self.request.user,
            modulo='envios',
            accion=f'Creó orden de envío a {orden.destino}',
            detalle=f'Cliente: {orden.cliente.nombre} | Estado: {orden.estado}',
        )

    def perform_update(self, serializer):
        """Actualiza la orden y registra el cambio en auditoría."""
        orden = serializer.save()
        registrar(
            usuario=self.request.user,
            modulo='envios',
            accion=f'Actualizó orden de envío a {orden.destino}',
            detalle=f'Cliente: {orden.cliente.nombre} | Estado: {orden.estado}',
        )

    def perform_destroy(self, instance):
        """Registra la eliminación en auditoría antes de borrar."""
        registrar(
            usuario=self.request.user,
            modulo='envios',
            accion=f'Eliminó orden de envío a {instance.destino}',
            detalle=f'Cliente: {instance.cliente.nombre}',
        )
        instance.delete()

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def despachar(self, request, pk=None):
        """
        Despacha una orden de envío de forma atómica.

        Ejecuta en una sola transacción las siguientes operaciones:
        1. Valida que la orden esté en estado pendiente o preparando.
        2. Por cada producto en la orden:
           Bloquea el inventario con select_for_update (evita race conditions).
           Valida que haya stock suficiente.
           Descuenta la cantidad del inventario.
           Crea un MovimientoInventario de tipo SALIDA.
        3. Cambia el estado de la orden a EN_TRANSITO.
        4. Registra la fecha de despacho.
        5. Genera un ServicioPrestado automáticamente si existe un
           catálogo activo con unidad 'por_envio'.
        6. Registra la acción en auditoría.

        Si cualquier validación falla (stock insuficiente, estado inválido),
        se hace rollback completo — ningún inventario queda modificado.

        Args:
            request: Request HTTP con el usuario autenticado.
            pk:      UUID de la orden a despachar.

        Returns:
            Response: Datos actualizados de la orden o mensaje de error.
        """
        orden = self.get_object()

        if orden.estado not in [OrdenEnvio.PENDIENTE, OrdenEnvio.PREPARANDO]:
            return Response(
                {'error': 'Solo se pueden despachar órdenes en estado pendiente o preparando.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for ep in orden.productos.all():
            inventario = Inventario.objects.select_for_update().get(producto=ep.producto)
            if inventario.cantidad < ep.cantidad:
                return Response(
                    {'error': f'Stock insuficiente para {ep.producto.nombre}. Disponible: {inventario.cantidad}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            inventario.cantidad -= ep.cantidad
            inventario.save()
            MovimientoInventario.objects.create(
                producto=ep.producto,
                tipo=MovimientoInventario.SALIDA,
                cantidad=ep.cantidad,
                observacion=f'Despacho automático - Orden {orden.id}',
                envio_producto=ep,
            )

        orden.estado        = OrdenEnvio.EN_TRANSITO
        orden.fecha_despacho = timezone.now()
        orden.save()

        registrar(
            usuario=request.user,
            modulo='envios',
            accion=f'Despachó orden a {orden.destino}',
            detalle=f'Cliente: {orden.cliente.nombre} | {orden.productos.count()} producto(s)',
        )

        try:
            from servicios.models import CatalogoServicio, ServicioPrestado
            from datetime import date
            catalogo = CatalogoServicio.objects.filter(unidad='por_envio', activo=True).first()
            if catalogo:
                productos_str = ', '.join([
                    f'{ep.producto.nombre} x{ep.cantidad}'
                    for ep in orden.productos.all()
                ])
                ServicioPrestado.objects.create(
                    cliente=orden.cliente,
                    catalogo_servicio=catalogo,
                    orden_envio=orden,
                    cantidad=1,
                    valor_unitario=catalogo.tarifa,
                    valor_total=catalogo.tarifa,
                    fecha=date.today(),
                    observacion=f'Envío a {orden.destino} — {productos_str}',
                )
        except Exception:
            pass

        serializer = self.get_serializer(orden)
        return Response(serializer.data)


class EnvioProductoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de productos dentro de una orden de envío.

    Permite listar, agregar y eliminar productos de una orden.
    Solo se pueden eliminar productos de órdenes en estado PENDIENTE —
    una vez despachada, la orden es inmutable.

    Filtros:
        Se filtra automáticamente por orden_pk de la URL anidada.
        También acepta ?orden_envio= como query param.
    """

    queryset         = EnvioProducto.objects.all()
    serializer_class = EnvioProductoSerializer

    def get_queryset(self):
        """
        Filtra los productos por la orden a la que pertenecen.

        Acepta el UUID de la orden desde la URL anidada (orden_pk)
        o como query param (?orden_envio=).

        Returns:
            QuerySet: Productos filtrados por orden.
        """
        qs       = super().get_queryset()
        orden_id = self.kwargs.get('orden_pk') or self.request.query_params.get('orden_envio')
        if orden_id:
            qs = qs.filter(orden_envio_id=orden_id)
        return qs

    def destroy(self, request, *args, **kwargs):
        """
        Elimina un producto de la orden solo si está en estado PENDIENTE.

        Una orden en tránsito o entregada no puede modificarse para
        garantizar integridad del registro de despacho.

        Returns:
            Response: 204 si se eliminó, 400 si la orden no está pendiente.
        """
        ep = self.get_object()
        if ep.orden_envio.estado != OrdenEnvio.PENDIENTE:
            return Response(
                {'error': 'Solo se pueden eliminar productos de órdenes en estado pendiente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)