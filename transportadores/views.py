from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Transportador
from .serializers import TransportadorSerializer
from auditoria.utils import registrar


class TransportadorViewSet(viewsets.ModelViewSet):
    queryset = Transportador.objects.all()
    serializer_class = TransportadorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'placa_vehiculo']

    def perform_create(self, serializer):
        instance = serializer.save()
        registrar(
            usuario=self.request.user,
            modulo='transportadores',
            accion='Crear transportador',
            detalle=f'Se creó el transportador: {instance.nombre}',
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        registrar(
            usuario=self.request.user,
            modulo='transportadores',
            accion='Actualizar transportador',
            detalle=f'Se actualizó el transportador: {instance.nombre}',
        )

    def perform_destroy(self, instance):
        nombre = instance.nombre
        instance.delete()
        registrar(
            usuario=self.request.user,
            modulo='transportadores',
            accion='Eliminar transportador',
            detalle=f'Se eliminó el transportador: {nombre}',
        )