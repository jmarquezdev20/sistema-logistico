"""
======================================================================
  PRUEBAS DE URLs — Módulo Inventario
  Sistema: BodegaXpress - Gestión Logística
  Autor:   Juan Manuel Márquez
======================================================================
  Cubre:
    ✔ Resolución correcta de todas las rutas del módulo
    ✔ Nombres de rutas (basename) para productos, inventarios
      y movimientos
    ✔ Métodos HTTP permitidos por endpoint
======================================================================
"""

import uuid
from django.test import TestCase
from django.urls import reverse, resolve

from inventario import views


class InventarioURLTest(TestCase):
    """Pruebas de resolución de URLs del módulo inventario."""

    # ── Productos ──────────────────────────────────────────────────

    def test_url_lista_productos_resuelve(self):
        """La URL /api/inventario/productos/ resuelve correctamente."""
        url = '/api/inventario/productos/'
        resolved = resolve(url)
        self.assertEqual(resolved.func.cls, views.ProductoViewSet)

    def test_url_detalle_producto_resuelve(self):
        """La URL /api/inventario/productos/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        url = f'/api/inventario/productos/{pk}/'
        resolved = resolve(url)
        self.assertEqual(resolved.func.cls, views.ProductoViewSet)

    def test_basename_producto_list(self):
        """El nombre de ruta 'producto-list' está registrado."""
        url = reverse('producto-list')
        self.assertIn('/productos/', url)

    def test_basename_producto_detail(self):
        """El nombre de ruta 'producto-detail' está registrado."""
        pk = str(uuid.uuid4())
        url = reverse('producto-detail', kwargs={'pk': pk})
        self.assertIn('/productos/', url)
        self.assertIn(pk, url)

    # ── Inventarios ────────────────────────────────────────────────

    def test_url_lista_inventarios_resuelve(self):
        """La URL /api/inventario/inventarios/ resuelve correctamente."""
        url = '/api/inventario/inventarios/'
        resolved = resolve(url)
        self.assertEqual(resolved.func.cls, views.InventarioViewSet)

    def test_url_detalle_inventario_resuelve(self):
        """La URL /api/inventario/inventarios/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        url = f'/api/inventario/inventarios/{pk}/'
        resolved = resolve(url)
        self.assertEqual(resolved.func.cls, views.InventarioViewSet)

    def test_basename_inventario_list(self):
        """El nombre de ruta 'inventario-list' está registrado."""
        url = reverse('inventario-list')
        self.assertIn('/inventarios/', url)

    def test_basename_inventario_detail(self):
        """El nombre de ruta 'inventario-detail' está registrado."""
        pk = str(uuid.uuid4())
        url = reverse('inventario-detail', kwargs={'pk': pk})
        self.assertIn('/inventarios/', url)
        self.assertIn(pk, url)

    # ── Movimientos ────────────────────────────────────────────────

    def test_url_lista_movimientos_resuelve(self):
        """La URL /api/inventario/movimientos/ resuelve correctamente."""
        url = '/api/inventario/movimientos/'
        resolved = resolve(url)
        self.assertEqual(resolved.func.cls, views.MovimientoInventarioViewSet)

    def test_url_detalle_movimiento_resuelve(self):
        """La URL /api/inventario/movimientos/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        url = f'/api/inventario/movimientos/{pk}/'
        resolved = resolve(url)
        self.assertEqual(resolved.func.cls, views.MovimientoInventarioViewSet)

    def test_basename_movimiento_list(self):
        """El nombre de ruta 'movimiento-list' está registrado."""
        url = reverse('movimiento-list')
        self.assertIn('/movimientos/', url)

    def test_basename_movimiento_detail(self):
        """El nombre de ruta 'movimiento-detail' está registrado."""
        pk = str(uuid.uuid4())
        url = reverse('movimiento-detail', kwargs={'pk': pk})
        self.assertIn('/movimientos/', url)
        self.assertIn(pk, url)

    # ── Estructura general ─────────────────────────────────────────

    def test_todas_las_rutas_bajo_prefijo_inventario(self):
        """Todas las rutas del módulo están bajo /api/inventario/."""
        rutas = [
            '/api/inventario/productos/',
            '/api/inventario/inventarios/',
            '/api/inventario/movimientos/',
        ]
        for ruta in rutas:
            resolved = resolve(ruta)
            self.assertIsNotNone(resolved, f'La ruta {ruta} no resuelve')