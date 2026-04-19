from django.test import TestCase  # Clase base de Django para crear pruebas
from clientes.models import Cliente  # Importamos el modelo que vamos a probar
from django.db.utils import IntegrityError  # Para detectar errores de unicidad en BD


class ClienteModelTest(TestCase):
    """
    Clase que agrupa todas las pruebas del modelo Cliente.
    Cada método que empiece con 'test_' será ejecutado automáticamente.
    """

    def setUp(self):
        """
        Este método se ejecuta ANTES de cada prueba.
        Sirve para crear datos iniciales reutilizables.
        """
        self.cliente = Cliente.objects.create(
            nombre="Juan Pérez",
            correo="juan@test.com",
            telefono="123456789",
            direccion="Calle 123"
        )

    def test_creacion_cliente(self):
        """
        Prueba que el cliente se crea correctamente en la base de datos.
        Verifica que los valores guardados coincidan con los enviados.
        """
        self.assertEqual(self.cliente.nombre, "Juan Pérez")  # El nombre debe coincidir
        self.assertEqual(self.cliente.correo, "juan@test.com")  # El correo debe coincidir
        self.assertTrue(self.cliente.activo)  # Verifica que el valor por defecto sea True

    def test_str_devuelve_nombre(self):
        """
        Prueba el método __str__ del modelo.
        Esto es importante para el admin de Django y logs.
        """
        self.assertEqual(str(self.cliente), "Juan Pérez")

    def test_correo_unico(self):
        """
        Prueba que NO se pueden crear dos clientes con el mismo correo.
        Esperamos que Django lance un error de integridad (IntegrityError).
        """
        with self.assertRaises(IntegrityError):
            Cliente.objects.create(
                nombre="Otro Cliente",
                correo="juan@test.com"  # mismo correo → debe fallar
            )

    def test_id_es_uuid(self):
        """
        Verifica que el ID generado sea de tipo UUID.
        Esto es importante porque no usamos enteros como ID.
        """
        import uuid
        self.assertIsInstance(self.cliente.id, uuid.UUID)

    def test_ordenamiento_por_fecha(self):
        """
        Verifica que los clientes se ordenan por fecha_creacion DESC.
        (el más reciente debe aparecer primero)
        """
        cliente2 = Cliente.objects.create(
            nombre="Maria",
            correo="maria@test.com"
        )

        clientes = Cliente.objects.all()

        # cliente2 fue creado después, así que debe estar primero
        self.assertEqual(clientes[0], cliente2)