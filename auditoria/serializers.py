from rest_framework import serializers
from .models import RegistroAuditoria

class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    usuario_email  = serializers.SerializerMethodField()
    modulo_label   = serializers.SerializerMethodField()

    class Meta:
        model  = RegistroAuditoria
        fields = ['id', 'usuario', 'usuario_nombre', 'usuario_email', 'modulo', 'modulo_label', 'accion', 'detalle', 'fecha']

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return obj.usuario.first_name or obj.usuario.email
        return 'Sistema'

    def get_usuario_email(self, obj):
        return obj.usuario.email if obj.usuario else '—'

    def get_modulo_label(self, obj):
        return dict(RegistroAuditoria.MODULOS).get(obj.modulo, obj.modulo)