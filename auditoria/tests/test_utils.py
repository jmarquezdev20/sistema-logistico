"""
======================================================================
  PRUEBAS DE UTILS — Módulo Auditoria
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    registrar() - funcion utilitaria que crea registros de auditoria
======================================================================
"""

from django.test import TestCase

from auditoria.models import RegistroAuditoria
from auditoria.utils import registrar
from usuarios.models import User, Rol


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='utils_audit_user'):
    rol = crear_rol()
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password('testpass123')
        user.save()
    return user


# -- Tests: registrar() -----------------------------------------------

class RegistrarUtilsTest(TestCase):
    """Pruebas para la funcion utilitaria registrar()."""

    def setUp(self):
        self.user = crear_usuario()

    def test_registrar_crea_registro(self):
        """registrar() crea un RegistroAuditoria en la base de datos."""
        registrar(
            usuario=self.user,
            modulo='inventario',
            accion='Creo un producto',
            detalle='Producto: Caja',
        )
        self.assertEqual(RegistroAuditoria.objects.count(), 1)

    def test_registrar_guarda_datos_correctamente(self):
        """registrar() guarda todos los datos correctamente."""
        registrar(
            usuario=self.user,
            modulo='envios',
            accion='Despacho orden',
            detalle='Destino: Bogota',
        )
        registro = RegistroAuditoria.objects.first()
        self.assertEqual(registro.usuario, self.user)
        self.assertEqual(registro.modulo, 'envios')
        self.assertEqual(registro.accion, 'Despacho orden')
        self.assertEqual(registro.detalle, 'Destino: Bogota')

    def test_registrar_sin_detalle(self):
        """registrar() funciona correctamente sin detalle."""
        registrar(
            usuario=self.user,
            modulo='clientes',
            accion='Consulto clientes',
        )
        registro = RegistroAuditoria.objects.first()
        self.assertEqual(registro.detalle, '')

    def test_registrar_con_usuario_none(self):
        """registrar() funciona con usuario None."""
        registrar(
            usuario=None,
            modulo='sistema',
            accion='Proceso automatico',
        )
        registro = RegistroAuditoria.objects.first()
        self.assertIsNone(registro.usuario)

    def test_registrar_multiples_veces(self):
        """registrar() puede llamarse multiples veces."""
        registrar(self.user, 'inventario', 'Accion 1')
        registrar(self.user, 'envios', 'Accion 2')
        registrar(self.user, 'pagos', 'Accion 3')
        self.assertEqual(RegistroAuditoria.objects.count(), 3)

    def test_registrar_no_lanza_excepcion_ante_error(self):
        """registrar() no lanza excepcion aunque ocurra un error interno."""
        try:
            registrar(
                usuario=self.user,
                modulo='inventario',
                accion='A' * 201,
            )
        except Exception as e:
            self.fail(f'registrar() lanzo una excepcion inesperada: {e}')

    def test_registrar_todos_los_modulos(self):
        """registrar() acepta todos los modulos del sistema."""
        modulos = ['envios', 'inventario', 'servicios', 'facturacion', 'pagos', 'clientes', 'usuarios']
        for modulo in modulos:
            registrar(self.user, modulo, f'Accion en {modulo}')
        self.assertEqual(RegistroAuditoria.objects.count(), len(modulos))