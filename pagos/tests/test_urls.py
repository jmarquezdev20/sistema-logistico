"""
  PRUEBAS DE URLs — Módulo Pagos
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
  
  Cubre:
    - Resolucion de rutas del modulo pagos
    - Nombres de rutas (basename)
"""

import uuid
from django.test import TestCase
from django.urls import reverse, resolve

from pagos import views


class PagoURLTest(TestCase):
    """Pruebas de resolucion de URLs del modulo pagos."""

    def test_url_lista_pagos_resuelve(self):
        """La URL /api/pagos/ resuelve correctamente."""
        resolved = resolve('/api/pagos/')
        self.assertEqual(resolved.func.cls, views.PagoViewSet)

    def test_url_detalle_pago_resuelve(self):
        """La URL /api/pagos/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/pagos/{pk}/')
        self.assertEqual(resolved.func.cls, views.PagoViewSet)

    def test_basename_pago_list(self):
        """El nombre de ruta pago-list esta registrado."""
        url = reverse('pago-list')
        self.assertIn('/pagos/', url)

    def test_basename_pago_detail(self):
        """El nombre de ruta pago-detail esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('pago-detail', kwargs={'pk': pk})
        self.assertIn('/pagos/', url)
        self.assertIn(pk, url)

    def test_ruta_bajo_prefijo_pagos(self):
        """La ruta del modulo esta bajo /api/pagos/."""
        resolved = resolve('/api/pagos/')
        self.assertIsNotNone(resolved)