from django.test import TestCase
from clientes.serializers import ClienteSerializer
from clientes.models import Cliente


class ClienteSerializerTest(TestCase):

    def test_serializer_valido(self):
        """
        Verifica que datos correctos pasan la validación
        """
        data = {
            "nombre": "Carlos",
            "correo": "carlos@test.com",
            "telefono": "123456",
            "direccion": "Calle 1"
        }

        serializer = ClienteSerializer(data=data)

        # Debe ser válido
        self.assertTrue(serializer.is_valid())

    def test_serializer_invalido_sin_nombre(self):
        """
        Falta el campo obligatorio 'nombre'
        """
        data = {
            "correo": "carlos@test.com"
        }

        serializer = ClienteSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("nombre", serializer.errors)

    def test_serializer_correo_invalido(self):
        """
        Correo con formato incorrecto
        """
        data = {
            "nombre": "Carlos",
            "correo": "correo_invalido"
        }

        serializer = ClienteSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("correo", serializer.errors)

    def test_serializer_correo_duplicado(self):
        """
        No permite correos duplicados
        """
        Cliente.objects.create(
            nombre="Juan",
            correo="juan@test.com"
        )

        data = {
            "nombre": "Otro",
            "correo": "juan@test.com"
        }

        serializer = ClienteSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("correo", serializer.errors)

    def test_campos_read_only(self):
        """
        Verifica que no se puedan modificar campos de solo lectura
        """
        data = {
            "id": "1234",
            "nombre": "Carlos",
            "correo": "carlos@test.com",
            "fecha_creacion": "2024-01-01T00:00:00Z"
        }

        serializer = ClienteSerializer(data=data)

        self.assertTrue(serializer.is_valid())

        cliente = serializer.save()

        # El ID no debe ser el que enviamos
        self.assertNotEqual(str(cliente.id), "1234")