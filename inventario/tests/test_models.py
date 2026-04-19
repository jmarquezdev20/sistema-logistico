"""
  PRUEBAS DE MODELOS — Módulo Inventario
  Sistema: BodegaXpress - Gestión Logística
  Autor:   Juan Manuel Márquez

  Cubre:
    Producto   — creación, __str__, unique_together, ordering
    Inventario — creación, validación cantidad, OneToOne, fechas
    MovimientoInventario — tipos, cantidad mínima, ordering
"""

import uuid
from django.test import TestCase
from django.core.exceptions import ValidationError

from inventario.models import Producto, Inventario, MovimientoInventario
from clientes.models import Cliente
from infraestructura_bodegas.models import Bodega, Ubicacion


# Helpers 

def crear_cliente(nombre='Cliente Test'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Calle 123',
        activo=True,
    )


def crear_ubicacion(codigo='A-01', capacidad=100):
    bodega = Bodega.objects.create(
        nombre='Bodega Test',
        ubicacion='Zona Industrial',
        capacidad=1000,
    )
    return Ubicacion.objects.create(bodega=bodega, codigo=codigo, capacidad=capacidad)


def crear_producto(cliente=None, nombre='Producto Test'):
    if cliente is None:
        cliente = crear_cliente()
    return Producto.objects.create(
        cliente=cliente,
        nombre=nombre,
        descripcion='Descripción de prueba',
    )


# Tests: Producto 

class ProductoModelTest(TestCase):
    """Pruebas unitarias para el modelo Producto."""

    def setUp(self):
        self.cliente = crear_cliente()

    def test_crear_producto_exitoso(self):
        """Un producto se crea correctamente con datos válidos."""
        producto = Producto.objects.create(
            cliente=self.cliente,
            nombre='Caja de cartón',
            descripcion='Caja mediana',
        )
        self.assertIsInstance(producto.id, uuid.UUID)
        self.assertEqual(producto.nombre, 'Caja de cartón')
        self.assertEqual(producto.cliente, self.cliente)

    def test_str_retorna_nombre(self):
        """El método __str__ retorna el nombre del producto."""
        producto = crear_producto(self.cliente, 'Pallet de madera')
        self.assertEqual(str(producto), 'Pallet de madera')

    def test_unique_together_cliente_nombre(self):
        """No se pueden crear dos productos con el mismo nombre para el mismo cliente."""
        Producto.objects.create(cliente=self.cliente, nombre='Producto Único')
        with self.assertRaises(Exception):
            Producto.objects.create(cliente=self.cliente, nombre='Producto Único')

    def test_mismo_nombre_diferente_cliente(self):
        """Dos clientes distintos pueden tener productos con el mismo nombre."""
        cliente2 = crear_cliente('Cliente B')
        p1 = Producto.objects.create(cliente=self.cliente, nombre='Caja')
        p2 = Producto.objects.create(cliente=cliente2, nombre='Caja')
        self.assertNotEqual(p1.id, p2.id)

    def test_descripcion_puede_ser_vacia(self):
        """La descripción es un campo opcional."""
        producto = Producto.objects.create(
            cliente=self.cliente,
            nombre='Sin descripción',
            descripcion='',
        )
        self.assertEqual(producto.descripcion, '')

    def test_id_es_uuid(self):
        """El id generado es un UUID válido."""
        producto = crear_producto(self.cliente)
        self.assertIsInstance(producto.id, uuid.UUID)

    def test_ordering_por_nombre(self):
        """Los productos se ordenan alfabéticamente por nombre."""
        Producto.objects.create(cliente=self.cliente, nombre='Zinc')
        Producto.objects.create(cliente=self.cliente, nombre='Acero')
        Producto.objects.create(cliente=self.cliente, nombre='Madera')
        nombres = list(Producto.objects.values_list('nombre', flat=True))
        self.assertEqual(nombres, sorted(nombres))


# Tests: Inventario 

