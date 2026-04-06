from rest_framework import viewsets, filters
from .models import Cliente
from .serializers import ClienteSerializer
from auditoria.utils import registrar


class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'correo']
    ordering_fields = ['nombre', 'fecha_creacion']

    def get_queryset(self):
        queryset = Cliente.objects.all()
        activo = self.request.query_params.get('activo')
        if activo is not None:
            if activo.lower() == 'true':
                queryset = queryset.filter(activo=True)
            elif activo.lower() == 'false':
                queryset = queryset.filter(activo=False)
        return queryset

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