"""
======================================================================
  PRUEBAS DE MODELOS — Módulo Usuarios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    Rol  - creacion, choices, __str__, unique
    User - creacion, propiedades es_admin/es_empleado/es_cliente,
           UUID, email unico, fecha_creacion, __str__
======================================================================
"""

import uuid
from django.test import TestCase
from django.core.exceptions import ValidationError

from usuarios.models import User, Rol


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='testuser', email='test@test.com', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user = User.objects.create_user(
        username=username,
        email=email,
        password='testpass123',
        rol=rol,
    )
    return user


# -- Tests: Rol -------------------------------------------------------

class RolModelTest(TestCase):
    """Pruebas unitarias para el modelo Rol."""

    def test_crear_rol_admin(self):
        """El rol admin se crea correctamente."""
        rol = crear_rol('admin')
        self.assertEqual(rol.nombre, 'admin')

    def test_crear_rol_empleado(self):
        """El rol empleado se crea correctamente."""
        rol = crear_rol('empleado')
        self.assertEqual(rol.nombre, 'empleado')

    def test_crear_rol_cliente(self):
        """El rol cliente se crea correctamente."""
        rol = crear_rol('cliente')
        self.assertEqual(rol.nombre, 'cliente')

    def test_str_retorna_nombre(self):
        """El __str__ retorna el nombre del rol."""
        rol = crear_rol('admin')
        self.assertEqual(str(rol), 'admin')

    def test_choices_son_tres(self):
        """Existen exactamente 3 roles en el sistema."""
        self.assertEqual(len(Rol.CHOICES), 3)

    def test_nombre_es_unico(self):
        """No se pueden crear dos roles con el mismo nombre."""
        crear_rol('admin')
        with self.assertRaises(Exception):
            Rol.objects.create(nombre='admin')

    def test_constantes_de_rol(self):
        """Las constantes de rol tienen los valores correctos."""
        self.assertEqual(Rol.ADMIN, 'admin')
        self.assertEqual(Rol.EMPLEADO, 'empleado')
        self.assertEqual(Rol.CLIENTE, 'cliente')


# -- Tests: User ------------------------------------------------------

class UserModelTest(TestCase):
    """Pruebas unitarias para el modelo User."""

    def setUp(self):
        self.rol_admin = crear_rol('admin')
        self.rol_empleado = crear_rol('empleado')
        self.rol_cliente = crear_rol('cliente')

    def test_crear_usuario_exitoso(self):
        """Un usuario se crea correctamente con datos validos."""
        user = crear_usuario()
        self.assertIsInstance(user.id, uuid.UUID)
        self.assertEqual(user.email, 'test@test.com')

    def test_id_es_uuid(self):
        """El id del usuario es un UUID valido."""
        user = crear_usuario()
        self.assertIsInstance(user.id, uuid.UUID)

    def test_str_retorna_email(self):
        """El __str__ retorna el email del usuario."""
        user = crear_usuario()
        self.assertEqual(str(user), 'test@test.com')

    def test_email_es_unico(self):
        """No se pueden crear dos usuarios con el mismo email."""
        crear_usuario(username='user1', email='mismo@test.com')
        with self.assertRaises(Exception):
            crear_usuario(username='user2', email='mismo@test.com')

    def test_username_field_es_email(self):
        """El campo de autenticacion principal es el email."""
        self.assertEqual(User.USERNAME_FIELD, 'email')

    def test_fecha_creacion_automatica(self):
        """La fecha de creacion se asigna automaticamente."""
        user = crear_usuario()
        self.assertIsNotNone(user.fecha_creacion)

    def test_is_active_por_defecto(self):
        """El usuario esta activo por defecto."""
        user = crear_usuario()
        self.assertTrue(user.is_active)

    def test_puede_desactivarse(self):
        """Un usuario puede desactivarse."""
        user = crear_usuario()
        user.is_active = False
        user.save()
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_es_admin_true(self):
        """La propiedad es_admin retorna True para usuarios con rol admin."""
        user = crear_usuario(rol_nombre='admin')
        self.assertTrue(user.es_admin)

    def test_es_admin_false_para_empleado(self):
        """La propiedad es_admin retorna False para empleados."""
        user = crear_usuario(username='emp', email='emp@test.com', rol_nombre='empleado')
        self.assertFalse(user.es_admin)

    def test_es_empleado_true(self):
        """La propiedad es_empleado retorna True para usuarios con rol empleado."""
        user = crear_usuario(username='emp2', email='emp2@test.com', rol_nombre='empleado')
        self.assertTrue(user.es_empleado)

    def test_es_empleado_false_para_admin(self):
        """La propiedad es_empleado retorna False para admins."""
        user = crear_usuario(rol_nombre='admin')
        self.assertFalse(user.es_empleado)

    def test_es_cliente_true(self):
        """La propiedad es_cliente retorna True para usuarios con rol cliente."""
        user = crear_usuario(username='cli', email='cli@test.com', rol_nombre='cliente')
        self.assertTrue(user.es_cliente)

    def test_es_cliente_false_para_admin(self):
        """La propiedad es_cliente retorna False para admins."""
        user = crear_usuario(rol_nombre='admin')
        self.assertFalse(user.es_cliente)

    def test_rol_puede_ser_nulo(self):
        """El rol puede ser nulo."""
        user = User.objects.create_user(
            username='sinrol',
            email='sinrol@test.com',
            password='testpass123',
            rol=None,
        )
        self.assertIsNone(user.rol)
        self.assertFalse(user.es_admin)
        self.assertFalse(user.es_empleado)
        self.assertFalse(user.es_cliente)

    def test_cliente_vinculado_puede_ser_nulo(self):
        """El campo cliente puede ser nulo."""
        user = crear_usuario()
        self.assertIsNone(user.cliente)

    def test_password_se_hashea(self):
        """La contrasena se almacena hasheada, no en texto plano."""
        user = crear_usuario()
        self.assertNotEqual(user.password, 'testpass123')
        self.assertTrue(user.check_password('testpass123'))