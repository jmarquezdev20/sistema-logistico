"""
  PRUEBAS DE URLs — Módulo Auditoria
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
  
  Cubre:
    - Resolucion de rutas del modulo auditoria
    - Nombres de rutas (basename)
"""

import uuid
from django.test import TestCase
from django.urls import reverse, resolve

from auditoria import views


class AuditoriaURLTest(TestCase):
    """Pruebas de resolucion de URLs del modulo auditoria."""

    def test_url_lista_auditoria_resuelve(self):
        """La URL /api/auditoria/ resuelve correctamente."""
        resolved = resolve('/api/auditoria/')
        self.assertEqual(resolved.func.cls, views.AuditoriaViewSet)

    def test_url_detalle_auditoria_resuelve(self):
        """La URL /api/auditoria/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/auditoria/{pk}/')
        self.assertEqual(resolved.func.cls, views.AuditoriaViewSet)

    def test_basename_auditoria_list(self):
        """El nombre de ruta auditoria-list esta registrado."""
        url = reverse('auditoria-list')
        self.assertIn('/auditoria/', url)

    def test_basename_auditoria_detail(self):
        """El nombre de ruta auditoria-detail esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('auditoria-detail', kwargs={'pk': pk})
        self.assertIn('/auditoria/', url)
        self.assertIn(pk, url)

    def test_ruta_bajo_prefijo_auditoria(self):
        """La ruta del modulo esta bajo /api/auditoria/."""
        resolved = resolve('/api/auditoria/')
        self.assertIsNotNone(resolved)