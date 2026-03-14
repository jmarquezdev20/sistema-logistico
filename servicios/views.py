from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import CatalogoServicio, ServicioPrestado
from .serializers import CatalogoServicioSerializer, ServicioPrestadoSerializer
from usuarios.permissions import EsEmpleadoOAdmin
from auditoria.utils import registrar


class CatalogoServicioViewSet(viewsets.ModelViewSet):
    queryset = CatalogoServicio.objects.all()
    serializer_class = CatalogoServicioSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [EsEmpleadoOAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        obj = serializer.save()
        registrar(usuario=self.request.user, modulo='servicios',
            accion=f'Creó servicio en catálogo "{obj.nombre}"',
            detalle=f'Tarifa: ${obj.tarifa} | Unidad: {obj.unidad}')

    def perform_destroy(self, instance):
        registrar(usuario=self.request.user, modulo='servicios',
            accion=f'Eliminó servicio del catálogo "{instance.nombre}"')
        instance.delete()


class ServicioPrestadoViewSet(viewsets.ModelViewSet):
    queryset = ServicioPrestado.objects.select_related('cliente', 'catalogo_servicio').all()
    serializer_class = ServicioPrestadoSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [EsEmpleadoOAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Cliente solo ve sus propios cargos
        if hasattr(user, 'rol') and user.rol and user.rol.nombre == 'cliente':
            if hasattr(user, 'cliente') and user.cliente:
                return qs.filter(cliente=user.cliente)
            return qs.none()
        cliente_id  = self.request.query_params.get('cliente')
        facturado   = self.request.query_params.get('facturado')
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        if facturado is not None:
            qs = qs.filter(facturado=facturado.lower() == 'true')
        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get('valor_unitario'):
            try:
                catalogo = CatalogoServicio.objects.get(id=data.get('catalogo_servicio'))
                data['valor_unitario'] = catalogo.tarifa
            except CatalogoServicio.DoesNotExist:
                return Response({'error': 'Servicio no encontrado.'}, status=400)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar(usuario=request.user, modulo='servicios',
            accion=f'Registró cargo "{obj.catalogo_servicio.nombre}"',
            detalle=f'Cliente: {obj.cliente.nombre} | Valor: ${obj.valor_unitario} | Obs: {obj.observacion}')
        return Response(serializer.data, status=status.HTTP_201_CREATED)