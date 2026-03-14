from rest_framework import serializers
from .models import Transportador


class TransportadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transportador
        fields = '__all__'
        read_only_fields = ['id', 'fecha_creacion']
