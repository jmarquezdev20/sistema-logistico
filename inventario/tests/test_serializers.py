"""
======================================================================
  PRUEBAS DE SERIALIZERS — Módulo Inventario
  Sistema: BodegaXpress - Gestión Logística
  Autor:   Juan Manuel Márquez
======================================================================
  Cubre:
    ✔ ProductoSerializer        — campos, validaciones, read_only
    ✔ InventarioSerializer      — campos calculados, read_only
    ✔ MovimientoInventarioSerializer — campos de envío, método fields
======================================================================
"""

from django.test import TestCase

from inventario.models import Producto, Inventario, MovimientoInventario
from inventario.serializers import (
    ProductoSerializer,
    InventarioSerializer,
    MovimientoInventarioSerializer,
)
from clientes.models import Cliente
from infraestructura_bodegas.models import Bodega, Ubicacion


# ── Helpers ──────────────────────────────────────────────────────────

def crear_cliente(nombre='Cliente Serializer'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3009876543',
        direccion='Avenida 45',
        activo=True,
    )


def crear_ubicacion(codigo='S-01', capacidad=200):
    bodega = Bodega.objects.create(
        nombre='Bodega Serializer',
        ubicacion='Zona Norte',
        capacidad=500,
    )
    return Ubicacion.objects.create(bodega=bodega, codigo=codigo, capacidad=capacidad)


def crear_producto(cliente=None, nombre='Producto Serializer'):
    if cliente is None:
        cliente = crear_cliente()
    return Producto.objects.create(
        cliente=cliente,
        nombre=nombre,
        descripcion='Test serializer',
    )


def crear_inventario(producto=None, ubicacion=None, cantidad=10):
    if producto is None:
        producto = crear_producto()
    if ubicacion is None:
        ubicacion = crear_ubicacion()
    return Inventario.objects.create(
        producto=producto,
        ubicacion=ubicacion,
        cantidad=cantidad,
    )


# ── Tests: ProductoSerializer ─────────────────────────────────────────

class ProductoSerializerTest(TestCase):
    """Pruebas para ProductoSerializer."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.producto = crear_producto(self.cliente)

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = ProductoSerializer(self.producto)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('nombre', campos)
        self.assertIn('cliente', campos)
        self.assertIn('descripcion', campos)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = ProductoSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_datos_validos_pasan_validacion(self):
        """Datos correctos pasan la validación del serializer."""
        data = {
            'cliente': str(self.cliente.id),
            'nombre': 'Nuevo Producto Válido',
            'descripcion': 'Descripción válida',
        }
        serializer = ProductoSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_nombre_es_requerido(self):
        """El nombre es un campo obligatorio."""
        data = {'cliente': str(self.cliente.id), 'descripcion': 'Sin nombre'}
        serializer = ProductoSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('nombre', serializer.errors)

    def test_cliente_es_requerido(self):
        """El cliente es un campo obligatorio."""
        data = {'nombre': 'Producto Sin Cliente', 'descripcion': ''}
        serializer = ProductoSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('cliente', serializer.errors)

    def test_descripcion_es_opcional(self):
        """La descripción no es requerida para pasar la validación."""
        data = {
            'cliente': str(self.cliente.id),
            'nombre': 'Sin Descripción',
        }
        serializer = ProductoSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializa_id_como_string(self):
        """El id se serializa como string UUID."""
        serializer = ProductoSerializer(self.producto)
        self.assertIsInstance(serializer.data['id'], str)


# ── Tests: InventarioSerializer ───────────────────────────────────────

class InventarioSerializerTest(TestCase):
    """Pruebas para InventarioSerializer."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.producto = crear_producto(self.cliente)
        self.ubicacion = crear_ubicacion()
        self.inventario = crear_inventario(self.producto, self.ubicacion, cantidad=25)

    def test_incluye_campos_calculados(self):
        """El serializer incluye los campos de solo lectura calculados."""
        serializer = InventarioSerializer(self.inventario)
        data = serializer.data
        self.assertIn('producto_nombre', data)
        self.assertIn('cliente_nombre', data)
        self.assertIn('ubicacion_codigo', data)

    def test_producto_nombre_es_correcto(self):
        """El campo producto_nombre refleja el nombre real del producto."""
        serializer = InventarioSerializer(self.inventario)
        self.assertEqual(serializer.data['producto_nombre'], self.producto.nombre)

    def test_cliente_nombre_es_correcto(self):
        """El campo cliente_nombre refleja el nombre real del cliente."""
        serializer = InventarioSerializer(self.inventario)
        self.assertEqual(serializer.data['cliente_nombre'], self.cliente.nombre)

    def test_ubicacion_codigo_es_correcto(self):
        """El campo ubicacion_codigo refleja el código real de la ubicación."""
        serializer = InventarioSerializer(self.inventario)
        self.assertEqual(serializer.data['ubicacion_codigo'], self.ubicacion.codigo)

    def test_cantidad_refleja_valor_real(self):
        """El campo cantidad refleja el valor almacenado en la base de datos."""
        serializer = InventarioSerializer(self.inventario)
        self.assertEqual(serializer.data['cantidad'], 25)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = InventarioSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_fecha_actualizacion_es_readonly(self):
        """El campo fecha_actualizacion es de solo lectura."""
        field = InventarioSerializer().fields['fecha_actualizacion']
        self.assertTrue(field.read_only)

    def test_fecha_creacion_es_readonly(self):
        """El campo fecha_creacion es de solo lectura."""
        field = InventarioSerializer().fields['fecha_creacion']
        self.assertTrue(field.read_only)


