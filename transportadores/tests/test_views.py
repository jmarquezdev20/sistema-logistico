"""
======================================================================
  PRUEBAS DE VISTAS — Módulo Transportadores
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    TransportadorViewSet - CRUD completo, busqueda, filtros,
                           autenticacion, casos de error
======================================================================
"""

import uuid
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from usuarios.models import User, Rol
from transportadores.models import Transportador


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='transuser', password='testpass123', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password(password)
        user.save()
    return user


def crear_transportador(nombre='Trans Views', placa='VIE001', tipo='camion', activo=True):
    return Transportador.objects.create(
        nombre=nombre,
        telefono='3001234567',
        placa_vehiculo=placa,
        tipo_vehiculo=tipo,
        activo=activo,
    )


# -- Base con autenticacion JWT ---------------------------------------

class BaseAPITest(APITestCase):
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


# -- Tests: TransportadorViewSet --------------------------------------

class TransportadorListCreateTest(BaseAPITest):
    """Pruebas de listado y creacion de transportadores."""

    BASE_URL = '/api/transportadores/'

    def test_listar_transportadores_retorna_200(self):
        """GET retorna 200 con lista de transportadores."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_crear_transportador_exitoso(self):
        """POST crea un transportador correctamente."""
        data = {
            'nombre': 'Nuevo Trans',
            'telefono': '3009876543',
            'placa_vehiculo': 'NUE001',
            'tipo_vehiculo': 'furgon',
            'activo': True,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Transportador.objects.filter(placa_vehiculo='NUE001').exists())

    def test_crear_todos_los_tipos_de_vehiculo(self):
        """POST acepta todos los tipos de vehiculo validos."""
        tipos = ['moto', 'camioneta', 'camion', 'furgon']
        for i, tipo in enumerate(tipos):
            data = {
                'nombre': f'Trans {tipo}',
                'telefono': '3001111111',
                'placa_vehiculo': f'TIP{i:03d}',
                'tipo_vehiculo': tipo,
            }
            response = self.client.post(self.BASE_URL, data, format='json')
            self.assertEqual(
                response.status_code, status.HTTP_201_CREATED,
                f'Fallo con tipo {tipo}: {response.data}'
            )

    def test_crear_tipo_invalido_retorna_400(self):
        """POST con tipo de vehiculo invalido retorna 400."""
        data = {
            'nombre': 'Trans Invalido',
            'telefono': '3001111111',
            'placa_vehiculo': 'INV001',
            'tipo_vehiculo': 'bicicleta',
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sin_autenticacion_retorna_401(self):
        """GET sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_buscar_por_nombre(self):
        """GET con ?search= busca transportadores por nombre."""
        crear_transportador(nombre='Carlos Ramirez', placa='CAR001')
        response = self.client.get(f'{self.BASE_URL}?search=Carlos')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        self.assertTrue(any('Carlos' in t['nombre'] for t in resultados))

    def test_buscar_por_placa(self):
        """GET con ?search= busca transportadores por placa."""
        crear_transportador(nombre='Trans Placa', placa='BUS999')
        response = self.client.get(f'{self.BASE_URL}?search=BUS999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        self.assertTrue(any(t['placa_vehiculo'] == 'BUS999' for t in resultados))

    def test_lista_ordenada_por_nombre(self):
        """GET retorna transportadores ordenados alfabeticamente."""
        crear_transportador(nombre='Zeta Trans', placa='ZET001')
        crear_transportador(nombre='Alfa Trans', placa='ALF001')
        response = self.client.get(self.BASE_URL)
        resultados = response.data.get('results', response.data)
        nombres = [t['nombre'] for t in resultados]
        self.assertEqual(nombres, sorted(nombres))


class TransportadorDetailTest(BaseAPITest):
    """Pruebas de detalle, actualizacion y eliminacion."""

    BASE_URL = '/api/transportadores/'

    def setUp(self):
        super().setUp()
        self.trans = crear_transportador()

    def test_detalle_transportador_retorna_200(self):
        """GET /{id}/ retorna el detalle del transportador."""
        response = self.client.get(f'{self.BASE_URL}{self.trans.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], self.trans.nombre)

    def test_actualizar_nombre(self):
        """PATCH actualiza el nombre correctamente."""
        response = self.client.patch(
            f'{self.BASE_URL}{self.trans.id}/',
            {'nombre': 'Nombre Actualizado'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.trans.refresh_from_db()
        self.assertEqual(self.trans.nombre, 'Nombre Actualizado')

    def test_desactivar_transportador(self):
        """PATCH puede desactivar un transportador."""
        response = self.client.patch(
            f'{self.BASE_URL}{self.trans.id}/',
            {'activo': False},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.trans.refresh_from_db()
        self.assertFalse(self.trans.activo)

    def test_actualizar_placa(self):
        """PUT actualiza la placa del vehiculo."""
        response = self.client.put(
            f'{self.BASE_URL}{self.trans.id}/',
            {
                'nombre': self.trans.nombre,
                'telefono': self.trans.telefono,
                'placa_vehiculo': 'NEW999',
                'tipo_vehiculo': self.trans.tipo_vehiculo,
                'activo': True,
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.trans.refresh_from_db()
        self.assertEqual(self.trans.placa_vehiculo, 'NEW999')

    def test_eliminar_transportador(self):
        """DELETE elimina el transportador correctamente."""
        response = self.client.delete(f'{self.BASE_URL}{self.trans.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Transportador.objects.filter(id=self.trans.id).exists())

    def test_transportador_inexistente_retorna_404(self):
        """GET con UUID inexistente retorna 404."""
        response = self.client.get(f'{self.BASE_URL}{uuid.uuid4()}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_respuesta_incluye_fecha_creacion(self):
        """La respuesta incluye el campo fecha_creacion."""
        response = self.client.get(f'{self.BASE_URL}{self.trans.id}/')
        self.assertIn('fecha_creacion', response.data)
        self.assertIsNotNone(response.data['fecha_creacion'])