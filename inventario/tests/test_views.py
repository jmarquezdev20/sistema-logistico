"""
  PRUEBAS DE VISTAS — Módulo Inventario
  Sistema: BodegaXpress - Gestión Logística
  Autor:   Juan Manuel Márquez
  Cubre:
    ProductoViewSet      — CRUD, filtros, validaciones de negocio
    InventarioViewSet    — listado, filtros, métodos no permitidos
    MovimientoViewSet    — entradas, salidas, stock, producto nuevo
"""

import uuid
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from usuarios.models import User, Rol
from clientes.models import Cliente
from infraestructura_bodegas.models import Bodega, Ubicacion
from inventario.models import Producto, Inventario, MovimientoInventario


# Helpers

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='viewuser', password='testpass123', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password(password)
        user.save()
    return user


def crear_cliente(nombre='Cliente Views'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001111111',
        direccion='Carrera 10',
        activo=True,
    )


def crear_bodega(nombre='Bodega Views'):
    return Bodega.objects.create(
        nombre=nombre,
        ubicacion='Zona Sur',
        capacidad=2000,
    )


def crear_ubicacion(bodega, codigo='V-01', capacidad=500):
    return Ubicacion.objects.create(bodega=bodega, codigo=codigo, capacidad=capacidad)


def crear_producto(cliente, nombre='Producto Views'):
    return Producto.objects.create(
        cliente=cliente,
        nombre=nombre,
        descripcion='Producto para pruebas de vistas',
    )


def crear_inventario(producto, ubicacion, cantidad=100):
    return Inventario.objects.create(
        producto=producto,
        ubicacion=ubicacion,
        cantidad=cantidad,
    )


# Base con autenticación JWT

class BaseAPITest(APITestCase):
    """Clase base: autentica el cliente con JWT antes de cada test."""

    def setUp(self):
        self.client = APIClient()
        self.user = crear_usuario()
        response = self.client.post('/api/auth/login/', {
            'email': self.user.email,
            'password': 'testpass123',
        }, format='json')
        if response.status_code == 200:
            token = response.data.get('access')
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        self.cliente = crear_cliente()
        self.bodega = crear_bodega()
        self.ubicacion = crear_ubicacion(self.bodega, 'V-01', 500)


