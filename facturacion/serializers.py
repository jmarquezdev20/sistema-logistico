from rest_framework import serializers
from .models import Factura, DetalleFactura


class DetalleFacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleFactura
        fields = '__all__'
        read_only_fields = ['id']


class FacturaSerializer(serializers.ModelSerializer):
    detalles = DetalleFacturaSerializer(many=True, read_only=True)
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)

    class Meta:
        model = Factura
        fields = '__all__'
        read_only_fields = ['id', 'numero_factura', 'fecha_emision', 'subtotal', 'impuestos', 'total']
