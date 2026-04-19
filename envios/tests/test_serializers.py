"""
  PRUEBAS DE SERIALIZERS — Módulo Envios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
  Cubre:
    OrdenEnvioSerializer    - campos, read_only, productos anidados
    EnvioProductoSerializer - campos, stock_disponible, read_only
"""

from django.test import TestCase

from clientes.models import Cliente
from transportadores.models import Transportador
from inventario.models import Producto, Inventario
from infraestructura_bodegas.models import Bodega, Ubicacion
from envios.models import OrdenEnvio, EnvioProducto
from envios.serializers import OrdenEnvioSerializer, EnvioProductoSerializer


#Helpers 

def crear_cliente(nombre='Cliente Ser Envio'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001111111',
        direccion='Av 1',
        activo=True,
    )


def crear_transportador():
    return Transportador.objects.create(
        nombre='Trans Test',
        telefono='3002222222',
        placa_vehiculo='XYZ789',
        tipo_vehiculo='furgon',
        activo=True,
    )


def crear_producto(nombre='Prod Ser Envio'):
    cliente = crear_cliente('Cliente Prod Ser')
    return Producto.objects.create(
        cliente=cliente,
        nombre=nombre,
        descripcion='',
    )


def crear_ubicacion():
    bodega = Bodega.objects.create(
        nombre='Bodega Ser',
        ubicacion='Zona',
        capacidad=500,
    )
    return Ubicacion.objects.create(bodega=bodega, codigo='SER-01', capacidad=200)


def crear_orden(cliente=None, transportador=None):
    if cliente is None:
        cliente = crear_cliente()
    return OrdenEnvio.objects.create(
        cliente=cliente,
        transportador=transportador,
        destino='Cartagena',
        estado='pendiente',
    )


#Tests: EnvioProductoSerializer

class EnvioProductoSerializerTest(TestCase):
    """Pruebas para EnvioProductoSerializer."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.orden = crear_orden(self.cliente)
        self.producto = crear_producto()
        self.ep = EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=5,
        )

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = EnvioProductoSerializer(self.ep)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('orden_envio', campos)
        self.assertIn('producto', campos)
        self.assertIn('cantidad', campos)
        self.assertIn('producto_nombre', campos)
        self.assertIn('stock_disponible', campos)

    def test_producto_nombre_es_correcto(self):
        """El campo producto_nombre refleja el nombre del producto."""
        serializer = EnvioProductoSerializer(self.ep)
        self.assertEqual(serializer.data['producto_nombre'], self.producto.nombre)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = EnvioProductoSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_stock_disponible_sin_inventario_es_cero(self):
        """Si el producto no tiene inventario asignado, stock_disponible es 0."""
        serializer = EnvioProductoSerializer(self.ep)
        self.assertEqual(serializer.data['stock_disponible'], 0)

    def test_stock_disponible_con_inventario(self):
        """El campo stock_disponible refleja la cantidad real del inventario."""
        ubicacion = crear_ubicacion()
        Inventario.objects.create(
            producto=self.producto,
            ubicacion=ubicacion,
            cantidad=42,
        )
        serializer = EnvioProductoSerializer(self.ep)
        self.assertEqual(serializer.data['stock_disponible'], 42)

    def test_cantidad_se_serializa_correctamente(self):
        """La cantidad se serializa con el valor correcto."""
        serializer = EnvioProductoSerializer(self.ep)
        self.assertEqual(serializer.data['cantidad'], 5)


#Tests: OrdenEnvioSerializer
class OrdenEnvioSerializerTest(TestCase):
    """Pruebas para OrdenEnvioSerializer."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.transportador = crear_transportador()
        self.orden = crear_orden(self.cliente, self.transportador)
        self.producto = crear_producto()
        EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=3,
        )

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = OrdenEnvioSerializer(self.orden)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('cliente', campos)
        self.assertIn('transportador', campos)
        self.assertIn('destino', campos)
        self.assertIn('estado', campos)
        self.assertIn('productos', campos)
        self.assertIn('cliente_nombre', campos)
        self.assertIn('transportador_nombre', campos)

    def test_cliente_nombre_es_correcto(self):
        """El campo cliente_nombre refleja el nombre del cliente."""
        serializer = OrdenEnvioSerializer(self.orden)
        self.assertEqual(serializer.data['cliente_nombre'], self.cliente.nombre)

    def test_transportador_nombre_es_correcto(self):
        """El campo transportador_nombre refleja el nombre del transportador."""
        serializer = OrdenEnvioSerializer(self.orden)
        self.assertEqual(serializer.data['transportador_nombre'], self.transportador.nombre)

    def test_productos_son_anidados(self):
        """Los productos se serializan de forma anidada en la orden."""
        serializer = OrdenEnvioSerializer(self.orden)
        self.assertIsInstance(serializer.data['productos'], list)
        self.assertEqual(len(serializer.data['productos']), 1)

    def test_producto_anidado_incluye_campos(self):
        """Cada producto anidado incluye sus campos correctamente."""
        serializer = OrdenEnvioSerializer(self.orden)
        producto = serializer.data['productos'][0]
        self.assertIn('producto_nombre', producto)
        self.assertIn('cantidad', producto)
        self.assertIn('stock_disponible', producto)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = OrdenEnvioSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_fecha_creacion_es_readonly(self):
        """El campo fecha_creacion es de solo lectura."""
        field = OrdenEnvioSerializer().fields['fecha_creacion']
        self.assertTrue(field.read_only)

    def test_fecha_despacho_es_readonly(self):
        """El campo fecha_despacho es de solo lectura."""
        field = OrdenEnvioSerializer().fields['fecha_despacho']
        self.assertTrue(field.read_only)

    def test_estado_pendiente_se_serializa(self):
        """El estado pendiente se serializa correctamente."""
        serializer = OrdenEnvioSerializer(self.orden)
        self.assertEqual(serializer.data['estado'], 'pendiente')

    def test_transportador_nombre_es_none_sin_transportador(self):
        """El campo transportador_nombre es None si no hay transportador."""
        orden_sin_trans = crear_orden(self.cliente, transportador=None)
        serializer = OrdenEnvioSerializer(orden_sin_trans)
        transportador_nombre = serializer.data.get('transportador_nombre')
        self.assertIsNone(transportador_nombre)