class InventarioModelTest(TestCase):
    """Pruebas unitarias para el modelo Inventario."""

    def setUp(self):
        self.producto = crear_producto()
        self.ubicacion = crear_ubicacion()

    def test_crear_inventario_exitoso(self):
        """Un inventario se crea con los datos correctos."""
        inventario = Inventario.objects.create(
            producto=self.producto,
            ubicacion=self.ubicacion,
            cantidad=0,
        )
        self.assertEqual(inventario.cantidad, 0)
        self.assertEqual(inventario.producto, self.producto)
        self.assertEqual(inventario.ubicacion, self.ubicacion)

    def test_str_incluye_nombre_y_stock(self):
        """El __str__ muestra el nombre del producto y el stock actual."""
        inventario = Inventario.objects.create(
            producto=self.producto,
            ubicacion=self.ubicacion,
            cantidad=42,
        )
        self.assertIn(self.producto.nombre, str(inventario))
        self.assertIn('42', str(inventario))

    def test_cantidad_no_puede_ser_negativa(self):
        """La cantidad no puede ser menor a 0."""
        inventario = Inventario(
            producto=self.producto,
            ubicacion=self.ubicacion,
            cantidad=-1,
        )
        with self.assertRaises(ValidationError):
            inventario.full_clean()

    def test_relacion_one_to_one_con_producto(self):
        """Cada producto solo puede tener un registro de inventario."""
        Inventario.objects.create(
            producto=self.producto,
            ubicacion=self.ubicacion,
            cantidad=0,
        )
        with self.assertRaises(Exception):
            Inventario.objects.create(
                producto=self.producto,
                ubicacion=self.ubicacion,
                cantidad=5,
            )

    def test_fecha_actualizacion_se_actualiza_al_guardar(self):
        """La fecha de actualización cambia cuando se guarda el inventario."""
        inventario = Inventario.objects.create(
            producto=self.producto,
            ubicacion=self.ubicacion,
            cantidad=10,
        )
        fecha_original = inventario.fecha_actualizacion
        inventario.cantidad = 20
        inventario.save()
        inventario.refresh_from_db()
        self.assertGreaterEqual(inventario.fecha_actualizacion, fecha_original)

    def test_cantidad_inicial_por_defecto_es_cero(self):
        """La cantidad por defecto al crear un inventario es 0."""
        inventario = Inventario.objects.create(
            producto=self.producto,
            ubicacion=self.ubicacion,
        )
        self.assertEqual(inventario.cantidad, 0)

    def test_id_es_uuid(self):
        """El id del inventario es un UUID válido."""
        inventario = Inventario.objects.create(
            producto=self.producto,
            ubicacion=self.ubicacion,
        )
        self.assertIsInstance(inventario.id, uuid.UUID)


# Tests: MovimientoInventario

class MovimientoInventarioModelTest(TestCase):
    """Pruebas unitarias para el modelo MovimientoInventario."""

    def setUp(self):
        self.producto = crear_producto()

    def test_crear_movimiento_entrada(self):
        """Se crea un movimiento de tipo entrada correctamente."""
        mov = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=50,
            observacion='Recepción de mercancía',
        )
        self.assertEqual(mov.tipo, 'entrada')
        self.assertEqual(mov.cantidad, 50)

    def test_crear_movimiento_salida(self):
        """Se crea un movimiento de tipo salida correctamente."""
        mov = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.SALIDA,
            cantidad=10,
        )
        self.assertEqual(mov.tipo, 'salida')

    def test_cantidad_minima_es_uno(self):
        """La cantidad mínima permitida en un movimiento es 1."""
        mov = MovimientoInventario(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=0,
        )
        with self.assertRaises(ValidationError):
            mov.full_clean()

    def test_str_incluye_tipo_nombre_y_cantidad(self):
        """El __str__ describe correctamente el movimiento."""
        mov = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=25,
        )
        resultado = str(mov)
        self.assertIn('entrada', resultado)
        self.assertIn(self.producto.nombre, resultado)
        self.assertIn('25', resultado)

    def test_ordering_por_fecha_descendente(self):
        """Los movimientos se ordenan del más reciente al más antiguo."""
        for i in range(3):
            MovimientoInventario.objects.create(
                producto=self.producto,
                tipo=MovimientoInventario.ENTRADA,
                cantidad=i + 1,
            )
        fechas = list(
            MovimientoInventario.objects.values_list('fecha_creacion', flat=True)
        )
        self.assertEqual(fechas, sorted(fechas, reverse=True))

    def test_observacion_es_opcional(self):
        """La observación es un campo opcional."""
        mov = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=5,
            observacion='',
        )
        self.assertEqual(mov.observacion, '')

    def test_id_es_uuid(self):
        """El id del movimiento es un UUID válido."""
        mov = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=1,
        )
        self.assertIsInstance(mov.id, uuid.UUID)

    def test_choices_tipo_validos(self):
        """Solo se aceptan los tipos 'entrada' y 'salida'."""
        self.assertEqual(MovimientoInventario.ENTRADA, 'entrada')
        self.assertEqual(MovimientoInventario.SALIDA, 'salida')
        self.assertEqual(len(MovimientoInventario.TIPO_CHOICES), 2)