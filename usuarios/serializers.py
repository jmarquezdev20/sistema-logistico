from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Rol


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id', 'nombre']


class UserSerializer(serializers.ModelSerializer):
    rol = RolSerializer(read_only=True)
    rol_id = serializers.PrimaryKeyRelatedField(
        queryset=Rol.objects.all(), source='rol', write_only=True, required=False
    )
    cliente_id = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password',
            'rol', 'rol_id', 'cliente_id',
            'is_active', 'fecha_creacion',
        ]
        read_only_fields = ['id', 'fecha_creacion']

    def get_cliente_id(self, obj):
        return str(obj.cliente.id) if obj.cliente else None

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['rol'] = user.rol.nombre if user.rol else None
        token['cliente_id'] = str(user.cliente.id) if user.cliente else None
        return token


# Serializers de INPUT/OUTPUT para Swagger

class LoginInputSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField()


class LoginResponseSerializer(serializers.Serializer):
    access  = serializers.CharField(help_text="JWT access token")
    refresh = serializers.CharField(help_text="JWT refresh token")


class CrearUsuarioInputSerializer(serializers.Serializer):
    email      = serializers.EmailField(help_text="Correo electrónico del nuevo usuario")
    nombre     = serializers.CharField(required=False, default='', help_text="Nombre del usuario")
    rol        = serializers.ChoiceField(
        choices=['admin', 'empleado', 'cliente'],
        help_text="Rol asignado al usuario"
    )
    cliente_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="ID del cliente (solo si el rol es 'cliente')"
    )


class CrearUsuarioResponseSerializer(serializers.Serializer):
    id                = serializers.CharField()
    email             = serializers.EmailField()
    rol               = serializers.CharField()
    password_temporal = serializers.CharField()
    correo_enviado    = serializers.BooleanField()
    mensaje           = serializers.CharField()


class CambiarPasswordInputSerializer(serializers.Serializer):
    password_actual    = serializers.CharField(help_text="Contraseña actual del usuario")
    password_nueva     = serializers.CharField(min_length=8, help_text="Nueva contraseña (mínimo 8 caracteres)")
    password_confirmar = serializers.CharField(help_text="Confirmación de la nueva contraseña")

    def validate(self, data):
        if data['password_nueva'] != data['password_confirmar']:
            raise serializers.ValidationError("Las contraseñas nuevas no coinciden.")
        return data


class MensajeResponseSerializer(serializers.Serializer):
    mensaje = serializers.CharField()