# Tests: ProductoViewSet 
class ProductoViewSetTest(BaseAPITest):
    """Pruebas de la vista ProductoViewSet."""

    BASE_URL = '/api/inventario/productos/'

    def test_listar_productos_retorna_200(self):
        """GET retorna 200 con lista de productos."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_crear_producto_exitoso(self):
        """POST crea un producto y su inventario en una ubicación válida."""
        data = {
            'cliente': str(self.cliente.id),
            'nombre': 'Caja Premium',
            'descripcion': 'Alta resistencia',
            'ubicacion': str(self.ubicacion.id),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Producto.objects.filter(nombre='Caja Premium').exists())

    def test_crear_producto_genera_inventario_automaticamente(self):
        """Al crear un producto, se genera su registro de inventario con cantidad 0."""
        data = {
            'cliente': str(self.cliente.id),
            'nombre': 'Auto Inventario',
            'ubicacion': str(self.ubicacion.id),
        }
        self.client.post(self.BASE_URL, data, format='json')
        producto = Producto.objects.get(nombre='Auto Inventario')
        inventario = Inventario.objects.filter(producto=producto).first()
        self.assertIsNotNone(inventario)
        self.assertEqual(inventario.cantidad, 0)

    def test_crear_producto_sin_ubicacion_retorna_400(self):
        """POST sin campo ubicacion retorna 400 con mensaje de error."""
        data = {
            'cliente': str(self.cliente.id),
            'nombre': 'Sin Ubicación',
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_crear_producto_ubicacion_inexistente_retorna_400(self):
        """POST con UUID de ubicación que no existe retorna 400."""
        data = {
            'cliente': str(self.cliente.id),
            'nombre': 'Ubicación Fantasma',
            'ubicacion': str(uuid.uuid4()),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_producto_ubicacion_llena_retorna_400(self):
        """POST falla si la ubicación no tiene capacidad disponible."""
        ubicacion_llena = crear_ubicacion(self.bodega, 'FULL-01', 10)
        producto_base = crear_producto(self.cliente, 'Producto Lleno')
        Inventario.objects.create(
            producto=producto_base,
            ubicacion=ubicacion_llena,
            cantidad=10,
        )
        data = {
            'cliente': str(self.cliente.id),
            'nombre': 'No Cabe',
            'ubicacion': str(ubicacion_llena.id),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_filtrar_por_cliente(self):
        """GET con ?cliente= retorna solo los productos de ese cliente."""
        cliente2 = crear_cliente('Cliente Otro')
        producto = crear_producto(self.cliente, 'Filtrado OK')
        Inventario.objects.create(producto=producto, ubicacion=self.ubicacion, cantidad=0)
        crear_producto(cliente2, 'No Filtrado')

        response = self.client.get(f'{self.BASE_URL}?cliente={self.cliente.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        nombres = [p['nombre'] for p in response.data.get('results', response.data)]
        self.assertIn('Filtrado OK', nombres)
        self.assertNotIn('No Filtrado', nombres)

    def test_buscar_por_nombre(self):
        """GET con ?search= filtra productos por nombre."""
        producto = crear_producto(self.cliente, 'Pallet Especial XL')
        Inventario.objects.create(producto=producto, ubicacion=self.ubicacion, cantidad=0)

        response = self.client.get(f'{self.BASE_URL}?search=Pallet')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        self.assertTrue(any('Pallet' in p['nombre'] for p in resultados))

    def test_detalle_producto_retorna_200(self):
        """GET /{id}/ retorna los datos del producto."""
        producto = crear_producto(self.cliente, 'Detalle Test')
        Inventario.objects.create(producto=producto, ubicacion=self.ubicacion, cantidad=0)
        response = self.client.get(f'{self.BASE_URL}{producto.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Detalle Test')


# Tests: InventarioViewSet 
class InventarioViewSetTest(BaseAPITest):
    """Pruebas de la vista InventarioViewSet."""

    BASE_URL = '/api/inventario/inventarios/'

    def setUp(self):
        super().setUp()
        self.producto = crear_producto(self.cliente)
        self.inventario = crear_inventario(self.producto, self.ubicacion, cantidad=50)

    def test_listar_inventarios_retorna_200(self):
        """GET retorna 200 con lista de inventarios."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_respuesta_incluye_campos_calculados(self):
        """La respuesta incluye producto_nombre, cliente_nombre y ubicacion_codigo."""
        response = self.client.get(self.BASE_URL)
        resultados = response.data.get('results', response.data)
        if resultados:
            primer = resultados[0]
            self.assertIn('producto_nombre', primer)
            self.assertIn('cliente_nombre', primer)
            self.assertIn('ubicacion_codigo', primer)

    def test_filtrar_por_cliente(self):
        """GET con ?cliente= retorna inventarios solo de ese cliente."""
        cliente2 = crear_cliente('Cliente Inv 2')
        producto2 = crear_producto(cliente2, 'Producto Otro')
        ubicacion2 = crear_ubicacion(self.bodega, 'Z-99', 200)
        crear_inventario(producto2, ubicacion2, cantidad=5)

        response = self.client.get(f'{self.BASE_URL}?cliente={self.cliente.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for inv in resultados:
            self.assertEqual(inv['cliente_nombre'], self.cliente.nombre)

    def test_no_permite_delete(self):
        """DELETE retorna 405 Method Not Allowed."""
        response = self.client.delete(f'{self.BASE_URL}{self.inventario.id}/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_no_permite_put(self):
        """PUT retorna 405 Method Not Allowed."""
        response = self.client.put(
            f'{self.BASE_URL}{self.inventario.id}/',
            {'cantidad': 999},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_no_permite_patch(self):
        """PATCH retorna 405 Method Not Allowed."""
        response = self.client.patch(
            f'{self.BASE_URL}{self.inventario.id}/',
            {'cantidad': 1},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_detalle_inventario_retorna_200(self):
        """GET /{id}/ retorna el detalle del inventario."""
        response = self.client.get(f'{self.BASE_URL}{self.inventario.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['cantidad'], 50)


# Tests: MovimientoInventarioViewSet 

class MovimientoInventarioViewSetTest(BaseAPITest):
    """Pruebas de la vista MovimientoInventarioViewSet."""

    BASE_URL = '/api/inventario/movimientos/'

    def setUp(self):
        super().setUp()
        self.producto = crear_producto(self.cliente)
        self.inventario = crear_inventario(self.producto, self.ubicacion, cantidad=100)

    def test_listar_movimientos_retorna_200(self):
        """GET retorna 200 con lista de movimientos."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_entrada_aumenta_stock(self):
        """POST entrada suma la cantidad al inventario correctamente."""
        stock_inicial = self.inventario.cantidad
        data = {
            'producto': str(self.producto.id),
            'tipo': 'entrada',
            'cantidad': 30,
            'observacion': 'Ingreso de prueba',
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventario.refresh_from_db()
        self.assertEqual(self.inventario.cantidad, stock_inicial + 30)

    def test_salida_reduce_stock(self):
        """POST salida resta la cantidad del inventario correctamente."""
        stock_inicial = self.inventario.cantidad
        data = {
            'producto': str(self.producto.id),
            'tipo': 'salida',
            'cantidad': 20,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventario.refresh_from_db()
        self.assertEqual(self.inventario.cantidad, stock_inicial - 20)

    def test_salida_sin_stock_suficiente_retorna_400(self):
        """POST salida mayor al stock disponible retorna 400 con mensaje."""
        data = {
            'producto': str(self.producto.id),
            'tipo': 'salida',
            'cantidad': 9999,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_salida_fallida_no_modifica_stock(self):
        """Una salida con stock insuficiente no modifica el inventario."""
        stock_inicial = self.inventario.cantidad
        data = {
            'producto': str(self.producto.id),
            'tipo': 'salida',
            'cantidad': 9999,
        }
        self.client.post(self.BASE_URL, data, format='json')
        self.inventario.refresh_from_db()
        self.assertEqual(self.inventario.cantidad, stock_inicial)

    def test_entrada_supera_capacidad_retorna_400(self):
        """POST entrada que excede la capacidad de la ubicación retorna 400."""
        data = {
            'producto': str(self.producto.id),
            'tipo': 'entrada',
            'cantidad': 99999,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_producto_sin_inventario_retorna_400(self):
        """POST para producto sin ubicación asignada retorna 400."""
        producto_sin_inv = crear_producto(self.cliente, 'Sin Inventario Asignado')
        data = {
            'producto': str(producto_sin_inv.id),
            'tipo': 'entrada',
            'cantidad': 10,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_con_producto_nuevo(self):
        """POST con producto_nuevo crea producto, inventario y movimiento en una sola llamada."""
        ubicacion_nueva = crear_ubicacion(self.bodega, 'NEW-01', 300)
        data = {
            'tipo': 'entrada',
            'cantidad': 15,
            'observacion': 'Producto nuevo ingresado',
            'producto_nuevo': {
                'nombre': 'Producto Creado Al Vuelo',
                'cliente': str(self.cliente.id),
                'descripcion': 'Creado en el movimiento',
                'ubicacion': str(ubicacion_nueva.id),
            }
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Producto.objects.filter(nombre='Producto Creado Al Vuelo').exists())

    def test_filtrar_por_producto(self):
        """GET con ?producto= retorna solo movimientos de ese producto."""
        MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=5,
        )
        response = self.client.get(f'{self.BASE_URL}?producto={self.producto.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for mov in resultados:
            self.assertEqual(str(mov['producto']), str(self.producto.id))

    def test_filtrar_por_cliente(self):
        """GET con ?cliente= retorna movimientos de productos de ese cliente."""
        MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=10,
        )
        response = self.client.get(f'{self.BASE_URL}?cliente={self.cliente.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_no_permite_delete(self):
        """DELETE retorna 405 Method Not Allowed."""
        mov = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=1,
        )
        response = self.client.delete(f'{self.BASE_URL}{mov.id}/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_no_permite_put(self):
        """PUT retorna 405 Method Not Allowed."""
        mov = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.ENTRADA,
            cantidad=1,
        )
        response = self.client.put(
            f'{self.BASE_URL}{mov.id}/',
            {'cantidad': 99},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_tipo_invalido_retorna_400(self):
        """POST con tipo distinto de entrada/salida retorna 400."""
        data = {
            'producto': str(self.producto.id),
            'tipo': 'transferencia',
            'cantidad': 10,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cantidad_cero_retorna_400(self):
        """POST con cantidad 0 falla la validación del serializer."""
        data = {
            'producto': str(self.producto.id),
            'tipo': 'entrada',
            'cantidad': 0,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)