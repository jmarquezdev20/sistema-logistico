from rest_framework import viewsets, filters
from .models import Cliente
from .serializers import ClienteSerializer
from auditoria.utils import registrar


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'correo']
    ordering_fields = ['nombre', 'fecha_creacion']

    def perform_create(self, serializer):
        obj = serializer.save()
        registrar(
            usuario=self.request.user,
            modulo='clientes',
            accion=f'Creó cliente "{obj.nombre}"',
            detalle=f'Correo: {obj.correo}',
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        registrar(
            usuario=self.request.user,
            modulo='clientes',
            accion=f'Actualizó cliente "{obj.nombre}"',
        )

    def perform_destroy(self, instance):
        registrar(
            usuario=self.request.user,
            modulo='clientes',
            accion=f'Eliminó cliente "{instance.nombre}"',
        )
        instance.delete()
        
