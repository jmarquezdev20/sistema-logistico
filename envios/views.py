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
    queryset = OrdenEnvio.objects.select_related('cliente', 'transportador').prefetch_related('productos').all()
    serializer_class = OrdenEnvioSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['cliente__nombre', 'destino', 'estado']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'despachar']:
            return [EsEmpleadoOAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Cliente solo ve sus propios envíos
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
        orden = serializer.save()
        registrar(usuario=self.request.user, modulo='envios',
            accion=f'Creó orden de envío a {orden.destino}',
            detalle=f'Cliente: {orden.cliente.nombre} | Estado: {orden.estado}')

    def perform_update(self, serializer):
        orden = serializer.save()
        registrar(usuario=self.request.user, modulo='envios',
            accion=f'Actualizó orden de envío a {orden.destino}',
            detalle=f'Cliente: {orden.cliente.nombre} | Estado: {orden.estado}')

    def perform_destroy(self, instance):
        registrar(usuario=self.request.user, modulo='envios',
            accion=f'Eliminó orden de envío a {instance.destino}',
            detalle=f'Cliente: {instance.cliente.nombre}')
        instance.delete()

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def despachar(self, request, pk=None):
        orden = self.get_object()
        if orden.estado not in [OrdenEnvio.PENDIENTE, OrdenEnvio.PREPARANDO]:
            return Response(
                {'error': 'Solo se pueden despachar órdenes en estado pendiente o preparando.'},
                status=status.HTTP_400_BAD_REQUEST)

        for ep in orden.productos.all():
            inventario = Inventario.objects.select_for_update().get(producto=ep.producto)
            if inventario.cantidad < ep.cantidad:
                return Response(
                    {'error': f'Stock insuficiente para {ep.producto.nombre}. Disponible: {inventario.cantidad}'},
                    status=status.HTTP_400_BAD_REQUEST)
            inventario.cantidad -= ep.cantidad
            inventario.save()
            MovimientoInventario.objects.create(
                producto=ep.producto, tipo=MovimientoInventario.SALIDA,
                cantidad=ep.cantidad,
                observacion=f'Despacho automático - Orden {orden.id}',
                envio_producto=ep)

        orden.estado = OrdenEnvio.EN_TRANSITO
        orden.fecha_despacho = timezone.now()
        orden.save()

        registrar(usuario=request.user, modulo='envios',
            accion=f'Despachó orden a {orden.destino}',
            detalle=f'Cliente: {orden.cliente.nombre} | {orden.productos.count()} producto(s)')

        try:
            from servicios.models import CatalogoServicio, ServicioPrestado
            from datetime import date
            catalogo = CatalogoServicio.objects.filter(unidad='por_envio', activo=True).first()
            if catalogo:
                productos_str = ', '.join([f'{ep.producto.nombre} x{ep.cantidad}' for ep in orden.productos.all()])
                ServicioPrestado.objects.create(
                    cliente=orden.cliente, catalogo_servicio=catalogo,
                    orden_envio=orden, cantidad=1,
                    valor_unitario=catalogo.tarifa, valor_total=catalogo.tarifa,
                    fecha=date.today(),
                    observacion=f'Envío a {orden.destino} — {productos_str}')
        except Exception:
            pass

        serializer = self.get_serializer(orden)
        return Response(serializer.data)


class EnvioProductoViewSet(viewsets.ModelViewSet):
    queryset = EnvioProducto.objects.all()
    serializer_class = EnvioProductoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        orden_id = self.kwargs.get('orden_pk') or self.request.query_params.get('orden_envio')
        if orden_id:
            qs = qs.filter(orden_envio_id=orden_id)
        return qs

    def destroy(self, request, *args, **kwargs):
        ep = self.get_object()
        if ep.orden_envio.estado != OrdenEnvio.PENDIENTE:
            return Response(
                {'error': 'Solo se pueden eliminar productos de órdenes en estado pendiente.'},
                status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)