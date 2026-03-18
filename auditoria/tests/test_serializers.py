"""
======================================================================
  PRUEBAS DE SERIALIZERS — Módulo Auditoria
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    RegistroAuditoriaSerializer - campos calculados, usuario_nombre,
                                  usuario_email, modulo_label
======================================================================
"""

from django.test import TestCase

from auditoria.models import RegistroAuditoria
from auditoria.serializers import RegistroAuditoriaSerializer
from usuarios.models import User, Rol


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='ser_audit_user', email='auditser@test.com', first_name=''):
    rol = crear_rol()
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'rol': rol,
            'first_name': first_name,
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
    return user


def crear_registro(usuario=None, modulo='inventario', accion='Test accion'):
    return RegistroAuditoria.objects.create(
        usuario=usuario,
        modulo=modulo,
        accion=accion,
        detalle='',
    )


# -- Tests: RegistroAuditoriaSerializer -------------------------------

class RegistroAuditoriaSerializerTest(TestCase):
    """Pruebas para RegistroAuditoriaSerializer."""

    def setUp(self):
        self.user = crear_usuario(
            username='ser_audit',
            email='seraudit@test.com',
            first_name='Juan'
        )
        self.registro = crear_registro(self.user)

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = RegistroAuditoriaSerializer(self.registro)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('usuario', campos)
        self.assertIn('usuario_nombre', campos)
        self.assertIn('usuario_email', campos)
        self.assertIn('modulo', campos)
        self.assertIn('modulo_label', campos)
        self.assertIn('accion', campos)
        self.assertIn('detalle', campos)
        self.assertIn('fecha', campos)

    def test_usuario_nombre_con_first_name(self):
        """usuario_nombre retorna el first_name si existe."""
        serializer = RegistroAuditoriaSerializer(self.registro)
        self.assertEqual(serializer.data['usuario_nombre'], 'Juan')

    def test_usuario_nombre_sin_first_name_usa_email(self):
        """usuario_nombre retorna el email si no hay first_name."""
        user_sin_nombre = crear_usuario(
            username='sin_nombre_audit',
            email='sinnombre@test.com',
            first_name=''
        )
        registro = crear_registro(user_sin_nombre)
        serializer = RegistroAuditoriaSerializer(registro)
        self.assertEqual(serializer.data['usuario_nombre'], 'sinnombre@test.com')

    def test_usuario_nombre_sin_usuario_es_sistema(self):
        """usuario_nombre retorna 'Sistema' cuando no hay usuario."""
        registro = crear_registro(usuario=None)
        serializer = RegistroAuditoriaSerializer(registro)
        self.assertEqual(serializer.data['usuario_nombre'], 'Sistema')

    def test_usuario_email_correcto(self):
        """usuario_email retorna el email del usuario."""
        serializer = RegistroAuditoriaSerializer(self.registro)
        self.assertEqual(serializer.data['usuario_email'], 'seraudit@test.com')

    def test_usuario_email_sin_usuario_es_guion(self):
        """usuario_email retorna guion cuando no hay usuario."""
        registro = crear_registro(usuario=None)
        serializer = RegistroAuditoriaSerializer(registro)
        self.assertEqual(serializer.data['usuario_email'], '—')

    def test_modulo_label_inventario(self):
        """modulo_label retorna el label correcto para inventario."""
        registro = crear_registro(self.user, modulo='inventario')
        serializer = RegistroAuditoriaSerializer(registro)
        self.assertEqual(serializer.data['modulo_label'], 'Inventario')

    def test_modulo_label_envios(self):
        """modulo_label retorna el label correcto para envios."""
        registro = crear_registro(self.user, modulo='envios')
        serializer = RegistroAuditoriaSerializer(registro)
        self.assertIn('nvíos', serializer.data['modulo_label'])

    def test_modulo_label_facturacion(self):
        """modulo_label retorna el label correcto para facturacion."""
        registro = crear_registro(self.user, modulo='facturacion')
        serializer = RegistroAuditoriaSerializer(registro)
        self.assertIn('acturación', serializer.data['modulo_label'])

    def test_accion_se_serializa_correctamente(self):
        """La accion se serializa con el valor correcto."""
        serializer = RegistroAuditoriaSerializer(self.registro)
        self.assertEqual(serializer.data['accion'], 'Test accion')

    def test_fecha_se_serializa(self):
        """La fecha se incluye en la serializacion."""
        serializer = RegistroAuditoriaSerializer(self.registro)
        self.assertIsNotNone(serializer.data['fecha'])