from rest_framework import serializers
from .models import Producto, Inventario, MovimientoInventario


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'
        read_only_fields = ['id', 'fecha_creacion']


class InventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    cliente_nombre = serializers.CharField(source='producto.cliente.nombre', read_only=True)
    ubicacion_codigo = serializers.CharField(source='ubicacion.codigo', read_only=True)

    class Meta:
        model = Inventario
        fields = '__all__'
        read_only_fields = ['id', 'fecha_actualizacion', 'fecha_creacion']


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    # Info del envío cuando es una salida automática
    destino = serializers.SerializerMethodField()
    transportador_nombre = serializers.SerializerMethodField()
    numero_orden = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoInventario
        fields = '__all__'
        read_only_fields = ['id', 'fecha_creacion']

    def get_destino(self, obj):
        if obj.envio_producto:
            return obj.envio_producto.orden_envio.destino
        return None

    def get_transportador_nombre(self, obj):
        if obj.envio_producto and obj.envio_producto.orden_envio.transportador:
            return obj.envio_producto.orden_envio.transportador.nombre
        return None

    def get_numero_orden(self, obj):
        if obj.envio_producto:
            return str(obj.envio_producto.orden_envio.id)[:8].upper()
        return None