"""
  PRUEBAS DE MODELOS — Módulo Servicios
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
  
  Cubre:
    CatalogoServicio - creacion, unidades, __str__, ordering, activo
    ServicioPrestado - creacion, calculo valor_total, __str__, ordering
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from clientes.models import Cliente
from servicios.models import CatalogoServicio, ServicioPrestado


# Helpers
def crear_cliente(nombre='Cliente Servicios'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001234567',
        direccion='Calle 1',
        activo=True,
    )


def crear_catalogo(nombre='Almacenamiento', tarifa=Decimal('50000'), unidad='por_dia'):
    return CatalogoServicio.objects.create(
        nombre=nombre,
        descripcion='Servicio de prueba',
        tarifa=tarifa,
        unidad=unidad,
        activo=True,
    )


def crear_servicio_prestado(cliente=None, catalogo=None, cantidad=Decimal('2'), valor_unitario=Decimal('50000')):
    if cliente is None:
        cliente = crear_cliente()
    if catalogo is None:
        catalogo = crear_catalogo()
    return ServicioPrestado.objects.create(
        cliente=cliente,
        catalogo_servicio=catalogo,
        cantidad=cantidad,
        valor_unitario=valor_unitario,
        valor_total=cantidad * valor_unitario,
        fecha=timezone.now().date(),
        facturado=False,
    )


# Tests: CatalogoServicio 

class CatalogoServicioModelTest(TestCase):
    """Pruebas unitarias para el modelo CatalogoServicio."""

    def test_crear_catalogo_exitoso(self):
        """Un catalogo se crea correctamente con datos validos."""
        catalogo = crear_catalogo()
        self.assertIsInstance(catalogo.id, uuid.UUID)
        self.assertEqual(catalogo.nombre, 'Almacenamiento')
        self.assertEqual(catalogo.tarifa, Decimal('50000'))

    def test_id_es_uuid(self):
        """El id del catalogo es un UUID valido."""
        catalogo = crear_catalogo()
        self.assertIsInstance(catalogo.id, uuid.UUID)

    def test_str_incluye_nombre_tarifa_y_unidad(self):
        """El __str__ incluye nombre, tarifa y unidad."""
        catalogo = crear_catalogo('Despacho', Decimal('30000'), 'por_envio')
        resultado = str(catalogo)
        self.assertIn('Despacho', resultado)
        self.assertIn('30000', resultado)
        self.assertIn('por_envio', resultado)

    def test_unidad_por_dia(self):
        """La unidad puede ser por_dia."""
        catalogo = crear_catalogo(unidad='por_dia')
        self.assertEqual(catalogo.unidad, CatalogoServicio.POR_DIA)

    def test_unidad_por_envio(self):
        """La unidad puede ser por_envio."""
        catalogo = crear_catalogo(unidad='por_envio')
        self.assertEqual(catalogo.unidad, CatalogoServicio.POR_ENVIO)

    def test_unidad_por_recepcion(self):
        """La unidad puede ser por_recepcion."""
        catalogo = crear_catalogo(unidad='por_recepcion')
        self.assertEqual(catalogo.unidad, CatalogoServicio.POR_RECEPCION)

    def test_unidad_unitario(self):
        """La unidad puede ser unitario."""
        catalogo = crear_catalogo(unidad='unitario')
        self.assertEqual(catalogo.unidad, CatalogoServicio.UNITARIO)

    def test_choices_unidad_son_cuatro(self):
        """Existen exactamente 4 unidades posibles."""
        self.assertEqual(len(CatalogoServicio.UNIDAD_CHOICES), 4)

    def test_activo_por_defecto_es_true(self):
        """El catalogo esta activo por defecto."""
        catalogo = CatalogoServicio.objects.create(
            nombre='Test Activo',
            tarifa=Decimal('10000'),
            unidad='unitario',
        )
        self.assertTrue(catalogo.activo)

    def test_puede_desactivarse(self):
        """Un catalogo puede marcarse como inactivo."""
        catalogo = crear_catalogo()
        catalogo.activo = False
        catalogo.save()
        catalogo.refresh_from_db()
        self.assertFalse(catalogo.activo)

    def test_descripcion_puede_ser_vacia(self):
        """La descripcion es un campo opcional."""
        catalogo = CatalogoServicio.objects.create(
            nombre='Sin descripcion',
            tarifa=Decimal('10000'),
            unidad='unitario',
            descripcion='',
        )
        self.assertEqual(catalogo.descripcion, '')

    def test_ordering_por_nombre(self):
        """Los catalogos se ordenan alfabeticamente por nombre."""
        self.assertEqual(CatalogoServicio._meta.ordering, ['nombre'])

    def test_tarifa_se_almacena_correctamente(self):
        """La tarifa se almacena con precision decimal correcta."""
        catalogo = crear_catalogo(tarifa=Decimal('75000.50'))
        self.assertEqual(catalogo.tarifa, Decimal('75000.50'))


# Tests: ServicioPrestado 

class ServicioPrestadoModelTest(TestCase):
    """Pruebas unitarias para el modelo ServicioPrestado."""

    def setUp(self):
        self.cliente = crear_cliente()
        self.catalogo = crear_catalogo()

    def test_crear_servicio_exitoso(self):
        """Un ServicioPrestado se crea correctamente con datos validos."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        self.assertIsInstance(servicio.id, uuid.UUID)
        self.assertEqual(servicio.cliente, self.cliente)
        self.assertEqual(servicio.catalogo_servicio, self.catalogo)

    def test_id_es_uuid(self):
        """El id del servicio prestado es un UUID valido."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        self.assertIsInstance(servicio.id, uuid.UUID)

    def test_valor_total_se_calcula_automaticamente(self):
        """El valor_total se calcula como cantidad * valor_unitario al guardar."""
        servicio = ServicioPrestado.objects.create(
            cliente=self.cliente,
            catalogo_servicio=self.catalogo,
            cantidad=Decimal('3'),
            valor_unitario=Decimal('50000'),
            valor_total=Decimal('0'),
            fecha=timezone.now().date(),
        )
        self.assertEqual(servicio.valor_total, Decimal('150000'))

    def test_valor_total_se_recalcula_al_actualizar(self):
        """El valor_total se recalcula correctamente al actualizar."""
        servicio = crear_servicio_prestado(
            self.cliente, self.catalogo,
            cantidad=Decimal('2'), valor_unitario=Decimal('50000')
        )
        servicio.cantidad = Decimal('5')
        servicio.save()
        self.assertEqual(servicio.valor_total, Decimal('250000'))

    def test_str_incluye_catalogo_cliente_y_valor(self):
        """El __str__ incluye nombre del catalogo, cliente y valor total."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        resultado = str(servicio)
        self.assertIn(self.catalogo.nombre, resultado)
        self.assertIn(self.cliente.nombre, resultado)

    def test_facturado_por_defecto_es_false(self):
        """El servicio no esta facturado por defecto."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        self.assertFalse(servicio.facturado)

    def test_puede_marcarse_como_facturado(self):
        """Un servicio puede marcarse como facturado."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        servicio.facturado = True
        servicio.save()
        servicio.refresh_from_db()
        self.assertTrue(servicio.facturado)

    def test_orden_envio_es_opcional(self):
        """El campo orden_envio es opcional."""
        servicio = ServicioPrestado.objects.create(
            cliente=self.cliente,
            catalogo_servicio=self.catalogo,
            cantidad=Decimal('1'),
            valor_unitario=Decimal('50000'),
            valor_total=Decimal('50000'),
            fecha=timezone.now().date(),
            orden_envio=None,
        )
        self.assertIsNone(servicio.orden_envio)

    def test_observacion_puede_ser_vacia(self):
        """La observacion es un campo opcional."""
        servicio = ServicioPrestado.objects.create(
            cliente=self.cliente,
            catalogo_servicio=self.catalogo,
            cantidad=Decimal('1'),
            valor_unitario=Decimal('50000'),
            valor_total=Decimal('50000'),
            fecha=timezone.now().date(),
            observacion='',
        )
        self.assertEqual(servicio.observacion, '')

    def test_ordering_por_fecha_descendente(self):
        """Los servicios prestados se ordenan por fecha descendente."""
        self.assertEqual(ServicioPrestado._meta.ordering, ['-fecha'])

    def test_relacion_con_cliente(self):
        """El servicio esta correctamente relacionado con el cliente."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        self.assertEqual(servicio.cliente.id, self.cliente.id)

    def test_relacion_con_catalogo(self):
        """El servicio esta correctamente relacionado con el catalogo."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        self.assertEqual(servicio.catalogo_servicio.id, self.catalogo.id)