from rest_framework import viewsets
from rest_framework.response import Response
from .models import Bodega, Ubicacion
from .serializers import BodegaSerializer, UbicacionSerializer


class BodegaViewSet(viewsets.ModelViewSet):
    queryset = Bodega.objects.all()
    serializer_class = BodegaSerializer


class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        bodega_id = self.request.query_params.get('bodega')
        if bodega_id:
            qs = qs.filter(bodega_id=bodega_id)
        return qs

    def list(self, request, *args, **kwargs):
        from inventario.models import Inventario
        from django.db.models import Sum

        qs = self.get_queryset()

        # Calcula stock real ocupado por ubicación de una sola vez (evita N+1 queries)
        stock_por_ubicacion = (
            Inventario.objects
            .values('ubicacion_id')
            .annotate(total=Sum('cantidad'))
        )
        stock_map = {str(r['ubicacion_id']): r['total'] for r in stock_por_ubicacion}

        result = []
        for u in qs:
            uid = str(u.id)
            ocupado = stock_map.get(uid, 0)
            disponible = max(u.capacidad - ocupado, 0)
            porcentaje = round((ocupado / u.capacidad * 100), 1) if u.capacidad > 0 else 0
            result.append({
                'id': uid,
                'bodega': str(u.bodega_id),
                'bodega_nombre': u.bodega.nombre,
                'codigo': u.codigo,
                'capacidad': u.capacidad,
                'ocupado': ocupado,
                'disponible': disponible,
                'porcentaje_ocupacion': porcentaje,
                'llena': disponible == 0,
            })

        return Response(result)