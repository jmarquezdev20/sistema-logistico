"""
  PRUEBAS DE VISTAS — Módulo Pagos
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez

  Cubre:
    PagoViewSet - listar, crear, filtros, permisos,
                  validacion factura pagada, metodos no permitidos
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from usuarios.models import User, Rol
from clientes.models import Cliente
from facturacion.models import Factura
from pagos.models import Pago


# Helpers

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='viewpagouser', password='testpass123', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password(password)
        user.save()
    return user


def crear_cliente(nombre='Cliente Pago Views'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Calle 10',
        activo=True,
    )


def crear_factura(cliente, estado='pendiente'):
    return Factura.objects.create(
        cliente=cliente,
        fecha_vencimiento=timezone.now().date(),
        subtotal=Decimal('100000'),
        impuestos=Decimal('19000'),
        total=Decimal('119000'),
        estado=estado,
    )


def crear_pago(cliente, factura=None, metodo='transferencia'):
    user = crear_usuario('reg_pago_user')
    return Pago.objects.create(
        cliente=cliente,
        factura=factura,
        monto=Decimal('119000'),
        metodo_pago=metodo,
        referencia='REF-001',
        fecha_pago=timezone.now().date(),
        registrado_por=user,
    )


# Base con autenticacion JWT 

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


# Tests: PagoViewSet

class PagoListTest(BaseAPITest):
    """Pruebas de listado de pagos."""

    BASE_URL = '/api/pagos/'

    def setUp(self):
        super().setUp()
        self.factura = crear_factura(self.cliente)

    def test_listar_pagos_retorna_200(self):
        """GET retorna 200 con lista de pagos."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_respuesta_incluye_cliente_nombre(self):
        """La respuesta incluye el campo cliente_nombre."""
        crear_pago(self.cliente, self.factura)
        response = self.client.get(self.BASE_URL)
        resultados = response.data.get('results', response.data)
        if resultados:
            self.assertIn('cliente_nombre', resultados[0])

    def test_respuesta_incluye_factura_numero(self):
        """La respuesta incluye el campo factura_numero."""
        crear_pago(self.cliente, self.factura)
        response = self.client.get(self.BASE_URL)
        resultados = response.data.get('results', response.data)
        if resultados:
            self.assertIn('factura_numero', resultados[0])

    def test_filtrar_por_cliente(self):
        """GET con ?cliente= retorna solo pagos de ese cliente."""
        cliente2 = crear_cliente('Cliente Pago 2')
        factura2 = crear_factura(cliente2)
        crear_pago(self.cliente, self.factura)
        crear_pago(cliente2, factura2)
        response = self.client.get(f'{self.BASE_URL}?cliente={self.cliente.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for pago in resultados:
            self.assertEqual(pago['cliente_nombre'], self.cliente.nombre)

    def test_sin_autenticacion_retorna_401(self):
        """GET sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_detalle_pago_retorna_200(self):
        """GET /{id}/ retorna el detalle del pago."""
        pago = crear_pago(self.cliente, self.factura)
        response = self.client.get(f'{self.BASE_URL}{pago.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pago_inexistente_retorna_404(self):
        """GET con UUID inexistente retorna 404."""
        response = self.client.get(f'{self.BASE_URL}{uuid.uuid4()}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PagoCreateTest(BaseAPITest):
    """Pruebas de creacion de pagos."""

    BASE_URL = '/api/pagos/'

    def setUp(self):
        super().setUp()
        self.factura = crear_factura(self.cliente)

    def test_crear_pago_exitoso(self):
        """POST crea un pago correctamente."""
        data = {
            'cliente': str(self.cliente.id),
            'factura': str(self.factura.id),
            'monto': '119000',
            'metodo_pago': 'transferencia',
            'referencia': 'TRF-001',
            'fecha_pago': timezone.now().date().isoformat(),
            'registrado_por': str(self.user.id),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Pago.objects.filter(referencia='TRF-001').exists())

    def test_crear_pago_marca_factura_como_pagada(self):
        """POST crear pago cambia el estado de la factura a pagada."""
        data = {
            'cliente': str(self.cliente.id),
            'factura': str(self.factura.id),
            'monto': '119000',
            'metodo_pago': 'efectivo',
            'fecha_pago': timezone.now().date().isoformat(),
            'registrado_por': str(self.user.id),
        }
        self.client.post(self.BASE_URL, data, format='json')
        self.factura.refresh_from_db()
        self.assertEqual(self.factura.estado, 'pagada')

    def test_crear_pago_factura_inexistente_retorna_400(self):
        """POST con ID de factura inexistente retorna 400."""
        data = {
            'cliente': str(self.cliente.id),
            'factura': str(uuid.uuid4()),
            'monto': '119000',
            'metodo_pago': 'efectivo',
            'fecha_pago': timezone.now().date().isoformat(),
            'registrado_por': str(self.user.id),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_crear_pago_factura_ya_pagada_retorna_400(self):
        """POST con factura ya pagada retorna 400."""
        factura_pagada = crear_factura(self.cliente, estado='pagada')
        data = {
            'cliente': str(self.cliente.id),
            'factura': str(factura_pagada.id),
            'monto': '119000',
            'metodo_pago': 'cheque',
            'fecha_pago': timezone.now().date().isoformat(),
            'registrado_por': str(self.user.id),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_crear_pago_retorna_correo_enviado(self):
        """POST retorna el campo correo_enviado en la respuesta."""
        data = {
            'cliente': str(self.cliente.id),
            'factura': str(self.factura.id),
            'monto': '119000',
            'metodo_pago': 'tarjeta',
            'fecha_pago': timezone.now().date().isoformat(),
            'registrado_por': str(self.user.id),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('correo_enviado', response.data)

    def test_crear_pago_todos_los_metodos(self):
        """POST acepta todos los metodos de pago validos."""
        metodos = ['efectivo', 'transferencia', 'cheque', 'tarjeta']
        for i, metodo in enumerate(metodos):
            factura = crear_factura(self.cliente)
            data = {
                'cliente': str(self.cliente.id),
                'factura': str(factura.id),
                'monto': '119000',
                'metodo_pago': metodo,
                'fecha_pago': timezone.now().date().isoformat(),
                'registrado_por': str(self.user.id),
            }
            response = self.client.post(self.BASE_URL, data, format='json')
            self.assertEqual(
                response.status_code, status.HTTP_201_CREATED,
                f'Fallo con metodo {metodo}: {response.data}'
            )


class PagoMetodosNoPermitidosTest(BaseAPITest):
    """Pruebas de metodos HTTP no permitidos."""

    BASE_URL = '/api/pagos/'

    def setUp(self):
        super().setUp()
        self.factura = crear_factura(self.cliente)
        self.pago = crear_pago(self.cliente, self.factura)

    def test_no_permite_put(self):
        """PUT retorna 405 Method Not Allowed."""
        response = self.client.put(
            f'{self.BASE_URL}{self.pago.id}/',
            {'monto': '999'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_no_permite_patch(self):
        """PATCH retorna 405 Method Not Allowed."""
        response = self.client.patch(
            f'{self.BASE_URL}{self.pago.id}/',
            {'monto': '999'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_no_permite_delete(self):
        """DELETE retorna 405 Method Not Allowed."""
        response = self.client.delete(f'{self.BASE_URL}{self.pago.id}/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)