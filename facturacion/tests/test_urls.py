"""
======================================================================
  PRUEBAS DE URLs — Módulo Facturacion
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    - Resolucion de todas las rutas del modulo
    - Nombres de rutas (basename) para facturas
    - Endpoints personalizados: generar, marcar_pagada, pdf
======================================================================
"""

import uuid
from django.test import TestCase
from django.urls import reverse, resolve

from facturacion import views


class FacturaURLTest(TestCase):
    """Pruebas de resolucion de URLs del modulo facturacion."""

    # -- Rutas estandar -----------------------------------------------

    def test_url_lista_facturas_resuelve(self):
        """La URL /api/facturacion/facturas/ resuelve correctamente."""
        resolved = resolve('/api/facturacion/facturas/')
        self.assertEqual(resolved.func.cls, views.FacturaViewSet)

    def test_url_detalle_factura_resuelve(self):
        """La URL /api/facturacion/facturas/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/facturacion/facturas/{pk}/')
        self.assertEqual(resolved.func.cls, views.FacturaViewSet)

    def test_basename_factura_list(self):
        """El nombre de ruta factura-list esta registrado."""
        url = reverse('factura-list')
        self.assertIn('/facturas/', url)

    def test_basename_factura_detail(self):
        """El nombre de ruta factura-detail esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('factura-detail', kwargs={'pk': pk})
        self.assertIn('/facturas/', url)
        self.assertIn(pk, url)

    # -- Endpoints personalizados -------------------------------------

    def test_url_generar_resuelve(self):
        """La URL /api/facturacion/facturas/generar/ resuelve correctamente."""
        resolved = resolve('/api/facturacion/facturas/generar/')
        self.assertEqual(resolved.func.cls, views.FacturaViewSet)

    def test_url_marcar_pagada_resuelve(self):
        """La URL /api/facturacion/facturas/{id}/marcar_pagada/ resuelve."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/facturacion/facturas/{pk}/marcar_pagada/')
        self.assertEqual(resolved.func.cls, views.FacturaViewSet)

    def test_url_pdf_resuelve(self):
        """La URL /api/facturacion/facturas/{id}/pdf/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/facturacion/facturas/{pk}/pdf/')
        self.assertEqual(resolved.func.cls, views.FacturaViewSet)

    def test_basename_generar(self):
        """El nombre de ruta factura-generar esta registrado."""
        url = reverse('factura-generar')
        self.assertIn('generar', url)

    def test_basename_marcar_pagada(self):
        """El nombre de ruta factura-marcar-pagada esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('factura-marcar-pagada', kwargs={'pk': pk})
        self.assertIn('marcar_pagada', url)

    def test_basename_descargar_pdf(self):
        """El nombre de ruta factura-descargar-pdf esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('factura-descargar-pdf', kwargs={'pk': pk})
        self.assertIn('pdf', url)

    # -- Estructura general -------------------------------------------

    def test_todas_las_rutas_bajo_prefijo_facturacion(self):
        """Todas las rutas del modulo estan bajo /api/facturacion/."""
        rutas = [
            '/api/facturacion/facturas/',
            '/api/facturacion/facturas/generar/',
        ]
        for ruta in rutas:
            resolved = resolve(ruta)
            self.assertIsNotNone(resolved, f'La ruta {ruta} no resuelve')