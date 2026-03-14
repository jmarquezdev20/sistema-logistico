from rest_framework import viewsets, filters
from .models import Transportador
from .serializers import TransportadorSerializer


class TransportadorViewSet(viewsets.ModelViewSet):
    queryset = Transportador.objects.all()
    serializer_class = TransportadorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'placa_vehiculo']
