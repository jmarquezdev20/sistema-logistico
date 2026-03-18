# Create your views here.
from rest_framework import viewsets, filters
from rest_framework.response import Response
from .models import RegistroAuditoria
from .serializers import RegistroAuditoriaSerializer
from usuarios.permissions import EsAdmin


class AuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RegistroAuditoria.objects.select_related('usuario').all()
    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [EsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['usuario__email', 'usuario__first_name', 'accion', 'modulo']

    def get_queryset(self):
        qs = super().get_queryset()
        modulo   = self.request.query_params.get('modulo')
        usuario  = self.request.query_params.get('usuario')
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if modulo:
            qs = qs.filter(modulo=modulo)
        if usuario:
            qs = qs.filter(usuario_id=usuario)
        if fecha_desde:
            qs = qs.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__date__lte=fecha_hasta)
        return qs