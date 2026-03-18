"""
======================================================================
  PRUEBAS DE MODELOS — Módulo Auditoria
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    RegistroAuditoria - creacion, modulos, __str__, ordering,
                        usuario nulo, fecha automatica
======================================================================
"""

import uuid
from django.test import TestCase

from auditoria.models import RegistroAuditoria
from usuarios.models import User, Rol


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='audituser'):
    rol = crear_rol()
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password('testpass123')
        user.save()
    return user


def crear_registro(usuario=None, modulo='inventario', accion='Accion test', detalle=''):
    return RegistroAuditoria.objects.create(
        usuario=usuario,
        modulo=modulo,
        accion=accion,
        detalle=detalle,
    )


# -- Tests: RegistroAuditoria -----------------------------------------

class RegistroAuditoriaModelTest(TestCase):
    """Pruebas unitarias para el modelo RegistroAuditoria."""

    def setUp(self):
        self.user = crear_usuario()

    def test_crear_registro_exitoso(self):
        """Un registro de auditoria se crea correctamente."""
        registro = crear_registro(self.user)
        self.assertIsInstance(registro.id, uuid.UUID)
        self.assertEqual(registro.usuario, self.user)
        self.assertEqual(registro.modulo, 'inventario')

    def test_id_es_uuid(self):
        """El id del registro es un UUID valido."""
        registro = crear_registro(self.user)
        self.assertIsInstance(registro.id, uuid.UUID)

    def test_str_incluye_usuario_y_accion(self):
        """El __str__ incluye el usuario y la accion."""
        registro = crear_registro(self.user, accion='Creo un producto')
        resultado = str(registro)
        self.assertIn('Creo un producto', resultado)

    def test_fecha_se_genera_automaticamente(self):
        """La fecha se asigna automaticamente al crear el registro."""
        registro = crear_registro(self.user)
        self.assertIsNotNone(registro.fecha)

    def test_ordering_por_fecha_descendente(self):
        """Los registros se ordenan del mas reciente al mas antiguo."""
        self.assertEqual(RegistroAuditoria._meta.ordering, ['-fecha'])

    def test_usuario_puede_ser_nulo(self):
        """El campo usuario puede ser nulo."""
        registro = crear_registro(usuario=None)
        self.assertIsNone(registro.usuario)

    def test_detalle_puede_ser_vacio(self):
        """El detalle es un campo opcional."""
        registro = crear_registro(self.user, detalle='')
        self.assertEqual(registro.detalle, '')

    def test_modulo_envios(self):
        """El modulo puede ser envios."""
        registro = crear_registro(self.user, modulo='envios')
        self.assertEqual(registro.modulo, 'envios')

    def test_modulo_inventario(self):
        """El modulo puede ser inventario."""
        registro = crear_registro(self.user, modulo='inventario')
        self.assertEqual(registro.modulo, 'inventario')

    def test_modulo_servicios(self):
        """El modulo puede ser servicios."""
        registro = crear_registro(self.user, modulo='servicios')
        self.assertEqual(registro.modulo, 'servicios')

    def test_modulo_facturacion(self):
        """El modulo puede ser facturacion."""
        registro = crear_registro(self.user, modulo='facturacion')
        self.assertEqual(registro.modulo, 'facturacion')

    def test_modulo_pagos(self):
        """El modulo puede ser pagos."""
        registro = crear_registro(self.user, modulo='pagos')
        self.assertEqual(registro.modulo, 'pagos')

    def test_modulo_clientes(self):
        """El modulo puede ser clientes."""
        registro = crear_registro(self.user, modulo='clientes')
        self.assertEqual(registro.modulo, 'clientes')

    def test_modulo_usuarios(self):
        """El modulo puede ser usuarios."""
        registro = crear_registro(self.user, modulo='usuarios')
        self.assertEqual(registro.modulo, 'usuarios')

    def test_choices_modulos_son_siete(self):
        """Existen exactamente 7 modulos en el sistema."""
        self.assertEqual(len(RegistroAuditoria.MODULOS), 7)

    def test_eliminar_usuario_no_elimina_registro(self):
        """Al eliminar un usuario, el registro de auditoria se conserva con usuario nulo."""
        user_temp = crear_usuario('temp_audit_user')
        registro = crear_registro(user_temp)
        user_temp.delete()
        registro.refresh_from_db()
        self.assertIsNone(registro.usuario)

    def test_multiples_registros_por_usuario(self):
        """Un usuario puede tener multiples registros de auditoria."""
        crear_registro(self.user, accion='Accion 1')
        crear_registro(self.user, accion='Accion 2')
        crear_registro(self.user, accion='Accion 3')
        self.assertEqual(
            RegistroAuditoria.objects.filter(usuario=self.user).count(), 3
        )

    def test_detalle_con_informacion(self):
        """El detalle puede contener informacion adicional."""
        registro = crear_registro(
            self.user,
            detalle='Cliente: Juan | Stock: 50'
        )
        self.assertEqual(registro.detalle, 'Cliente: Juan | Stock: 50')