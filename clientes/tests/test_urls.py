from django.test import SimpleTestCase
from django.urls import resolve
from clientes.views import ClienteViewSet
import uuid


class TestUrls(SimpleTestCase):

    def test_cliente_list_url(self):
        resolver = resolve('/api/clientes/')
        self.assertEqual(resolver.func.cls, ClienteViewSet)

    def test_cliente_detail_url(self):
        test_id = uuid.uuid4()
        resolver = resolve(f'/api/clientes/{test_id}/')
        self.assertEqual(resolver.func.cls, ClienteViewSet)