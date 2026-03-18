"""
======================================================================
  PRUEBAS DE VISTAS — Módulo Envios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    OrdenEnvioViewSet    - CRUD, despachar, filtros, permisos
    EnvioProductoViewSet - listar, crear, eliminar
======================================================================
"""

import uuid
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from usuarios.models import User, Rol
from clientes.models import Cliente
from transportadores.models import Transportador
from inventario.models import Producto, Inventario
from infraestructura_bodegas.models import Bodega, Ubicacion
from envios.models import OrdenEnvio, EnvioProducto


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='enviouser', password='testpass123', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password(password)
        user.save()
    return user


def crear_cliente(nombre='Cliente Envio Views'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Calle 5',
        activo=True,
    )


def crear_transportador():
    return Transportador.objects.create(
        nombre='Trans Views',
        telefono='3009876543',
        placa_vehiculo='DEF456',
        tipo_vehiculo='camioneta',
        activo=True,
    )


def crear_producto(cliente, nombre='Producto Envio Views'):
    return Producto.objects.create(
        cliente=cliente,
        nombre=nombre,
        descripcion='',
    )


def crear_ubicacion(codigo='EV-01', capacidad=500):
    bodega = Bodega.objects.create(
        nombre='Bodega Envio',
        ubicacion='Zona',
        capacidad=1000,
    )
    return Ubicacion.objects.create(bodega=bodega, codigo=codigo, capacidad=capacidad)


def crear_inventario(producto, ubicacion, cantidad=100):
    return Inventario.objects.create(
        producto=producto,
        ubicacion=ubicacion,
        cantidad=cantidad,
    )


def crear_orden(cliente, transportador=None, estado='pendiente'):
    return OrdenEnvio.objects.create(
        cliente=cliente,
        transportador=transportador,
        destino='Bogota',
        estado=estado,
    )


# -- Base con autenticacion JWT ---------------------------------------

class BaseAPITest(APITestCase):
    """Clase base con autenticacion JWT."""

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
        self.transportador = crear_transportador()
        self.ubicacion = crear_ubicacion()


# -- Tests: OrdenEnvioViewSet -----------------------------------------

