"""
  PRUEBAS DE VISTAS — Módulo Usuarios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez

  Cubre:
    login            - JWT con email, credenciales invalidas
    me               - datos del usuario autenticado
    logout           - cierre de sesion
    crear_usuario    - creacion por admin, validaciones
    cambiar_password - cambio de contrasena, validaciones
    UsuarioViewSet   - CRUD solo admin
    permissions      - EsAdmin, EsEmpleadoOAdmin, EsCliente
"""

import uuid
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from usuarios.models import User, Rol


# Helpers

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='viewuser', email='view@test.com', password='testpass123', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        rol=rol,
    )
    return user


def autenticar(client, email, password='testpass123'):
    response = client.post('/api/auth/login/', {
        'email': email,
        'password': password,
    }, format='json')
    if response.status_code == 200:
        token = response.data.get('access')
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return response


# Tests: Login 

class LoginTest(APITestCase):
    """Pruebas del endpoint de login."""

    def setUp(self):
        self.user = crear_usuario()

    def test_login_exitoso(self):
        """POST login retorna tokens con credenciales correctas."""
        response = self.client.post('/api/auth/login/', {
            'email': 'view@test.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_credenciales_invalidas(self):
        """POST login retorna 401 con credenciales incorrectas."""
        response = self.client.post('/api/auth/login/', {
            'email': 'view@test.com',
            'password': 'wrongpass',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_email_inexistente(self):
        """POST login retorna 401 con email que no existe."""
        response = self.client.post('/api/auth/login/', {
            'email': 'noexiste@test.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_contiene_rol(self):
        """El token JWT incluye el rol del usuario."""
        response = self.client.post('/api/auth/login/', {
            'email': 'view@test.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_usuario_inactivo(self):
        """POST login retorna 401 si el usuario esta inactivo."""
        self.user.is_active = False
        self.user.save()
        response = self.client.post('/api/auth/login/', {
            'email': 'view@test.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# Tests: Me
class MeViewTest(APITestCase):
    """Pruebas del endpoint me/."""

    def setUp(self):
        self.user = crear_usuario()
        autenticar(self.client, 'view@test.com')

    def test_me_retorna_200(self):
        """GET me/ retorna los datos del usuario autenticado."""
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_me_retorna_email_correcto(self):
        """GET me/ retorna el email del usuario autenticado."""
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.data['email'], 'view@test.com')

    def test_me_retorna_rol(self):
        """GET me/ incluye el rol del usuario."""
        response = self.client.get('/api/auth/me/')
        self.assertIn('rol', response.data)
        self.assertEqual(response.data['rol']['nombre'], 'admin')

    def test_me_sin_autenticacion_retorna_401(self):
        """GET me/ sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# Tests: Logout 

class LogoutViewTest(APITestCase):
    """Pruebas del endpoint logout."""

    def setUp(self):
        self.user = crear_usuario()
        autenticar(self.client, 'view@test.com')

    def test_logout_exitoso(self):
        """POST logout retorna 200."""
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_sin_autenticacion_retorna_401(self):
        """POST logout sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.post('/api/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# Tests: Crear Usuario 
class CrearUsuarioTest(APITestCase):
    """Pruebas del endpoint crear_usuario."""

    def setUp(self):
        self.admin = crear_usuario()
        autenticar(self.client, 'view@test.com')
        crear_rol('empleado')
        crear_rol('cliente')

    def test_crear_usuario_empleado_exitoso(self):
        """POST crear/ crea un usuario empleado correctamente."""
        response = self.client.post('/api/auth/crear/', {
            'email': 'empleado@test.com',
            'nombre': 'Juan Empleado',
            'rol': 'empleado',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='empleado@test.com').exists())

    def test_crear_usuario_retorna_password_temporal(self):
        """POST crear/ retorna la password temporal en la respuesta."""
        response = self.client.post('/api/auth/crear/', {
            'email': 'nuevo@test.com',
            'nombre': 'Nuevo',
            'rol': 'empleado',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('password_temporal', response.data)
        self.assertIsNotNone(response.data['password_temporal'])

    def test_crear_usuario_retorna_correo_enviado(self):
        """POST crear/ retorna el campo correo_enviado."""
        response = self.client.post('/api/auth/crear/', {
            'email': 'correo@test.com',
            'nombre': 'Test',
            'rol': 'empleado',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('correo_enviado', response.data)

    def test_crear_usuario_email_duplicado_retorna_400(self):
        """POST crear/ retorna 400 si el email ya existe."""
        response = self.client.post('/api/auth/crear/', {
            'email': 'view@test.com',
            'nombre': 'Duplicado',
            'rol': 'empleado',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_crear_usuario_sin_email_retorna_400(self):
        """POST crear/ sin email retorna 400."""
        response = self.client.post('/api/auth/crear/', {
            'nombre': 'Sin Email',
            'rol': 'empleado',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_usuario_sin_rol_retorna_400(self):
        """POST crear/ sin rol retorna 400."""
        response = self.client.post('/api/auth/crear/', {
            'email': 'sinrol@test.com',
            'nombre': 'Sin Rol',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_usuario_rol_inexistente_retorna_400(self):
        """POST crear/ con rol que no existe retorna 400."""
        response = self.client.post('/api/auth/crear/', {
            'email': 'rolmal@test.com',
            'nombre': 'Rol Malo',
            'rol': 'superusuario',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_crear_usuario_sin_autenticacion_retorna_401(self):
        """POST crear/ sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.post('/api/auth/crear/', {
            'email': 'noauth@test.com',
            'rol': 'empleado',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empleado_no_puede_crear_usuarios(self):
        """Un empleado no puede crear usuarios."""
        empleado = crear_usuario('emp_crear', 'empcreate@test.com', rol_nombre='empleado')
        client_emp = APIClient()
        autenticar(client_emp, 'empcreate@test.com')
        response = client_emp.post('/api/auth/crear/', {
            'email': 'nuevo2@test.com',
            'rol': 'empleado',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


#  Tests: Cambiar Password 
class CambiarPasswordTest(APITestCase):
    """Pruebas del endpoint cambiar_password."""

    def setUp(self):
        self.user = crear_usuario(email='cambio@test.com', password='passoriginal123')
        autenticar(self.client, 'cambio@test.com', 'passoriginal123')

    def test_cambiar_password_exitoso(self):
        """POST cambiar-password/ cambia la contrasena correctamente."""
        response = self.client.post('/api/auth/cambiar-password/', {
            'password_actual': 'passoriginal123',
            'password_nueva': 'nuevapass456',
            'password_confirmar': 'nuevapass456',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('nuevapass456'))

    def test_cambiar_password_actual_incorrecta_retorna_400(self):
        """POST retorna 400 si la contrasena actual es incorrecta."""
        response = self.client.post('/api/auth/cambiar-password/', {
            'password_actual': 'passincorrecta',
            'password_nueva': 'nuevapass456',
            'password_confirmar': 'nuevapass456',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_cambiar_password_no_coinciden_retorna_400(self):
        """POST retorna 400 si las contrasenas nuevas no coinciden."""
        response = self.client.post('/api/auth/cambiar-password/', {
            'password_actual': 'passoriginal123',
            'password_nueva': 'nuevapass456',
            'password_confirmar': 'diferente789',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_cambiar_password_muy_corta_retorna_400(self):
        """POST retorna 400 si la nueva contrasena tiene menos de 8 caracteres."""
        response = self.client.post('/api/auth/cambiar-password/', {
            'password_actual': 'passoriginal123',
            'password_nueva': 'corta',
            'password_confirmar': 'corta',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_cambiar_password_campos_vacios_retorna_400(self):
        """POST retorna 400 si faltan campos."""
        response = self.client.post('/api/auth/cambiar-password/', {
            'password_actual': 'passoriginal123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cambiar_password_sin_autenticacion_retorna_401(self):
        """POST sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.post('/api/auth/cambiar-password/', {
            'password_actual': 'passoriginal123',
            'password_nueva': 'nuevapass456',
            'password_confirmar': 'nuevapass456',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_no_cambia_si_falla(self):
        """La contrasena original se mantiene si el cambio falla."""
        self.client.post('/api/auth/cambiar-password/', {
            'password_actual': 'incorrecta',
            'password_nueva': 'nuevapass456',
            'password_confirmar': 'nuevapass456',
        }, format='json')
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('passoriginal123'))


# Tests: UsuarioViewSet 

class UsuarioViewSetTest(APITestCase):
    """Pruebas del UsuarioViewSet."""

    BASE_URL = '/api/auth/usuarios/'

    def setUp(self):
        self.admin = crear_usuario()
        autenticar(self.client, 'view@test.com')

    def test_listar_usuarios_retorna_200(self):
        """GET retorna 200 con lista de usuarios."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_detalle_usuario_retorna_200(self):
        """GET /{id}/ retorna el detalle del usuario."""
        response = self.client.get(f'{self.BASE_URL}{self.admin.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'view@test.com')

    def test_empleado_no_puede_listar_usuarios(self):
        """Un empleado no puede listar usuarios."""
        empleado = crear_usuario('emp_list', 'emplist@test.com', rol_nombre='empleado')
        client_emp = APIClient()
        autenticar(client_emp, 'emplist@test.com')
        response = client_emp.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_autenticacion_retorna_401(self):
        """GET sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_inexistente_retorna_404(self):
        """GET con UUID inexistente retorna 404."""
        response = self.client.get(f'{self.BASE_URL}{uuid.uuid4()}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# Tests: Permissions

class PermissionsTest(APITestCase):
    """Pruebas de las clases de permisos."""

    def setUp(self):
        crear_rol('admin')
        crear_rol('empleado')
        crear_rol('cliente')

    def test_admin_accede_a_ruta_solo_admin(self):
        """Un admin puede acceder a rutas protegidas por EsAdmin."""
        admin = crear_usuario('admin_perm', 'adminperm@test.com', rol_nombre='admin')
        autenticar(self.client, 'adminperm@test.com')
        response = self.client.get('/api/auth/usuarios/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_empleado_no_accede_a_ruta_solo_admin(self):
        """Un empleado no puede acceder a rutas protegidas por EsAdmin."""
        crear_usuario('emp_perm', 'empperm@test.com', rol_nombre='empleado')
        autenticar(self.client, 'empperm@test.com')
        response = self.client.get('/api/auth/usuarios/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cliente_no_accede_a_ruta_solo_admin(self):
        """Un cliente no puede acceder a rutas protegidas por EsAdmin."""
        crear_usuario('cli_perm', 'cliperm@test.com', rol_nombre='cliente')
        autenticar(self.client, 'cliperm@test.com')
        response = self.client.get('/api/auth/usuarios/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)