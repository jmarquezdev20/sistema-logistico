"""
  PRUEBAS DE MODELOS — Módulo Transportadores
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez

  Cubre:
    Transportador - creacion, tipos de vehiculo, __str__,
                    ordering, activo, fecha_creacion
"""

import uuid
from django.test import TestCase

from transportadores.models import Transportador


# Helpers

def crear_transportador(
    nombre='Trans Test',
    telefono='3001234567',
    placa='ABC123',
    tipo='camion',
    activo=True,
):
    return Transportador.objects.create(
        nombre=nombre,
        telefono=telefono,
        placa_vehiculo=placa,
        tipo_vehiculo=tipo,
        activo=activo,
    )


# Tests: Transportador 
class TransportadorModelTest(TestCase):
    """Pruebas unitarias para el modelo Transportador."""

    def test_crear_transportador_exitoso(self):
        """Un transportador se crea correctamente con datos validos."""
        trans = crear_transportador()
        self.assertIsInstance(trans.id, uuid.UUID)
        self.assertEqual(trans.nombre, 'Trans Test')
        self.assertEqual(trans.placa_vehiculo, 'ABC123')

    def test_id_es_uuid(self):
        """El id del transportador es un UUID valido."""
        trans = crear_transportador()
        self.assertIsInstance(trans.id, uuid.UUID)

    def test_str_incluye_nombre_y_placa(self):
        """El __str__ incluye el nombre y la placa del vehiculo."""
        trans = crear_transportador(nombre='Juan Perez', placa='XYZ789')
        resultado = str(trans)
        self.assertIn('Juan Perez', resultado)
        self.assertIn('XYZ789', resultado)

    def test_tipo_vehiculo_moto(self):
        """El tipo de vehiculo puede ser moto."""
        trans = crear_transportador(tipo='moto')
        self.assertEqual(trans.tipo_vehiculo, Transportador.MOTO)

    def test_tipo_vehiculo_camioneta(self):
        """El tipo de vehiculo puede ser camioneta."""
        trans = crear_transportador(tipo='camioneta')
        self.assertEqual(trans.tipo_vehiculo, Transportador.CAMIONETA)

    def test_tipo_vehiculo_camion(self):
        """El tipo de vehiculo puede ser camion."""
        trans = crear_transportador(tipo='camion')
        self.assertEqual(trans.tipo_vehiculo, Transportador.CAMION)

    def test_tipo_vehiculo_furgon(self):
        """El tipo de vehiculo puede ser furgon."""
        trans = crear_transportador(tipo='furgon')
        self.assertEqual(trans.tipo_vehiculo, Transportador.FURGON)

    def test_choices_tipo_son_cuatro(self):
        """Existen exactamente 4 tipos de vehiculo."""
        self.assertEqual(len(Transportador.TIPO_CHOICES), 4)

    def test_activo_por_defecto_es_true(self):
        """El transportador esta activo por defecto."""
        trans = Transportador.objects.create(
            nombre='Activo Default',
            telefono='3001111111',
            placa_vehiculo='DEF456',
            tipo_vehiculo='moto',
        )
        self.assertTrue(trans.activo)

    def test_puede_desactivarse(self):
        """Un transportador puede marcarse como inactivo."""
        trans = crear_transportador()
        trans.activo = False
        trans.save()
        trans.refresh_from_db()
        self.assertFalse(trans.activo)

    def test_fecha_creacion_se_genera_automaticamente(self):
        """La fecha de creacion se asigna automaticamente."""
        trans = crear_transportador()
        self.assertIsNotNone(trans.fecha_creacion)

    def test_ordering_por_nombre(self):
        """Los transportadores se ordenan alfabeticamente por nombre."""
        self.assertEqual(Transportador._meta.ordering, ['nombre'])

    def test_ordering_alphabetico(self):
        """Los transportadores aparecen en orden alfabetico."""
        crear_transportador(nombre='Zebra Trans', placa='ZZZ001')
        crear_transportador(nombre='Alfa Trans', placa='AAA001')
        crear_transportador(nombre='Mango Trans', placa='MMM001')
        nombres = list(Transportador.objects.values_list('nombre', flat=True))
        self.assertEqual(nombres, sorted(nombres))

    def test_telefono_se_almacena_correctamente(self):
        """El telefono se almacena correctamente."""
        trans = crear_transportador(telefono='3219876543')
        self.assertEqual(trans.telefono, '3219876543')

    def test_multiples_transportadores(self):
        """Se pueden crear multiples transportadores."""
        crear_transportador(nombre='Trans A', placa='AAA001')
        crear_transportador(nombre='Trans B', placa='BBB002')
        crear_transportador(nombre='Trans C', placa='CCC003')
        self.assertEqual(Transportador.objects.count(), 3)