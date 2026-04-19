"""
  PRUEBAS DE MODELOS — Módulo Envios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
  Cubre:
    OrdenEnvio    - creacion, estados, __str__, ordering
    EnvioProducto - creacion, relaciones, cantidad minima, __str__
"""

import uuid
from django.test import TestCase
from django.core.exceptions import ValidationError

from clientes.models import Cliente
from transportadores.models import Transportador
from inventario.models import Producto
from infraestructura_bodegas.models import Bodega, Ubicacion
from envios.models import OrdenEnvio, EnvioProducto


#Helpers 

def crear_cliente(nombre='Cliente Envio'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Calle 1',
        activo=True,
    )


def crear_transportador(nombre='Transportador Test'):
    return Transportador.objects.create(
        nombre=nombre,
        telefono='3009999999',
        placa_vehiculo='ABC123',
        tipo_vehiculo='camion',
        activo=True,
    )


def crear_producto(nombre='Producto Envio'):
    cliente = Cliente.objects.get_or_create(
        correo=f'clienteproducto{nombre.lower().replace(" ", "")}@test.com',
        defaults={
            'nombre': f'Cliente {nombre}',
            'telefono': '3001234567',
            'direccion': 'Calle 1',
            'activo': True,
        }
    )[0]
    return Producto.objects.create(
        cliente=cliente,
        nombre=nombre,
        descripcion='',
    )


def crear_orden(cliente=None, transportador=None, estado='pendiente'):
    if cliente is None:
        cliente = crear_cliente()
    return OrdenEnvio.objects.create(
        cliente=cliente,
        transportador=transportador,
        destino='Bogota, Colombia',
        estado=estado,
        observacion='',
    )


#Tests: OrdenEnvio

class OrdenEnvioModelTest(TestCase):
    """Pruebas unitarias para el modelo OrdenEnvio."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.transportador = crear_transportador()

    def test_crear_orden_exitosa(self):
        """Una orden de envio se crea correctamente con datos validos."""
        orden = crear_orden(self.cliente, self.transportador)
        self.assertIsInstance(orden.id, uuid.UUID)
        self.assertEqual(orden.cliente, self.cliente)
        self.assertEqual(orden.destino, 'Bogota, Colombia')

    def test_estado_por_defecto_es_pendiente(self):
        """El estado inicial de una orden es pendiente."""
        orden = OrdenEnvio.objects.create(
            cliente=self.cliente,
            destino='Medellin',
        )
        self.assertEqual(orden.estado, OrdenEnvio.PENDIENTE)

    def test_estado_puede_ser_preparando(self):
        """El estado de la orden puede ser preparando."""
        orden = crear_orden(self.cliente, estado='preparando')
        self.assertEqual(orden.estado, OrdenEnvio.PREPARANDO)

    def test_estado_puede_ser_en_transito(self):
        """El estado de la orden puede ser en_transito."""
        orden = crear_orden(self.cliente, estado='en_transito')
        self.assertEqual(orden.estado, OrdenEnvio.EN_TRANSITO)

    def test_estado_puede_ser_entregado(self):
        """El estado de la orden puede ser entregado."""
        orden = crear_orden(self.cliente, estado='entregado')
        self.assertEqual(orden.estado, OrdenEnvio.ENTREGADO)

    def test_choices_estado_son_cuatro(self):
        """Existen exactamente 4 estados posibles para una orden."""
        self.assertEqual(len(OrdenEnvio.ESTADO_CHOICES), 4)

    def test_transportador_es_opcional(self):
        """El transportador es un campo opcional."""
        orden = OrdenEnvio.objects.create(
            cliente=self.cliente,
            destino='Cali',
            transportador=None,
        )
        self.assertIsNone(orden.transportador)

    def test_str_incluye_id_cliente_y_estado(self):
        """El __str__ incluye el id, cliente y estado."""
        orden = crear_orden(self.cliente)
        resultado = str(orden)
        self.assertIn(self.cliente.nombre, resultado)
        self.assertIn('pendiente', resultado)

    def test_id_es_uuid(self):
        """El id de la orden es un UUID valido."""
        orden = crear_orden(self.cliente)
        self.assertIsInstance(orden.id, uuid.UUID)

    def test_ordering_por_fecha_creacion_descendente(self):
        """Las ordenes se ordenan de la mas reciente a la mas antigua."""
        self.assertEqual(OrdenEnvio._meta.ordering, ['-fecha_creacion'])

    def test_fecha_despacho_es_nula_por_defecto(self):
        """La fecha de despacho es None al crear la orden."""
        orden = crear_orden(self.cliente)
        self.assertIsNone(orden.fecha_despacho)

    def test_observacion_puede_ser_vacia(self):
        """La observacion es un campo opcional."""
        orden = OrdenEnvio.objects.create(
            cliente=self.cliente,
            destino='Barranquilla',
            observacion='',
        )
        self.assertEqual(orden.observacion, '')

    def test_orden_tiene_relacion_con_cliente(self):
        """La orden esta correctamente relacionada con el cliente."""
        orden = crear_orden(self.cliente)
        self.assertEqual(orden.cliente.id, self.cliente.id)

    def test_orden_tiene_relacion_con_transportador(self):
        """La orden esta correctamente relacionada con el transportador."""
        orden = crear_orden(self.cliente, self.transportador)
        self.assertEqual(orden.transportador.id, self.transportador.id)


#Tests: EnvioProducto 

class EnvioProductoModelTest(TestCase):
    """Pruebas unitarias para el modelo EnvioProducto."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.orden = crear_orden(self.cliente)
        self.producto = crear_producto()

    def test_crear_envio_producto_exitoso(self):
        """Un EnvioProducto se crea correctamente."""
        ep = EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=5,
        )
        self.assertIsInstance(ep.id, uuid.UUID)
        self.assertEqual(ep.orden_envio, self.orden)
        self.assertEqual(ep.producto, self.producto)
        self.assertEqual(ep.cantidad, 5)

    def test_str_incluye_nombre_y_cantidad(self):
        """El __str__ incluye el nombre del producto y la cantidad."""
        ep = EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=3,
        )
        resultado = str(ep)
        self.assertIn(self.producto.nombre, resultado)
        self.assertIn('3', resultado)

    def test_cantidad_minima_es_uno(self):
        """La cantidad minima es 1."""
        ep = EnvioProducto(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=0,
        )
        with self.assertRaises(ValidationError):
            ep.full_clean()

    def test_id_es_uuid(self):
        """El id del EnvioProducto es un UUID valido."""
        ep = EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=1,
        )
        self.assertIsInstance(ep.id, uuid.UUID)

    def test_relacion_con_orden(self):
        """El EnvioProducto esta correctamente relacionado con la orden."""
        ep = EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=2,
        )
        self.assertEqual(ep.orden_envio.id, self.orden.id)

    def test_orden_tiene_productos(self):
        """Se pueden acceder a los productos desde la orden via related_name."""
        EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=4,
        )
        self.assertEqual(self.orden.productos.count(), 1)

    def test_multiples_productos_por_orden(self):
        """Una orden puede tener multiples productos."""
        producto2 = crear_producto('Producto 2')
        EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=1,
        )
        EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=producto2,
            cantidad=2,
        )
        self.assertEqual(self.orden.productos.count(), 2)

    def test_eliminar_orden_elimina_productos(self):
        """Al eliminar una orden, sus EnvioProducto se eliminan en cascada."""
        EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=1,
        )
        orden_id = self.orden.id
        self.orden.delete()
        self.assertEqual(EnvioProducto.objects.filter(orden_envio_id=orden_id).count(), 0)