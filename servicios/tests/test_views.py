"""
======================================================================
  PRUEBAS DE VISTAS — Módulo Servicios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    CatalogoServicioViewSet  - CRUD, filtros, permisos
    ServicioPrestadoViewSet  - crear, listar, filtros por cliente,
                               facturado, fecha, calculo automatico
======================================================================
"""

import uuid
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from usuarios.models import User, Rol
from clientes.models import Cliente
from servicios.models import CatalogoServicio, ServicioPrestado


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='servuser', password='testpass123', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password(password)
        user.save()
    return user


def crear_cliente(nombre='Cliente Serv Views'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Calle 5',
        activo=True,
    )


def crear_catalogo(nombre='Almacenamiento Views', unidad='por_dia', tarifa=Decimal('50000')):
    return CatalogoServicio.objects.create(
        nombre=nombre,
        descripcion='',
        tarifa=tarifa,
        unidad=unidad,
        activo=True,
    )


def crear_servicio(cliente, catalogo, facturado=False, fecha=None):
    return ServicioPrestado.objects.create(
        cliente=cliente,
        catalogo_servicio=catalogo,
        cantidad=Decimal('1'),
        valor_unitario=catalogo.tarifa,
        valor_total=catalogo.tarifa,
        fecha=fecha or timezone.now().date(),
        facturado=facturado,
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
        self.cliente = crear_cliente()
        self.catalogo = crear_catalogo()


# -- Tests: CatalogoServicioViewSet -----------------------------------

class CatalogoServicioViewSetTest(BaseAPITest):
    """Pruebas de la vista CatalogoServicioViewSet."""

    BASE_URL = '/api/servicios/catalogo/'

    def test_listar_catalogos_retorna_200(self):
        """GET retorna 200 con lista de catalogos."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_crear_catalogo_exitoso(self):
        """POST crea un catalogo correctamente."""
        data = {
            'nombre': 'Nuevo Servicio',
            'descripcion': 'Test',
            'tarifa': '25000',
            'unidad': 'por_envio',
            'activo': True,
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CatalogoServicio.objects.filter(nombre='Nuevo Servicio').exists())

    def test_detalle_catalogo_retorna_200(self):
        """GET /{id}/ retorna el detalle del catalogo."""
        response = self.client.get(f'{self.BASE_URL}{self.catalogo.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('unidad_display', response.data)

    def test_actualizar_catalogo(self):
        """PATCH actualiza los datos del catalogo."""
        response = self.client.patch(
            f'{self.BASE_URL}{self.catalogo.id}/',
            {'tarifa': '75000'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.catalogo.refresh_from_db()
        self.assertEqual(self.catalogo.tarifa, Decimal('75000'))

    def test_eliminar_catalogo(self):
        """DELETE elimina el catalogo correctamente."""
        response = self.client.delete(f'{self.BASE_URL}{self.catalogo.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CatalogoServicio.objects.filter(id=self.catalogo.id).exists())

    def test_sin_autenticacion_retorna_401(self):
        """GET sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_catalogo_inexistente_retorna_404(self):
        """GET con UUID inexistente retorna 404."""
        response = self.client.get(f'{self.BASE_URL}{uuid.uuid4()}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_respuesta_incluye_unidad_display(self):
        """La respuesta incluye el campo unidad_display."""
        response = self.client.get(f'{self.BASE_URL}{self.catalogo.id}/')
        self.assertIn('unidad_display', response.data)


# -- Tests: ServicioPrestadoViewSet -----------------------------------

class ServicioPrestadoViewSetTest(BaseAPITest):
    """Pruebas de la vista ServicioPrestadoViewSet."""

    BASE_URL = '/api/servicios/prestados/'

    def test_listar_servicios_retorna_200(self):
        """GET retorna 200 con lista de servicios prestados."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_crear_servicio_exitoso(self):
        """POST crea un servicio prestado correctamente."""
        data = {
            'cliente': str(self.cliente.id),
            'catalogo_servicio': str(self.catalogo.id),
            'cantidad': '2',
            'valor_unitario': '50000',
            'fecha': timezone.now().date().isoformat(),
            'observacion': 'Prueba',
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_crear_servicio_calcula_valor_unitario_del_catalogo(self):
        """POST usa la tarifa del catalogo si no se envia valor_unitario."""
        data = {
            'cliente': str(self.cliente.id),
            'catalogo_servicio': str(self.catalogo.id),
            'cantidad': '1',
            'fecha': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Decimal(response.data['valor_unitario']),
            self.catalogo.tarifa
        )

    def test_crear_servicio_calcula_valor_total(self):
        """POST calcula automaticamente el valor_total."""
        data = {
            'cliente': str(self.cliente.id),
            'catalogo_servicio': str(self.catalogo.id),
            'cantidad': '3',
            'valor_unitario': '50000',
            'fecha': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Decimal(response.data['valor_total']),
            Decimal('150000')
        )

    def test_crear_servicio_catalogo_inexistente_retorna_400(self):
        """POST con catalogo_servicio inexistente retorna 400."""
        data = {
            'cliente': str(self.cliente.id),
            'catalogo_servicio': str(uuid.uuid4()),
            'cantidad': '1',
            'fecha': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
        ])

    def test_filtrar_por_cliente(self):
        """GET con ?cliente= retorna solo servicios de ese cliente."""
        cliente2 = crear_cliente('Cliente Serv 2')
        crear_servicio(self.cliente, self.catalogo)
        crear_servicio(cliente2, self.catalogo)
        response = self.client.get(f'{self.BASE_URL}?cliente={self.cliente.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for serv in resultados:
            self.assertEqual(serv['cliente_nombre'], self.cliente.nombre)

    def test_filtrar_por_facturado_false(self):
        """GET con ?facturado=false retorna solo servicios no facturados."""
        crear_servicio(self.cliente, self.catalogo, facturado=False)
        crear_servicio(self.cliente, self.catalogo, facturado=True)
        response = self.client.get(f'{self.BASE_URL}?facturado=false')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for serv in resultados:
            self.assertFalse(serv['facturado'])

    def test_filtrar_por_facturado_true(self):
        """GET con ?facturado=true retorna solo servicios facturados."""
        crear_servicio(self.cliente, self.catalogo, facturado=True)
        response = self.client.get(f'{self.BASE_URL}?facturado=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for serv in resultados:
            self.assertTrue(serv['facturado'])

    def test_filtrar_por_fecha_desde(self):
        """GET con ?fecha_desde= filtra servicios desde esa fecha."""
        hoy = timezone.now().date()
        response = self.client.get(f'{self.BASE_URL}?fecha_desde={hoy.isoformat()}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filtrar_por_fecha_hasta(self):
        """GET con ?fecha_hasta= filtra servicios hasta esa fecha."""
        hoy = timezone.now().date()
        response = self.client.get(f'{self.BASE_URL}?fecha_hasta={hoy.isoformat()}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_respuesta_incluye_campos_calculados(self):
        """La respuesta incluye cliente_nombre, catalogo_nombre y unidad."""
        crear_servicio(self.cliente, self.catalogo)
        response = self.client.get(self.BASE_URL)
        resultados = response.data.get('results', response.data)
        if resultados:
            serv = resultados[0]
            self.assertIn('cliente_nombre', serv)
            self.assertIn('catalogo_nombre', serv)
            self.assertIn('unidad', serv)

    def test_sin_autenticacion_retorna_401(self):
        """GET sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)