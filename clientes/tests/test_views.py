import uuid
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from unittest.mock import patch

from clientes.models import Cliente

User = get_user_model()


class ClienteViewSetTest(APITestCase):

    def setUp(self):
        """Configuración inicial"""
        self.user = User.objects.create_user(
            username="admin",
            password="123456"
        )
        self.client.force_authenticate(user=self.user)

        self.cliente = Cliente.objects.create(
            nombre="Juan",
            correo="juan@test.com"
        )

        self.url_list = reverse("cliente-list")
        self.url_detail = reverse("cliente-detail", args=[self.cliente.id])

    # LISTAR
   
    @patch('clientes.views.registrar')
    def test_listar_clientes(self, mock_registrar):
        response = self.client.get(self.url_list)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data["results"] if "results" in response.data else response.data
        self.assertGreaterEqual(len(data), 1)

   
    #CREAR
  
    @patch('clientes.views.registrar')
    def test_crear_cliente(self, mock_registrar):
        data = {
            "nombre": "Maria",
            "correo": "maria@test.com"
        }

        response = self.client.post(self.url_list, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cliente.objects.count(), 2)
        mock_registrar.assert_called_once()

    @patch('clientes.views.registrar')
    def test_crear_cliente_correo_duplicado(self, mock_registrar):
        data = {
            "nombre": "Otro",
            "correo": "juan@test.com"
        }

        response = self.client.post(self.url_list, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

   
    #ACTUALIZAR
    @patch('clientes.views.registrar')
    def test_actualizar_cliente(self, mock_registrar):
        data = {
            "nombre": "Juan Actualizado",
            "correo": "juan@test.com"
        }

        response = self.client.put(self.url_detail, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.nombre, "Juan Actualizado")

        mock_registrar.assert_called_once()

    @patch('clientes.views.registrar')
    def test_actualizacion_parcial(self, mock_registrar):
        response = self.client.patch(self.url_detail, {
            "nombre": "Nuevo Nombre"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.nombre, "Nuevo Nombre")

        mock_registrar.assert_called_once()

    
    # ELIMINAR
    @patch('clientes.views.registrar')
    def test_eliminar_cliente(self, mock_registrar):
        response = self.client.delete(self.url_detail)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Cliente.objects.count(), 0)

        mock_registrar.assert_called_once()

    def test_eliminar_cliente_inexistente(self):
        fake_url = reverse("cliente-detail", args=[uuid.uuid4()])
        response = self.client.delete(fake_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    #BUSQUEDA
    @patch('clientes.views.registrar')
    def test_busqueda_cliente(self, mock_registrar):
        Cliente.objects.create(nombre="Pedro", correo="pedro@test.com")

        response = self.client.get(self.url_list + "?search=Pedro")

        self.assertEqual(response.status_code, 200)

        data = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["nombre"], "Pedro")

    # ORDENAMIENTO
    @patch('clientes.views.registrar')
    def test_ordenamiento_clientes(self, mock_registrar):
        Cliente.objects.create(nombre="Zeta", correo="z@test.com")
        Cliente.objects.create(nombre="Alpha", correo="a@test.com")

        response = self.client.get(self.url_list + "?ordering=nombre")

        data = response.data["results"] if "results" in response.data else response.data

        self.assertEqual(data[0]["nombre"], "Alpha")

    # AUTENTICACION
    def test_acceso_sin_autenticacion(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url_list)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)