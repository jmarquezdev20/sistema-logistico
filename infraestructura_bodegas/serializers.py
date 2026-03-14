from rest_framework import serializers
from .models import Bodega, Ubicacion


class UbicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ubicacion
        fields = '__all__'
        read_only_fields = ['id']


class BodegaSerializer(serializers.ModelSerializer):
    ubicaciones = UbicacionSerializer(many=True, read_only=True)

    class Meta:
        model = Bodega
        fields = '__all__'
        read_only_fields = ['id', 'fecha_creacion']