class OrdenEnvioListCreateTest(BaseAPITest):
    """Pruebas de listado y creacion de ordenes."""

    BASE_URL = '/api/envios/ordenes/'

    def test_listar_ordenes_retorna_200(self):
        """GET retorna 200 con lista de ordenes."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_crear_orden_exitosa(self):
        """POST crea una orden correctamente."""
        data = {
            'cliente': str(self.cliente.id),
            'transportador': str(self.transportador.id),
            'destino': 'Medellin',
            'estado': 'pendiente',
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(OrdenEnvio.objects.filter(destino='Medellin').exists())

    def test_crear_orden_sin_transportador(self):
        """POST crea una orden sin transportador correctamente."""
        data = {
            'cliente': str(self.cliente.id),
            'destino': 'Cali',
            'estado': 'pendiente',
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_detalle_orden_retorna_200(self):
        """GET /{id}/ retorna el detalle de la orden."""
        orden = crear_orden(self.cliente)
        response = self.client.get(f'{self.BASE_URL}{orden.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('cliente_nombre', response.data)

    def test_respuesta_incluye_campos_calculados(self):
        """La respuesta incluye cliente_nombre y transportador_nombre."""
        orden = crear_orden(self.cliente, self.transportador)
        response = self.client.get(f'{self.BASE_URL}{orden.id}/')
        self.assertEqual(response.data['cliente_nombre'], self.cliente.nombre)
        self.assertEqual(response.data['transportador_nombre'], self.transportador.nombre)

    def test_respuesta_incluye_productos_anidados(self):
        """La respuesta incluye el array de productos."""
        orden = crear_orden(self.cliente)
        response = self.client.get(f'{self.BASE_URL}{orden.id}/')
        self.assertIn('productos', response.data)
        self.assertIsInstance(response.data['productos'], list)

    def test_filtrar_por_estado(self):
        """GET con ?estado= filtra ordenes por estado."""
        crear_orden(self.cliente, estado='pendiente')
        crear_orden(self.cliente, estado='entregado')
        response = self.client.get(f'{self.BASE_URL}?estado=pendiente')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for orden in resultados:
            self.assertEqual(orden['estado'], 'pendiente')

    def test_filtrar_por_cliente(self):
        """GET con ?cliente= filtra ordenes por cliente."""
        cliente2 = crear_cliente('Cliente 2 Envio')
        crear_orden(self.cliente)
        crear_orden(cliente2)
        response = self.client.get(f'{self.BASE_URL}?cliente={self.cliente.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for orden in resultados:
            self.assertEqual(orden['cliente_nombre'], self.cliente.nombre)

    def test_buscar_por_destino(self):
        """GET con ?search= busca ordenes por destino."""
        crear_orden(self.cliente)
        response = self.client.get(f'{self.BASE_URL}?search=Bogota')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_actualizar_orden(self):
        """PATCH actualiza los datos de la orden."""
        orden = crear_orden(self.cliente)
        response = self.client.patch(
            f'{self.BASE_URL}{orden.id}/',
            {'destino': 'Barranquilla'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        orden.refresh_from_db()
        self.assertEqual(orden.destino, 'Barranquilla')

    def test_eliminar_orden(self):
        """DELETE elimina la orden correctamente."""
        orden = crear_orden(self.cliente)
        response = self.client.delete(f'{self.BASE_URL}{orden.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(OrdenEnvio.objects.filter(id=orden.id).exists())

    def test_sin_autenticacion_retorna_401(self):
        """GET sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_orden_inexistente_retorna_404(self):
        """GET con UUID inexistente retorna 404."""
        response = self.client.get(f'{self.BASE_URL}{uuid.uuid4()}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class OrdenEnvioDespacharTest(BaseAPITest):
    """Pruebas del endpoint despachar."""

    def setUp(self):
        super().setUp()
        self.producto = crear_producto(self.cliente)
        self.inventario = crear_inventario(self.producto, self.ubicacion, cantidad=50)
        self.orden = crear_orden(self.cliente, self.transportador, estado='pendiente')
        self.ep = EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=10,
        )
        self.URL = f'/api/envios/ordenes/{self.orden.id}/despachar/'

    def test_despachar_orden_pendiente_exitoso(self):
        """POST despachar cambia el estado a en_transito."""
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.estado, OrdenEnvio.EN_TRANSITO)

    def test_despachar_reduce_stock(self):
        """POST despachar descuenta la cantidad del inventario."""
        stock_inicial = self.inventario.cantidad
        self.client.post(self.URL)
        self.inventario.refresh_from_db()
        self.assertEqual(self.inventario.cantidad, stock_inicial - 10)

    def test_despachar_crea_movimiento_salida(self):
        """POST despachar crea un movimiento de salida en inventario."""
        from inventario.models import MovimientoInventario
        self.client.post(self.URL)
        movimiento = MovimientoInventario.objects.filter(
            producto=self.producto,
            tipo=MovimientoInventario.SALIDA,
        ).first()
        self.assertIsNotNone(movimiento)
        self.assertEqual(movimiento.cantidad, 10)

    def test_despachar_asigna_fecha_despacho(self):
        """POST despachar registra la fecha de despacho."""
        self.client.post(self.URL)
        self.orden.refresh_from_db()
        self.assertIsNotNone(self.orden.fecha_despacho)

    def test_despachar_orden_en_transito_retorna_400(self):
        """No se puede despachar una orden que ya esta en transito."""
        self.orden.estado = OrdenEnvio.EN_TRANSITO
        self.orden.save()
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_despachar_orden_entregada_retorna_400(self):
        """No se puede despachar una orden ya entregada."""
        self.orden.estado = OrdenEnvio.ENTREGADO
        self.orden.save()
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_despachar_stock_insuficiente_retorna_400(self):
        """POST despachar falla si no hay stock suficiente."""
        self.inventario.cantidad = 5
        self.inventario.save()
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_despachar_stock_insuficiente_no_modifica_inventario(self):
        """Un despacho fallido no modifica el stock."""
        self.inventario.cantidad = 5
        self.inventario.save()
        self.client.post(self.URL)
        self.inventario.refresh_from_db()
        self.assertEqual(self.inventario.cantidad, 5)

    def test_despachar_orden_preparando_exitoso(self):
        """POST despachar tambien funciona con ordenes en estado preparando."""
        self.orden.estado = OrdenEnvio.PREPARANDO
        self.orden.save()
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# -- Tests: EnvioProductoViewSet --------------------------------------

class EnvioProductoViewSetTest(BaseAPITest):
    """Pruebas de la vista EnvioProductoViewSet."""

    def setUp(self):
        super().setUp()
        self.producto = crear_producto(self.cliente)
        self.orden = crear_orden(self.cliente, estado='pendiente')
        self.BASE_URL = f'/api/envios/ordenes/{self.orden.id}/productos/'

    def test_listar_productos_de_orden_retorna_200(self):
        """GET lista los productos de la orden correctamente."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_agregar_producto_a_orden(self):
        """POST agrega un producto a la orden."""
        data = {
            'orden_envio': str(self.orden.id),
            'producto': str(self.producto.id),
            'cantidad': 5,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.orden.productos.count(), 1)

    def test_eliminar_producto_de_orden_pendiente(self):
        """DELETE elimina un producto de una orden pendiente."""
        ep = EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=2,
        )
        url = f'{self.BASE_URL}{ep.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_eliminar_producto_orden_no_pendiente_retorna_400(self):
        """DELETE falla si la orden no esta en estado pendiente."""
        self.orden.estado = OrdenEnvio.EN_TRANSITO
        self.orden.save()
        ep = EnvioProducto.objects.create(
            orden_envio=self.orden,
            producto=self.producto,
            cantidad=2,
        )
        url = f'{self.BASE_URL}{ep.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)