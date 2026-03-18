from rest_framework import serializers
from .models import OrdenEnvio, EnvioProducto

class EnvioProductoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    stock_disponible = serializers.SerializerMethodField()

    class Meta:
        model = EnvioProducto
        fields = '__all__'
        read_only_fields = ['id']

    def get_stock_disponible(self, obj):
        try:
            return obj.producto.inventario.cantidad
        except Exception:
            return 0

class OrdenEnvioSerializer(serializers.ModelSerializer):
    productos = EnvioProductoSerializer(many=True, read_only=True)
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    transportador_nombre = serializers.CharField(source='transportador.nombre', read_only=True)

    class Meta:
        model = OrdenEnvio
        fields = '__all__'
        read_only_fields = ['id', 'fecha_creacion', 'fecha_despacho']
