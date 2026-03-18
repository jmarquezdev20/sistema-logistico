"""
======================================================================
  PRUEBAS DE URLs — Módulo Servicios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    - Resolucion de rutas de catalogo y servicios prestados
    - Nombres de rutas (basename)
======================================================================
"""

import uuid
from django.test import TestCase
from django.urls import reverse, resolve

from servicios import views


class ServiciosURLTest(TestCase):
    """Pruebas de resolucion de URLs del modulo servicios."""

    # -- Catalogo -----------------------------------------------------

    def test_url_lista_catalogo_resuelve(self):
        """La URL /api/servicios/catalogo/ resuelve correctamente."""
        resolved = resolve('/api/servicios/catalogo/')
        self.assertEqual(resolved.func.cls, views.CatalogoServicioViewSet)

    def test_url_detalle_catalogo_resuelve(self):
        """La URL /api/servicios/catalogo/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/servicios/catalogo/{pk}/')
        self.assertEqual(resolved.func.cls, views.CatalogoServicioViewSet)

    def test_basename_catalogo_list(self):
        """El nombre de ruta catalogo-list esta registrado."""
        url = reverse('catalogo-list')
        self.assertIn('/catalogo/', url)

    def test_basename_catalogo_detail(self):
        """El nombre de ruta catalogo-detail esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('catalogo-detail', kwargs={'pk': pk})
        self.assertIn('/catalogo/', url)
        self.assertIn(pk, url)

    # -- Servicios Prestados ------------------------------------------

    def test_url_lista_prestados_resuelve(self):
        """La URL /api/servicios/prestados/ resuelve correctamente."""
        resolved = resolve('/api/servicios/prestados/')
        self.assertEqual(resolved.func.cls, views.ServicioPrestadoViewSet)

    def test_url_detalle_prestado_resuelve(self):
        """La URL /api/servicios/prestados/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/servicios/prestados/{pk}/')
        self.assertEqual(resolved.func.cls, views.ServicioPrestadoViewSet)

    def test_basename_prestados_list(self):
        """El nombre de ruta prestados-list esta registrado."""
        url = reverse('prestados-list')
        self.assertIn('/prestados/', url)

    def test_basename_prestados_detail(self):
        """El nombre de ruta prestados-detail esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('prestados-detail', kwargs={'pk': pk})
        self.assertIn('/prestados/', url)
        self.assertIn(pk, url)

    # -- Estructura general -------------------------------------------

    def test_todas_las_rutas_bajo_prefijo_servicios(self):
        """Todas las rutas del modulo estan bajo /api/servicios/."""
        rutas = [
            '/api/servicios/catalogo/',
            '/api/servicios/prestados/',
        ]
        for ruta in rutas:
            resolved = resolve(ruta)
            self.assertIsNotNone(resolved, f'La ruta {ruta} no resuelve')