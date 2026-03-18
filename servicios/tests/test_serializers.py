"""
======================================================================
  PRUEBAS DE SERIALIZERS — Módulo Servicios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    CatalogoServicioSerializer  - campos, unidad_display, read_only
    ServicioPrestadoSerializer  - campos calculados, valor_total
======================================================================
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from clientes.models import Cliente
from servicios.models import CatalogoServicio, ServicioPrestado
from servicios.serializers import CatalogoServicioSerializer, ServicioPrestadoSerializer


# -- Helpers ----------------------------------------------------------

def crear_cliente(nombre='Cliente Ser Serv'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3009876543',
        direccion='Av 1',
        activo=True,
    )


def crear_catalogo(nombre='Test Catalogo', unidad='por_dia', tarifa=Decimal('50000')):
    return CatalogoServicio.objects.create(
        nombre=nombre,
        descripcion='',
        tarifa=tarifa,
        unidad=unidad,
        activo=True,
    )


def crear_servicio(cliente=None, catalogo=None):
    if cliente is None:
        cliente = crear_cliente()
    if catalogo is None:
        catalogo = crear_catalogo()
    return ServicioPrestado.objects.create(
        cliente=cliente,
        catalogo_servicio=catalogo,
        cantidad=Decimal('2'),
        valor_unitario=Decimal('50000'),
        valor_total=Decimal('100000'),
        fecha=timezone.now().date(),
        facturado=False,
    )


# -- Tests: CatalogoServicioSerializer --------------------------------

class CatalogoServicioSerializerTest(TestCase):
    """Pruebas para CatalogoServicioSerializer."""

    def setUp(self):
        self.catalogo = crear_catalogo()

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = CatalogoServicioSerializer(self.catalogo)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('nombre', campos)
        self.assertIn('tarifa', campos)
        self.assertIn('unidad', campos)
        self.assertIn('unidad_display', campos)
        self.assertIn('activo', campos)

    def test_unidad_display_por_dia(self):
        """El campo unidad_display muestra 'Por dia' para unidad por_dia."""
        catalogo = crear_catalogo(unidad='por_dia')
        serializer = CatalogoServicioSerializer(catalogo)
        self.assertIn('día', serializer.data['unidad_display'].lower())

    def test_unidad_display_por_envio(self):
        """El campo unidad_display muestra el label correcto para por_envio."""
        catalogo = crear_catalogo(unidad='por_envio')
        serializer = CatalogoServicioSerializer(catalogo)
        self.assertIn('envío', serializer.data['unidad_display'].lower())

    def test_tarifa_se_serializa_correctamente(self):
        """La tarifa se serializa con el valor correcto."""
        serializer = CatalogoServicioSerializer(self.catalogo)
        self.assertEqual(Decimal(serializer.data['tarifa']), Decimal('50000'))

    def test_activo_se_serializa(self):
        """El campo activo se serializa correctamente."""
        serializer = CatalogoServicioSerializer(self.catalogo)
        self.assertTrue(serializer.data['activo'])

    def test_datos_validos_pasan_validacion(self):
        """Datos correctos pasan la validacion del serializer."""
        data = {
            'nombre': 'Nuevo Servicio',
            'descripcion': 'Test',
            'tarifa': '25000',
            'unidad': 'unitario',
            'activo': True,
        }
        serializer = CatalogoServicioSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_nombre_requerido(self):
        """El nombre es un campo obligatorio."""
        data = {'tarifa': '25000', 'unidad': 'unitario'}
        serializer = CatalogoServicioSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('nombre', serializer.errors)

    def test_tarifa_requerida(self):
        """La tarifa es un campo obligatorio."""
        data = {'nombre': 'Sin tarifa', 'unidad': 'unitario'}
        serializer = CatalogoServicioSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('tarifa', serializer.errors)

    def test_unidad_requerida(self):
        """La unidad es un campo obligatorio."""
        data = {'nombre': 'Sin unidad', 'tarifa': '10000'}
        serializer = CatalogoServicioSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('unidad', serializer.errors)


# -- Tests: ServicioPrestadoSerializer --------------------------------

class ServicioPrestadoSerializerTest(TestCase):
    """Pruebas para ServicioPrestadoSerializer."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.catalogo = crear_catalogo()
        self.servicio = crear_servicio(self.cliente, self.catalogo)

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = ServicioPrestadoSerializer(self.servicio)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('cliente', campos)
        self.assertIn('cliente_nombre', campos)
        self.assertIn('catalogo_servicio', campos)
        self.assertIn('catalogo_nombre', campos)
        self.assertIn('unidad', campos)
        self.assertIn('cantidad', campos)
        self.assertIn('valor_unitario', campos)
        self.assertIn('valor_total', campos)
        self.assertIn('facturado', campos)

    def test_cliente_nombre_es_correcto(self):
        """El campo cliente_nombre refleja el nombre real del cliente."""
        serializer = ServicioPrestadoSerializer(self.servicio)
        self.assertEqual(serializer.data['cliente_nombre'], self.cliente.nombre)

    def test_catalogo_nombre_es_correcto(self):
        """El campo catalogo_nombre refleja el nombre del catalogo."""
        serializer = ServicioPrestadoSerializer(self.servicio)
        self.assertEqual(serializer.data['catalogo_nombre'], self.catalogo.nombre)

    def test_unidad_proviene_del_catalogo(self):
        """El campo unidad proviene del catalogo del servicio."""
        serializer = ServicioPrestadoSerializer(self.servicio)
        self.assertEqual(serializer.data['unidad'], self.catalogo.unidad)

    def test_valor_total_es_readonly(self):
        """El campo valor_total es de solo lectura."""
        field = ServicioPrestadoSerializer().fields['valor_total']
        self.assertTrue(field.read_only)

    def test_valor_total_se_serializa_correctamente(self):
        """El valor_total se serializa con el valor calculado."""
        serializer = ServicioPrestadoSerializer(self.servicio)
        self.assertEqual(Decimal(serializer.data['valor_total']), Decimal('100000'))

    def test_facturado_false_por_defecto(self):
        """El campo facturado es False por defecto."""
        serializer = ServicioPrestadoSerializer(self.servicio)
        self.assertFalse(serializer.data['facturado'])