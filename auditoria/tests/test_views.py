"""
  PRUEBAS DE VISTAS — Módulo Auditoria
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
  
  Cubre:
    AuditoriaViewSet - listar, filtros por modulo/usuario/fecha,
                       busqueda, permisos solo admin, readonly
"""

import uuid
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from usuarios.models import User, Rol
from auditoria.models import RegistroAuditoria


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='audit_view_user', password='testpass123', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password(password)
        user.save()
    return user


def crear_registro(usuario=None, modulo='inventario', accion='Accion test'):
    return RegistroAuditoria.objects.create(
        usuario=usuario,
        modulo=modulo,
        accion=accion,
        detalle='Detalle test',
    )


# Base con autenticacion JWT 

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


# Tests: AuditoriaViewSet 

class AuditoriaListTest(BaseAPITest):
    """Pruebas de listado de registros de auditoria."""

    BASE_URL = '/api/auditoria/'

    def setUp(self):
        super().setUp()
        crear_registro(self.user, modulo='inventario', accion='Creo producto')
        crear_registro(self.user, modulo='envios', accion='Despachó orden')

    def test_listar_auditoria_retorna_200(self):
        """GET retorna 200 con lista de registros."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_respuesta_incluye_campos_calculados(self):
        """La respuesta incluye usuario_nombre, usuario_email y modulo_label."""
        response = self.client.get(self.BASE_URL)
        resultados = response.data.get('results', response.data)
        if resultados:
            registro = resultados[0]
            self.assertIn('usuario_nombre', registro)
            self.assertIn('usuario_email', registro)
            self.assertIn('modulo_label', registro)

    def test_sin_autenticacion_retorna_401(self):
        """GET sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empleado_no_puede_acceder(self):
        """Un empleado no puede acceder al modulo de auditoria."""
        empleado = crear_usuario('emp_audit', rol_nombre='empleado')
        response_login = self.client.post('/api/auth/login/', {
            'email': empleado.email,
            'password': 'testpass123',
        }, format='json')
        if response_login.status_code == 200:
            token = response_login.data.get('access')
            client_emp = APIClient()
            client_emp.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
            response = client_emp.get(self.BASE_URL)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_filtrar_por_modulo(self):
        """GET con ?modulo= retorna solo registros de ese modulo."""
        response = self.client.get(f'{self.BASE_URL}?modulo=inventario')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for reg in resultados:
            self.assertEqual(reg['modulo'], 'inventario')

    def test_filtrar_por_usuario(self):
        """GET con ?usuario= retorna solo registros de ese usuario."""
        response = self.client.get(f'{self.BASE_URL}?usuario={self.user.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for reg in resultados:
            self.assertEqual(reg['usuario'], self.user.id)

    def test_filtrar_por_fecha_desde(self):
        """GET con ?fecha_desde= filtra registros desde esa fecha."""
        hoy = timezone.now().date()
        response = self.client.get(f'{self.BASE_URL}?fecha_desde={hoy.isoformat()}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filtrar_por_fecha_hasta(self):
        """GET con ?fecha_hasta= filtra registros hasta esa fecha."""
        hoy = timezone.now().date()
        response = self.client.get(f'{self.BASE_URL}?fecha_hasta={hoy.isoformat()}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_buscar_por_accion(self):
        """GET con ?search= busca registros por accion."""
        response = self.client.get(f'{self.BASE_URL}?search=Creo')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        self.assertTrue(any('Creo' in r['accion'] for r in resultados))

    def test_buscar_por_modulo(self):
        """GET con ?search= busca registros por modulo."""
        response = self.client.get(f'{self.BASE_URL}?search=inventario')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_no_permite_post(self):
        """POST retorna 405 — auditoria es solo lectura."""
        response = self.client.post(self.BASE_URL, {
            'modulo': 'inventario',
            'accion': 'Test',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_no_permite_delete(self):
        """DELETE retorna 405 — auditoria es solo lectura."""
        registro = crear_registro(self.user)
        response = self.client.delete(f'{self.BASE_URL}{registro.id}/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_no_permite_put(self):
        """PUT retorna 405 — auditoria es solo lectura."""
        registro = crear_registro(self.user)
        response = self.client.put(
            f'{self.BASE_URL}{registro.id}/',
            {'accion': 'Modificado'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_detalle_registro_retorna_200(self):
        """GET /{id}/ retorna el detalle del registro."""
        registro = crear_registro(self.user)
        response = self.client.get(f'{self.BASE_URL}{registro.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('accion', response.data)

    def test_registro_inexistente_retorna_404(self):
        """GET con UUID inexistente retorna 404."""
        response = self.client.get(f'{self.BASE_URL}{uuid.uuid4()}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)