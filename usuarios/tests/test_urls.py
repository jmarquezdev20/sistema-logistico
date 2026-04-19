"""
  PRUEBAS DE URLs — Módulo Usuarios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez

  Cubre:
    - Resolucion de todas las rutas del modulo usuarios
    - login, refresh, logout, me, crear, cambiar-password
    - UsuarioViewSet
"""

import uuid
from django.test import TestCase
from django.urls import reverse, resolve

from usuarios import views
from rest_framework_simplejwt.views import TokenRefreshView


class UsuarioURLTest(TestCase):
    """Pruebas de resolucion de URLs del modulo usuarios."""

    def test_url_login_resuelve(self):
        """La URL /api/auth/login/ resuelve correctamente."""
        resolved = resolve('/api/auth/login/')
        self.assertEqual(resolved.func.view_class, views.CustomTokenObtainPairView)

    def test_url_refresh_resuelve(self):
        """La URL /api/auth/refresh/ resuelve correctamente."""
        resolved = resolve('/api/auth/refresh/')
        self.assertEqual(resolved.func.view_class, TokenRefreshView)

    def test_url_logout_resuelve(self):
        """La URL /api/auth/logout/ resuelve correctamente."""
        resolved = resolve('/api/auth/logout/')
        self.assertIsNotNone(resolved)

    def test_url_me_resuelve(self):
        """La URL /api/auth/me/ resuelve correctamente."""
        resolved = resolve('/api/auth/me/')
        self.assertIsNotNone(resolved)

    def test_url_crear_resuelve(self):
        """La URL /api/auth/crear/ resuelve correctamente."""
        resolved = resolve('/api/auth/crear/')
        self.assertIsNotNone(resolved)

    def test_url_cambiar_password_resuelve(self):
        """La URL /api/auth/cambiar-password/ resuelve correctamente."""
        resolved = resolve('/api/auth/cambiar-password/')
        self.assertIsNotNone(resolved)

    def test_url_lista_usuarios_resuelve(self):
        """La URL /api/auth/usuarios/ resuelve correctamente."""
        resolved = resolve('/api/auth/usuarios/')
        self.assertEqual(resolved.func.cls, views.UsuarioViewSet)

    def test_url_detalle_usuario_resuelve(self):
        """La URL /api/auth/usuarios/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/auth/usuarios/{pk}/')
        self.assertEqual(resolved.func.cls, views.UsuarioViewSet)

    def test_basename_login(self):
        """El nombre de ruta token_obtain_pair esta registrado."""
        url = reverse('token_obtain_pair')
        self.assertIn('/login/', url)

    def test_basename_refresh(self):
        """El nombre de ruta token_refresh esta registrado."""
        url = reverse('token_refresh')
        self.assertIn('/refresh/', url)

    def test_basename_logout(self):
        """El nombre de ruta logout esta registrado."""
        url = reverse('logout')
        self.assertIn('/logout/', url)

    def test_basename_me(self):
        """El nombre de ruta me esta registrado."""
        url = reverse('me')
        self.assertIn('/me/', url)

    def test_basename_crear(self):
        """El nombre de ruta crear-usuario esta registrado."""
        url = reverse('crear-usuario')
        self.assertIn('/crear/', url)

    def test_basename_cambiar_password(self):
        """El nombre de ruta cambiar-password esta registrado."""
        url = reverse('cambiar-password')
        self.assertIn('/cambiar-password/', url)

    def test_basename_usuario_list(self):
        """El nombre de ruta usuario-list esta registrado."""
        url = reverse('usuario-list')
        self.assertIn('/usuarios/', url)

    def test_basename_usuario_detail(self):
        """El nombre de ruta usuario-detail esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('usuario-detail', kwargs={'pk': pk})
        self.assertIn('/usuarios/', url)
        self.assertIn(pk, url)