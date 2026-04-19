"""
  PRUEBAS DE URLs — Módulo Transportadores
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez

  Cubre:
    - Resolucion de rutas del modulo transportadores
    - Nombres de rutas (basename)
"""

import uuid
from django.test import TestCase
from django.urls import reverse, resolve

from transportadores import views


class TransportadorURLTest(TestCase):
    """Pruebas de resolucion de URLs del modulo transportadores."""

    def test_url_lista_transportadores_resuelve(self):
        """La URL /api/transportadores/ resuelve correctamente."""
        resolved = resolve('/api/transportadores/')
        self.assertEqual(resolved.func.cls, views.TransportadorViewSet)

    def test_url_detalle_transportador_resuelve(self):
        """La URL /api/transportadores/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/transportadores/{pk}/')
        self.assertEqual(resolved.func.cls, views.TransportadorViewSet)

    def test_basename_transportador_list(self):
        """El nombre de ruta transportador-list esta registrado."""
        url = reverse('transportador-list')
        self.assertIn('/transportadores/', url)

    def test_basename_transportador_detail(self):
        """El nombre de ruta transportador-detail esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('transportador-detail', kwargs={'pk': pk})
        self.assertIn('/transportadores/', url)
        self.assertIn(pk, url)

    def test_ruta_bajo_prefijo_transportadores(self):
        """La ruta del modulo esta bajo /api/transportadores/."""
        resolved = resolve('/api/transportadores/')
        self.assertIsNotNone(resolved)