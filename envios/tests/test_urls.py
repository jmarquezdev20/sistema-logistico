"""
  PRUEBAS DE URLs — Módulo Envios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez

  Cubre:
    - Resolucion de rutas estandar y anidadas
    - Endpoint personalizado despachar
    - Rutas de productos por orden
"""

import uuid
from django.test import TestCase
from django.urls import reverse, resolve

from envios import views


class EnvioURLTest(TestCase):
    """Pruebas de resolucion de URLs del modulo envios."""

    #Ordenes estandar
    def test_url_lista_ordenes_resuelve(self):
        """La URL /api/envios/ordenes/ resuelve correctamente."""
        resolved = resolve('/api/envios/ordenes/')
        self.assertEqual(resolved.func.cls, views.OrdenEnvioViewSet)

    def test_url_detalle_orden_resuelve(self):
        """La URL /api/envios/ordenes/{id}/ resuelve correctamente."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/envios/ordenes/{pk}/')
        self.assertEqual(resolved.func.cls, views.OrdenEnvioViewSet)

    def test_basename_orden_list(self):
        """El nombre de ruta orden-envio-list esta registrado."""
        url = reverse('orden-envio-list')
        self.assertIn('/ordenes/', url)

    def test_basename_orden_detail(self):
        """El nombre de ruta orden-envio-detail esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('orden-envio-detail', kwargs={'pk': pk})
        self.assertIn('/ordenes/', url)
        self.assertIn(pk, url)

    #Endpoint despachar 

    def test_url_despachar_resuelve(self):
        """La URL /api/envios/ordenes/{id}/despachar/ resuelve."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/envios/ordenes/{pk}/despachar/')
        self.assertEqual(resolved.func.cls, views.OrdenEnvioViewSet)

    def test_basename_despachar(self):
        """El nombre de ruta orden-envio-despachar esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('orden-envio-despachar', kwargs={'pk': pk})
        self.assertIn('despachar', url)

    #Productos por orden
    def test_url_productos_de_orden_lista_resuelve(self):
        """La URL /api/envios/ordenes/{id}/productos/ resuelve."""
        pk = str(uuid.uuid4())
        resolved = resolve(f'/api/envios/ordenes/{pk}/productos/')
        self.assertEqual(resolved.func.cls, views.EnvioProductoViewSet)

    def test_url_productos_de_orden_detalle_resuelve(self):
        """La URL /api/envios/ordenes/{id}/productos/{id}/ resuelve."""
        orden_pk = str(uuid.uuid4())
        prod_pk = str(uuid.uuid4())
        resolved = resolve(f'/api/envios/ordenes/{orden_pk}/productos/{prod_pk}/')
        self.assertEqual(resolved.func.cls, views.EnvioProductoViewSet)

    def test_nombre_ruta_productos_list(self):
        """El nombre de ruta orden-productos-list esta registrado."""
        pk = str(uuid.uuid4())
        url = reverse('orden-productos-list', kwargs={'orden_pk': pk})
        self.assertIn('productos', url)

    def test_nombre_ruta_productos_detail(self):
        """El nombre de ruta orden-productos-detail esta registrado."""
        orden_pk = str(uuid.uuid4())
        prod_pk = str(uuid.uuid4())
        url = reverse('orden-productos-detail', kwargs={'orden_pk': orden_pk, 'pk': prod_pk})
        self.assertIn('productos', url)

    #Estructura general

    def test_todas_las_rutas_bajo_prefijo_envios(self):
        """Todas las rutas del modulo estan bajo /api/envios/."""
        rutas = [
            '/api/envios/ordenes/',
        ]
        for ruta in rutas:
            resolved = resolve(ruta)
            self.assertIsNotNone(resolved, f'La ruta {ruta} no resuelve')