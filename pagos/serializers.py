from rest_framework import serializers
from .models import Pago


class PagoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    factura_numero = serializers.CharField(source='factura.numero_factura', read_only=True)

    class Meta:
        model = Pago
        fields = '__all__'
        read_only_fields = ['id']
