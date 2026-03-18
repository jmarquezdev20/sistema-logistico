"""
======================================================================
  PRUEBAS DE SERIALIZERS — Módulo Facturacion
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    FacturaSerializer       - campos, read_only, detalles anidados
    DetalleFacturaSerializer - campos, read_only
======================================================================
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from clientes.models import Cliente
from facturacion.models import Factura, DetalleFactura
from facturacion.serializers import FacturaSerializer, DetalleFacturaSerializer
from servicios.models import CatalogoServicio, ServicioPrestado


# -- Helpers ----------------------------------------------------------

def crear_cliente(nombre='Cliente Serializer Fact'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3009876543',
        direccion='Av. 45',
        activo=True,
    )


def crear_catalogo():
    return CatalogoServicio.objects.create(
        nombre='Despacho',
        tarifa=Decimal('30000'),
        unidad='por_envio',
        activo=True,
    )


def crear_servicio_prestado(cliente, catalogo=None):
    if catalogo is None:
        catalogo = crear_catalogo()
    return ServicioPrestado.objects.create(
        cliente=cliente,
        catalogo_servicio=catalogo,
        cantidad=Decimal('1'),
        valor_unitario=Decimal('30000'),
        valor_total=Decimal('30000'),
        fecha=timezone.now().date(),
        facturado=False,
    )


def crear_factura(cliente=None):
    if cliente is None:
        cliente = crear_cliente()
    return Factura.objects.create(
        cliente=cliente,
        fecha_vencimiento=timezone.now().date(),
        subtotal=Decimal('100000'),
        impuestos=Decimal('19000'),
        total=Decimal('119000'),
    )


# -- Tests: DetalleFacturaSerializer ----------------------------------

class DetalleFacturaSerializerTest(TestCase):
    """Pruebas para DetalleFacturaSerializer."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.factura = crear_factura(self.cliente)
        self.servicio = crear_servicio_prestado(self.cliente)
        self.detalle = DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=self.servicio,
            descripcion='Almacenamiento mensual',
            cantidad=Decimal('2'),
            valor_unitario=Decimal('50000'),
            subtotal=Decimal('100000'),
        )

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = DetalleFacturaSerializer(self.detalle)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('factura', campos)
        self.assertIn('descripcion', campos)
        self.assertIn('cantidad', campos)
        self.assertIn('valor_unitario', campos)
        self.assertIn('subtotal', campos)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = DetalleFacturaSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_descripcion_se_serializa_correctamente(self):
        """La descripcion se serializa con el valor correcto."""
        serializer = DetalleFacturaSerializer(self.detalle)
        self.assertEqual(serializer.data['descripcion'], 'Almacenamiento mensual')

    def test_subtotal_se_serializa_correctamente(self):
        """El subtotal se serializa con el valor correcto."""
        serializer = DetalleFacturaSerializer(self.detalle)
        self.assertEqual(Decimal(serializer.data['subtotal']), Decimal('100000'))


# -- Tests: FacturaSerializer -----------------------------------------

class FacturaSerializerTest(TestCase):
    """Pruebas para FacturaSerializer."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.factura = crear_factura(self.cliente)
        self.servicio = crear_servicio_prestado(self.cliente)
        self.detalle = DetalleFactura.objects.create(
            factura=self.factura,
            servicio_prestado=self.servicio,
            descripcion='Servicio test',
            cantidad=Decimal('1'),
            valor_unitario=Decimal('100000'),
            subtotal=Decimal('100000'),
        )

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = FacturaSerializer(self.factura)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('cliente', campos)
        self.assertIn('numero_factura', campos)
        self.assertIn('estado', campos)
        self.assertIn('subtotal', campos)
        self.assertIn('impuestos', campos)
        self.assertIn('total', campos)
        self.assertIn('detalles', campos)
        self.assertIn('cliente_nombre', campos)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = FacturaSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_numero_factura_es_readonly(self):
        """El numero_factura es de solo lectura."""
        field = FacturaSerializer().fields['numero_factura']
        self.assertTrue(field.read_only)

    def test_fecha_emision_es_readonly(self):
        """La fecha_emision es de solo lectura."""
        field = FacturaSerializer().fields['fecha_emision']
        self.assertTrue(field.read_only)

    def test_subtotal_es_readonly(self):
        """El subtotal es de solo lectura."""
        field = FacturaSerializer().fields['subtotal']
        self.assertTrue(field.read_only)

    def test_impuestos_es_readonly(self):
        """Los impuestos son de solo lectura."""
        field = FacturaSerializer().fields['impuestos']
        self.assertTrue(field.read_only)

    def test_total_es_readonly(self):
        """El total es de solo lectura."""
        field = FacturaSerializer().fields['total']
        self.assertTrue(field.read_only)

    def test_cliente_nombre_es_correcto(self):
        """El campo cliente_nombre refleja el nombre real del cliente."""
        serializer = FacturaSerializer(self.factura)
        self.assertEqual(serializer.data['cliente_nombre'], self.cliente.nombre)

    def test_detalles_son_anidados(self):
        """Los detalles se serializan de forma anidada en la factura."""
        serializer = FacturaSerializer(self.factura)
        self.assertIsInstance(serializer.data['detalles'], list)
        self.assertEqual(len(serializer.data['detalles']), 1)

    def test_detalle_anidado_incluye_campos(self):
        """Cada detalle anidado incluye sus campos correctamente."""
        serializer = FacturaSerializer(self.factura)
        detalle = serializer.data['detalles'][0]
        self.assertIn('descripcion', detalle)
        self.assertIn('cantidad', detalle)
        self.assertIn('subtotal', detalle)

    def test_estado_pendiente_se_serializa(self):
        """El estado pendiente se serializa correctamente."""
        serializer = FacturaSerializer(self.factura)
        self.assertEqual(serializer.data['estado'], 'pendiente')

    def test_numeros_monetarios_se_serializan(self):
        """Los campos monetarios se serializan con los valores correctos."""
        serializer = FacturaSerializer(self.factura)
        self.assertEqual(Decimal(serializer.data['subtotal']), Decimal('100000'))
        self.assertEqual(Decimal(serializer.data['impuestos']), Decimal('19000'))
        self.assertEqual(Decimal(serializer.data['total']), Decimal('119000'))