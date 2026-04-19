"""
  PRUEBAS DE SERIALIZERS — Módulo Transportadores
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez

  Cubre:
    TransportadorSerializer - campos, read_only, validaciones
"""

from django.test import TestCase

from transportadores.models import Transportador
from transportadores.serializers import TransportadorSerializer


# Helpers 

def crear_transportador(nombre='Trans Ser', placa='SER001', tipo='camion'):
    return Transportador.objects.create(
        nombre=nombre,
        telefono='3001234567',
        placa_vehiculo=placa,
        tipo_vehiculo=tipo,
        activo=True,
    )


# Tests: TransportadorSerializer

class TransportadorSerializerTest(TestCase):
    """Pruebas para TransportadorSerializer."""

    def setUp(self):
        self.trans = crear_transportador()

    def test_serializa_campos_correctos(self):
        """El serializer incluye todos los campos esperados."""
        serializer = TransportadorSerializer(self.trans)
        campos = set(serializer.data.keys())
        self.assertIn('id', campos)
        self.assertIn('nombre', campos)
        self.assertIn('telefono', campos)
        self.assertIn('placa_vehiculo', campos)
        self.assertIn('tipo_vehiculo', campos)
        self.assertIn('activo', campos)
        self.assertIn('fecha_creacion', campos)

    def test_id_es_readonly(self):
        """El campo id es de solo lectura."""
        field = TransportadorSerializer().fields['id']
        self.assertTrue(field.read_only)

    def test_fecha_creacion_es_readonly(self):
        """El campo fecha_creacion es de solo lectura."""
        field = TransportadorSerializer().fields['fecha_creacion']
        self.assertTrue(field.read_only)

    def test_datos_validos_pasan_validacion(self):
        """Datos correctos pasan la validacion del serializer."""
        data = {
            'nombre': 'Nuevo Transportador',
            'telefono': '3009876543',
            'placa_vehiculo': 'NUE001',
            'tipo_vehiculo': 'furgon',
            'activo': True,
        }
        serializer = TransportadorSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_nombre_requerido(self):
        """El nombre es un campo obligatorio."""
        data = {
            'telefono': '3001111111',
            'placa_vehiculo': 'AAA001',
            'tipo_vehiculo': 'moto',
        }
        serializer = TransportadorSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('nombre', serializer.errors)

    def test_placa_requerida(self):
        """La placa del vehiculo es obligatoria."""
        data = {
            'nombre': 'Sin Placa',
            'telefono': '3001111111',
            'tipo_vehiculo': 'moto',
        }
        serializer = TransportadorSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('placa_vehiculo', serializer.errors)

    def test_tipo_vehiculo_requerido(self):
        """El tipo de vehiculo es obligatorio."""
        data = {
            'nombre': 'Sin Tipo',
            'telefono': '3001111111',
            'placa_vehiculo': 'SIN001',
        }
        serializer = TransportadorSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('tipo_vehiculo', serializer.errors)

    def test_tipo_vehiculo_invalido_falla(self):
        """Un tipo de vehiculo invalido falla la validacion."""
        data = {
            'nombre': 'Trans Invalido',
            'telefono': '3001111111',
            'placa_vehiculo': 'INV001',
            'tipo_vehiculo': 'bicicleta',
        }
        serializer = TransportadorSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('tipo_vehiculo', serializer.errors)

    def test_nombre_se_serializa_correctamente(self):
        """El nombre se serializa con el valor correcto."""
        serializer = TransportadorSerializer(self.trans)
        self.assertEqual(serializer.data['nombre'], 'Trans Ser')

    def test_placa_se_serializa_correctamente(self):
        """La placa se serializa con el valor correcto."""
        serializer = TransportadorSerializer(self.trans)
        self.assertEqual(serializer.data['placa_vehiculo'], 'SER001')

    def test_activo_se_serializa_correctamente(self):
        """El campo activo se serializa correctamente."""
        serializer = TransportadorSerializer(self.trans)
        self.assertTrue(serializer.data['activo'])

    def test_id_se_serializa_como_string(self):
        """El id se serializa como string UUID."""
        serializer = TransportadorSerializer(self.trans)
        self.assertIsInstance(serializer.data['id'], str)