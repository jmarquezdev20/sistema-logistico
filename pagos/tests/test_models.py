"""
======================================================================
  PRUEBAS DE MODELOS — Módulo Pagos
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    Pago - creacion, metodos de pago, __str__, ordering,
           comportamiento al guardar (marca factura como pagada)
======================================================================
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from clientes.models import Cliente
from facturacion.models import Factura
from pagos.models import Pago
from usuarios.models import User, Rol


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='pagouser'):
    rol = crear_rol()
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password('testpass123')
        user.save()
    return user


def crear_cliente(nombre='Cliente Pago'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Calle 1',
        activo=True,
    )


def crear_factura(cliente=None, estado='pendiente'):
    if cliente is None:
        cliente = crear_cliente()
    return Factura.objects.create(
        cliente=cliente,
        fecha_vencimiento=timezone.now().date(),
        subtotal=Decimal('100000'),
        impuestos=Decimal('19000'),
        total=Decimal('119000'),
        estado=estado,
    )


def crear_pago(cliente=None, factura=None, monto=Decimal('119000'), metodo='transferencia'):
    if cliente is None:
        cliente = crear_cliente()
    user = crear_usuario()
    return Pago.objects.create(
        cliente=cliente,
        factura=factura,
        monto=monto,
        metodo_pago=metodo,
        referencia='REF-001',
        fecha_pago=timezone.now().date(),
        registrado_por=user,
        observacion='',
    )


# -- Tests: Pago ------------------------------------------------------

class PagoModelTest(TestCase):
    """Pruebas unitarias para el modelo Pago."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.user = crear_usuario()
        self.factura = crear_factura(self.cliente)

    def test_crear_pago_exitoso(self):
        """Un pago se crea correctamente con datos validos."""
        pago = crear_pago(self.cliente, self.factura)
        self.assertIsInstance(pago.id, uuid.UUID)
        self.assertEqual(pago.cliente, self.cliente)
        self.assertEqual(pago.factura, self.factura)

    def test_id_es_uuid(self):
        """El id del pago es un UUID valido."""
        pago = crear_pago(self.cliente, self.factura)
        self.assertIsInstance(pago.id, uuid.UUID)

    def test_str_incluye_cliente_y_monto(self):
        """El __str__ incluye el nombre del cliente y el monto."""
        pago = crear_pago(self.cliente, self.factura, monto=Decimal('119000'))
        resultado = str(pago)
        self.assertIn(self.cliente.nombre, resultado)
        self.assertIn('119000', resultado)

    def test_metodo_pago_efectivo(self):
        """El metodo de pago puede ser efectivo."""
        pago = crear_pago(self.cliente, self.factura, metodo='efectivo')
        self.assertEqual(pago.metodo_pago, Pago.EFECTIVO)

    def test_metodo_pago_transferencia(self):
        """El metodo de pago puede ser transferencia."""
        pago = crear_pago(self.cliente, self.factura, metodo='transferencia')
        self.assertEqual(pago.metodo_pago, Pago.TRANSFERENCIA)

    def test_metodo_pago_cheque(self):
        """El metodo de pago puede ser cheque."""
        pago = crear_pago(self.cliente, self.factura, metodo='cheque')
        self.assertEqual(pago.metodo_pago, Pago.CHEQUE)

    def test_metodo_pago_tarjeta(self):
        """El metodo de pago puede ser tarjeta."""
        pago = crear_pago(self.cliente, self.factura, metodo='tarjeta')
        self.assertEqual(pago.metodo_pago, Pago.TARJETA)

    def test_choices_metodo_son_cuatro(self):
        """Existen exactamente 4 metodos de pago."""
        self.assertEqual(len(Pago.METODO_CHOICES), 4)

    def test_guardar_pago_marca_factura_como_pagada(self):
        """Al guardar un pago, la factura asociada se marca como pagada."""
        self.assertEqual(self.factura.estado, 'pendiente')
        crear_pago(self.cliente, self.factura)
        self.factura.refresh_from_db()
        self.assertEqual(self.factura.estado, Factura.PAGADA)

    def test_pago_sin_factura_es_valido(self):
        """Un pago puede crearse sin factura asociada."""
        pago = crear_pago(self.cliente, factura=None)
        self.assertIsNone(pago.factura)

    def test_pago_sin_factura_no_falla(self):
        """Al guardar un pago sin factura no ocurre ningún error."""
        try:
            crear_pago(self.cliente, factura=None)
        except Exception as e:
            self.fail(f'crear_pago sin factura lanzó una excepción: {e}')

    def test_referencia_puede_ser_vacia(self):
        """La referencia es un campo opcional."""
        pago = Pago.objects.create(
            cliente=self.cliente,
            factura=self.factura,
            monto=Decimal('50000'),
            metodo_pago='efectivo',
            referencia='',
            fecha_pago=timezone.now().date(),
            registrado_por=self.user,
        )
        self.assertEqual(pago.referencia, '')

    def test_observacion_puede_ser_vacia(self):
        """La observacion es un campo opcional."""
        pago = Pago.objects.create(
            cliente=self.cliente,
            factura=self.factura,
            monto=Decimal('50000'),
            metodo_pago='efectivo',
            fecha_pago=timezone.now().date(),
            registrado_por=self.user,
            observacion='',
        )
        self.assertEqual(pago.observacion, '')

    def test_ordering_por_fecha_pago_descendente(self):
        """Los pagos se ordenan por fecha de pago de mas reciente a mas antiguo."""
        self.assertEqual(Pago._meta.ordering, ['-fecha_pago'])

    def test_monto_se_almacena_correctamente(self):
        """El monto se almacena con precision decimal correcta."""
        pago = crear_pago(self.cliente, self.factura, monto=Decimal('250000.50'))
        self.assertEqual(pago.monto, Decimal('250000.50'))

    def test_relacion_con_cliente(self):
        """El pago esta correctamente relacionado con el cliente."""
        pago = crear_pago(self.cliente, self.factura)
        self.assertEqual(pago.cliente.id, self.cliente.id)

    def test_relacion_con_factura(self):
        """El pago esta correctamente relacionado con la factura."""
        pago = crear_pago(self.cliente, self.factura)
        self.assertEqual(pago.factura.id, self.factura.id)

    def test_relacion_con_registrado_por(self):
        """El pago registra correctamente el usuario que lo registro."""
        pago = crear_pago(self.cliente, self.factura)
        self.assertIsNotNone(pago.registrado_por)