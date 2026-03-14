from rest_framework import serializers
from .models import CatalogoServicio, ServicioPrestado


class CatalogoServicioSerializer(serializers.ModelSerializer):
    unidad_display = serializers.CharField(source='get_unidad_display', read_only=True)

    class Meta:
        model = CatalogoServicio
        fields = ['id', 'nombre', 'descripcion', 'tarifa', 'unidad', 'unidad_display', 'activo']


class ServicioPrestadoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    catalogo_nombre = serializers.CharField(source='catalogo_servicio.nombre', read_only=True)
    unidad = serializers.CharField(source='catalogo_servicio.unidad', read_only=True)

    class Meta:
        model = ServicioPrestado
        fields = [
            'id', 'cliente', 'cliente_nombre',
            'catalogo_servicio', 'catalogo_nombre', 'unidad',
            'orden_envio',
            'cantidad', 'valor_unitario', 'valor_total',
            'fecha', 'facturado', 'observacion'
        ]
        read_only_fields = ['valor_total']