# ── Tests: MovimientoInventarioSerializer ────────────────────────────

class MovimientoInventarioSerializerTest(TestCase):
    """Pruebas para MovimientoInventarioSerializer."""

    def setUp(self):
        self.producto = crear_producto()
        self.movimiento = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=30,
            observacion='Prueba serializer',
        )

    def test_incluye_campo_producto_nombre(self):
        """El serializer incluye el nombre del producto."""
        serializer = MovimientoInventarioSerializer(self.movimiento)
        self.assertIn('producto_nombre', serializer.data)
        self.assertEqual(serializer.data['producto_nombre'], self.producto.nombre)

    def test_campos_envio_son_none_sin_envio(self):
        """Los campos de envío son None cuando no hay envío asociado."""
        serializer = MovimientoInventarioSerializer(self.movimiento)
        self.assertIsNone(serializer.data['destino'])
        self.assertIsNone(serializer.data['transportador_nombre'])
        self.assertIsNone(serializer.data['numero_orden'])

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = MovimientoInventarioSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_fecha_creacion_es_readonly(self):
        """El campo fecha_creacion es de solo lectura."""
        field = MovimientoInventarioSerializer().fields['fecha_creacion']
        self.assertTrue(field.read_only)

    def test_tipo_entrada_se_serializa_correctamente(self):
        """El tipo 'entrada' se serializa con el valor correcto."""
        serializer = MovimientoInventarioSerializer(self.movimiento)
        self.assertEqual(serializer.data['tipo'], 'entrada')

    def test_tipo_salida_se_serializa_correctamente(self):
        """El tipo 'salida' se serializa con el valor correcto."""
        mov_salida = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.SALIDA,
            cantidad=5,
        )
        serializer = MovimientoInventarioSerializer(mov_salida)
        self.assertEqual(serializer.data['tipo'], 'salida')

    def test_cantidad_se_serializa_correctamente(self):
        """La cantidad se serializa con el valor almacenado."""
        serializer = MovimientoInventarioSerializer(self.movimiento)
        self.assertEqual(serializer.data['cantidad'], 30)

    def test_observacion_se_serializa(self):
        """La observación se incluye en la serialización."""
        serializer = MovimientoInventarioSerializer(self.movimiento)
        self.assertEqual(serializer.data['observacion'], 'Prueba serializer')