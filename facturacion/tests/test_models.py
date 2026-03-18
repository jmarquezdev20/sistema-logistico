"""
======================================================================
  PRUEBAS DE MODELOS — Módulo Facturacion
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    Factura        - creacion, numero_factura, estados, __str__
    DetalleFactura - creacion, relaciones, __str__
======================================================================
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from clientes.models import Cliente
from facturacion.models import Factura, DetalleFactura
from servicios.models import CatalogoServicio, ServicioPrestado
from envios.models import OrdenEnvio
from transportadores.models import Transportador
from infraestructura_bodegas.models import Bodega, Ubicacion


# -- Helpers ----------------------------------------------------------

def crear_cliente(nombre='Cliente Factura'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Calle 1',
        activo=True,
    )


def crear_catalogo():
    return CatalogoServicio.objects.create(
        nombre='Almacenamiento',
        tarifa=Decimal('50000'),
        unidad='por_dia',
        activo=True,
    )


def crear_servicio_prestado(cliente=None, catalogo=None):
    if cliente is None:
        cliente = crear_cliente()
    if catalogo is None:
        catalogo = crear_catalogo()
    return ServicioPrestado.objects.create(
        cliente=cliente,
        catalogo_servicio=catalogo,
        cantidad=Decimal('1'),
        valor_unitario=Decimal('50000'),
        valor_total=Decimal('50000'),
        fecha=timezone.now().date(),
        facturado=False,
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


# -- Tests: Factura ---------------------------------------------------

class FacturaModelTest(TestCase):
    """Pruebas unitarias para el modelo Factura."""

    def setUp(self):
        self.cliente = crear_cliente()

    def test_crear_factura_exitosa(self):
        """Una factura se crea correctamente con datos validos."""
        factura = crear_factura(self.cliente)
        self.assertIsInstance(factura.id, uuid.UUID)
        self.assertEqual(factura.cliente, self.cliente)
        self.assertEqual(factura.estado, 'pendiente')

    def test_numero_factura_se_genera_automaticamente(self):
        """El numero de factura se genera automaticamente al crear."""
        factura = crear_factura(self.cliente)
        self.assertTrue(factura.numero_factura.startswith('FAC-'))

    def test_numero_factura_formato_correcto(self):
        """El numero de factura tiene el formato FAC-XXXX."""
        factura = crear_factura(self.cliente)
        partes = factura.numero_factura.split('-')
        self.assertEqual(partes[0], 'FAC')
        self.assertTrue(partes[1].isdigit())
        self.assertEqual(len(partes[1]), 4)

    def test_numeros_factura_son_consecutivos(self):
        """Las facturas se numeran de forma consecutiva."""
        f1 = crear_factura(self.cliente)
        f2 = crear_factura(self.cliente)
        n1 = int(f1.numero_factura.split('-')[1])
        n2 = int(f2.numero_factura.split('-')[1])
        self.assertEqual(n2, n1 + 1)

    def test_numero_factura_es_unico(self):
        """No pueden existir dos facturas con el mismo numero."""
        f1 = crear_factura(self.cliente)
        f2 = crear_factura(self.cliente)
        self.assertNotEqual(f1.numero_factura, f2.numero_factura)

    def test_estado_por_defecto_es_pendiente(self):
        """El estado inicial de una factura es pendiente."""
        factura = Factura.objects.create(
            cliente=self.cliente,
            fecha_vencimiento=timezone.now().date(),
            subtotal=Decimal('0'),
            impuestos=Decimal('0'),
            total=Decimal('0'),
        )
        self.assertEqual(factura.estado, Factura.PENDIENTE)

    def test_estado_puede_ser_pagada(self):
        """El estado de la factura puede cambiarse a pagada."""
        factura = crear_factura(self.cliente, estado='pagada')
        self.assertEqual(factura.estado, Factura.PAGADA)

    def test_estado_puede_ser_vencida(self):
        """El estado de la factura puede cambiarse a vencida."""
        factura = crear_factura(self.cliente, estado='vencida')
        self.assertEqual(factura.estado, Factura.VENCIDA)

    def test_choices_estado_son_tres(self):
        """Existen exactamente 3 estados posibles para una factura."""
        self.assertEqual(len(Factura.ESTADO_CHOICES), 3)

    def test_str_incluye_numero_y_cliente(self):
        """El __str__ incluye el numero de factura y el nombre del cliente."""
        factura = crear_factura(self.cliente)
        resultado = str(factura)
        self.assertIn(factura.numero_factura, resultado)
        self.assertIn(self.cliente.nombre, resultado)

    def test_id_es_uuid(self):
        """El id de la factura es un UUID valido."""
        factura = crear_factura(self.cliente)
        self.assertIsInstance(factura.id, uuid.UUID)

    def test_ordering_por_fecha_emision_descendente(self):
        """Las facturas se ordenan de la mas reciente a la mas antigua."""
        f1 = crear_factura(self.cliente)
        f2 = crear_factura(self.cliente)
    # Verificamos que el ordering esta definido como -fecha_emision
        self.assertEqual(Factura._meta.ordering, ['-fecha_emision'])

    def test_calculos_monetarios_correctos(self):
        """Los campos subtotal, impuestos y total se almacenan correctamente."""
        factura = crear_factura(self.cliente)
        self.assertEqual(factura.subtotal, Decimal('100000'))
        self.assertEqual(factura.impuestos, Decimal('19000'))
        self.assertEqual(factura.total, Decimal('119000'))


# -- Tests: DetalleFactura --------------------------------------------

class DetalleFacturaModelTest(TestCase):
    """Pruebas unitarias para el modelo DetalleFactura."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.factura = crear_factura(self.cliente)
        self.servicio = crear_servicio_prestado(self.cliente)

    def test_crear_detalle_exitoso(self):
        """Un detalle de factura se crea correctamente."""
        detalle = DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=self.servicio,
            descripcion='Servicio de almacenamiento',
            cantidad=Decimal('2'),
            valor_unitario=Decimal('50000'),
            subtotal=Decimal('100000'),
        )
        self.assertIsInstance(detalle.id, uuid.UUID)
        self.assertEqual(detalle.factura, self.factura)

    def test_str_incluye_descripcion_y_subtotal(self):
        """El __str__ incluye la descripcion y el subtotal."""
        detalle = DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=self.servicio,
            descripcion='Almacenamiento',
            cantidad=Decimal('1'),
            valor_unitario=Decimal('50000'),
            subtotal=Decimal('50000'),
        )
        resultado = str(detalle)
        self.assertIn('Almacenamiento', resultado)
        self.assertIn('50000', resultado)

    def test_relacion_con_factura(self):
        """El detalle esta correctamente relacionado con su factura."""
        detalle = DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=self.servicio,
            descripcion='Test',
            cantidad=Decimal('1'),
            valor_unitario=Decimal('10000'),
            subtotal=Decimal('10000'),
        )
        self.assertEqual(detalle.factura.id, self.factura.id)

    def test_factura_tiene_detalles(self):
        """Se pueden acceder a los detalles desde la factura via related_name."""
        DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=self.servicio,
            descripcion='Detalle 1',
            cantidad=Decimal('1'),
            valor_unitario=Decimal('20000'),
            subtotal=Decimal('20000'),
        )
        self.assertEqual(self.factura.detalles.count(), 1)

    def test_multiples_detalles_por_factura(self):
        """Una factura puede tener multiples detalles."""
        servicio2 = crear_servicio_prestado(self.cliente, crear_catalogo())
        DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=self.servicio,
            descripcion='Detalle A',
            cantidad=Decimal('1'),
            valor_unitario=Decimal('10000'),
            subtotal=Decimal('10000'),
        )
        DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=servicio2,
            descripcion='Detalle B',
            cantidad=Decimal('2'),
            valor_unitario=Decimal('5000'),
            subtotal=Decimal('10000'),
        )
        self.assertEqual(self.factura.detalles.count(), 2)

    def test_eliminar_factura_elimina_detalles(self):
        """Al eliminar una factura, sus detalles se eliminan en cascada."""
        DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=self.servicio,
            descripcion='Detalle Cascada',
            cantidad=Decimal('1'),
            valor_unitario=Decimal('10000'),
            subtotal=Decimal('10000'),
        )
        factura_id = self.factura.id
        self.factura.delete()
        self.assertEqual(DetalleFactura.objects.filter(factura_id=factura_id).count(), 0)