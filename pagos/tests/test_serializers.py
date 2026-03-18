"""
======================================================================
  PRUEBAS DE SERIALIZERS — Módulo Pagos
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
======================================================================
  Cubre:
    PagoSerializer - campos, read_only, cliente_nombre, factura_numero
======================================================================
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from clientes.models import Cliente
from facturacion.models import Factura
from pagos.models import Pago
from pagos.serializers import PagoSerializer
from usuarios.models import User, Rol


# -- Helpers ----------------------------------------------------------

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='serpagouser'):
    rol = crear_rol()
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password('testpass123')
        user.save()
    return user


def crear_cliente(nombre='Cliente Ser Pago'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Av 1',
        activo=True,
    )


def crear_factura(cliente):
    return Factura.objects.create(
        cliente=cliente,
        fecha_vencimiento=timezone.now().date(),
        subtotal=Decimal('100000'),
        impuestos=Decimal('19000'),
        total=Decimal('119000'),
        estado='pendiente',
    )


def crear_pago(cliente, factura=None, metodo='transferencia'):
    user = crear_usuario()
    return Pago.objects.create(
        cliente=cliente,
        factura=factura,
        monto=Decimal('119000'),
        metodo_pago=metodo,
        referencia='REF-TEST',
        fecha_pago=timezone.now().date(),
        registrado_por=user,
    )


# -- Tests: PagoSerializer --------------------------------------------

class PagoSerializerTest(TestCase):
    """Pruebas para PagoSerializer."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.factura = crear_factura(self.cliente)
        self.pago = crear_pago(self.cliente, self.factura)

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = PagoSerializer(self.pago)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('cliente', campos)
        self.assertIn('factura', campos)
        self.assertIn('monto', campos)
        self.assertIn('metodo_pago', campos)
        self.assertIn('referencia', campos)
        self.assertIn('fecha_pago', campos)
        self.assertIn('cliente_nombre', campos)
        self.assertIn('factura_numero', campos)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = PagoSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_cliente_nombre_es_correcto(self):
        """El campo cliente_nombre refleja el nombre real del cliente."""
        serializer = PagoSerializer(self.pago)
        self.assertEqual(serializer.data['cliente_nombre'], self.cliente.nombre)

    def test_factura_numero_es_correcto(self):
        """El campo factura_numero refleja el numero de la factura."""
        serializer = PagoSerializer(self.pago)
        self.assertEqual(
            serializer.data['factura_numero'],
            self.factura.numero_factura
        )

    def test_factura_numero_es_none_sin_factura(self):
        """El campo factura_numero es None cuando no hay factura."""
        pago_sin_factura = crear_pago(self.cliente, factura=None)
        serializer = PagoSerializer(pago_sin_factura)
        self.assertIsNone(serializer.data.get('factura_numero'))

    def test_monto_se_serializa_correctamente(self):
        """El monto se serializa con el valor correcto."""
        serializer = PagoSerializer(self.pago)
        self.assertEqual(Decimal(serializer.data['monto']), Decimal('119000'))

    def test_metodo_pago_se_serializa_correctamente(self):
        """El metodo de pago se serializa con el valor correcto."""
        serializer = PagoSerializer(self.pago)
        self.assertEqual(serializer.data['metodo_pago'], 'transferencia')

    def test_referencia_se_serializa(self):
        """La referencia se serializa correctamente."""
        serializer = PagoSerializer(self.pago)
        self.assertEqual(serializer.data['referencia'], 'REF-TEST')

    def test_datos_validos_pasan_validacion(self):
        """Datos correctos pasan la validacion del serializer."""
        data = {
            'cliente': str(self.cliente.id),
            'factura': str(self.factura.id),
            'monto': '119000',
            'metodo_pago': 'efectivo',
            'referencia': 'REF-002',
            'fecha_pago': timezone.now().date().isoformat(),
            'registrado_por': str(crear_usuario('val_user').id),
        }
        serializer = PagoSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_monto_requerido(self):
        """El monto es un campo obligatorio."""
        data = {
            'cliente': str(self.cliente.id),
            'metodo_pago': 'efectivo',
            'fecha_pago': timezone.now().date().isoformat(),
        }
        serializer = PagoSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('monto', serializer.errors)

    def test_metodo_pago_requerido(self):
        """El metodo de pago es un campo obligatorio."""
        data = {
            'cliente': str(self.cliente.id),
            'monto': '50000',
            'fecha_pago': timezone.now().date().isoformat(),
        }
        serializer = PagoSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('metodo_pago', serializer.errors)