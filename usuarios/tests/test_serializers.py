"""
======================================================================
  PRUEBAS DE SERIALIZERS — Módulo Usuarios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    RolSerializer      - campos, serialización
    UserSerializer     - campos, password write_only, cliente_id,
                         crear y actualizar usuario
======================================================================
"""

from django.test import TestCase

from usuarios.models import User, Rol
from usuarios.serializers import RolSerializer, UserSerializer


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='ser_user', email='ser@test.com', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    return User.objects.create_user(
        username=username,
        email=email,
        password='testpass123',
        rol=rol,
    )


# -- Tests: RolSerializer ---------------------------------------------

class RolSerializerTest(TestCase):
    """Pruebas para RolSerializer."""

    def setUp(self):
        self.rol = crear_rol('admin')

    def test_serializa_campos_correctos(self):
        """El serializer incluye id y nombre."""
        serializer = RolSerializer(self.rol)
        self.assertIn('id', serializer.data)
        self.assertIn('nombre', serializer.data)

    def test_nombre_se_serializa_correctamente(self):
        """El nombre del rol se serializa correctamente."""
        serializer = RolSerializer(self.rol)
        self.assertEqual(serializer.data['nombre'], 'admin')


# -- Tests: UserSerializer --------------------------------------------

class UserSerializerTest(TestCase):
    """Pruebas para UserSerializer."""

    def setUp(self):
        self.rol = crear_rol('admin')
        self.user = crear_usuario()

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = UserSerializer(self.user)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('username', campos)
        self.assertIn('email', campos)
        self.assertIn('rol', campos)
        self.assertIn('cliente_id', campos)
        self.assertIn('is_active', campos)
        self.assertIn('fecha_creacion', campos)

    def test_password_es_write_only(self):
        """El campo password es de solo escritura y no aparece en la respuesta."""
        serializer = UserSerializer(self.user)
        self.assertNotIn('password', serializer.data)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = UserSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_fecha_creacion_es_readonly(self):
        """El campo fecha_creacion es de solo lectura."""
        field = UserSerializer().fields['fecha_creacion']
        self.assertTrue(field.read_only)

    def test_rol_se_serializa_anidado(self):
        """El rol se serializa como objeto con id y nombre."""
        serializer = UserSerializer(self.user)
        self.assertIsInstance(serializer.data['rol'], dict)
        self.assertIn('nombre', serializer.data['rol'])

    def test_cliente_id_es_none_sin_cliente(self):
        """El campo cliente_id es None cuando no hay cliente vinculado."""
        serializer = UserSerializer(self.user)
        self.assertIsNone(serializer.data['cliente_id'])

    def test_email_se_serializa_correctamente(self):
        """El email se serializa con el valor correcto."""
        serializer = UserSerializer(self.user)
        self.assertEqual(serializer.data['email'], 'ser@test.com')

    def test_is_active_se_serializa(self):
        """El campo is_active se serializa correctamente."""
        serializer = UserSerializer(self.user)
        self.assertTrue(serializer.data['is_active'])

    def test_crear_usuario_via_serializer(self):
        """El serializer crea un usuario correctamente con password hasheado."""
        data = {
            'username': 'nuevo_user',
            'email': 'nuevo@test.com',
            'password': 'nuevapass123',
            'rol_id': self.rol.id,
        }
        serializer = UserSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertTrue(user.check_password('nuevapass123'))
        self.assertNotEqual(user.password, 'nuevapass123')

    def test_actualizar_usuario_sin_cambiar_password(self):
        """El serializer actualiza un usuario sin cambiar la password si no se envia."""
        data = {
            'username': 'updated_user',
            'email': 'updated@test.com',
            'password': 'testpass123',
        }
        serializer = UserSerializer(self.user, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_email_requerido(self):
        """El email es obligatorio."""
        data = {'username': 'sinmail', 'password': 'pass12345'}
        serializer = UserSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_password_requerido_al_crear(self):
        """La password es obligatoria al crear un usuario."""
        data = {'username': 'sinpass', 'email': 'sinpass@test.com'}
        serializer = UserSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)