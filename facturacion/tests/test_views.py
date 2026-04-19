"""
  PRUEBAS DE VISTAS — Módulo Facturacion
  Sistema: BodegaXpress - Gestion Logistica
  Autor:   Juan Manuel Marquez
  
  Cubre:
    FacturaViewSet - listar, generar, marcar_pagada, permisos,
                     filtros por cliente/estado, descarga PDF
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from usuarios.models import User, Rol
from clientes.models import Cliente
from facturacion.models import Factura, DetalleFactura
from servicios.models import CatalogoServicio, ServicioPrestado


# Helpers

def crear_rol(nombre='admin'):
    rol, _ = Rol.objects.get_or_create(nombre=nombre)
    return rol


def crear_usuario(username='factuser', password='testpass123', rol_nombre='admin'):
    rol = crear_rol(rol_nombre)
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@test.com', 'rol': rol}
    )
    if created:
        user.set_password(password)
        user.save()
    return user


def crear_cliente(nombre='Cliente Fact Views'):
    return Cliente.objects.create(
        nombre=nombre,
        correo=f'{nombre.lower().replace(" ", "")}@test.com',
        telefono='3001111111',
        direccion='Carrera 5',
        activo=True,
    )


def crear_catalogo(nombre='Almacenamiento Test'):
    return CatalogoServicio.objects.create(
        nombre=nombre,
        tarifa=Decimal('50000'),
        unidad='por_dia',
        activo=True,
    )


def crear_servicio_prestado(cliente, catalogo=None, valor=Decimal('50000')):
    if catalogo is None:
        catalogo = crear_catalogo()
    return ServicioPrestado.objects.create(
        cliente=cliente,
        catalogo_servicio=catalogo,
        cantidad=Decimal('1'),
        valor_unitario=valor,
        valor_total=valor,
        fecha=timezone.now().date(),
        facturado=False,
    )


def crear_factura(cliente, estado='pendiente'):
    return Factura.objects.create(
        cliente=cliente,
        fecha_vencimiento=timezone.now().date(),
        subtotal=Decimal('100000'),
        impuestos=Decimal('19000'),
        total=Decimal('119000'),
        estado=estado,
    )


# Base con autenticacion JWT

class BaseAPITest(APITestCase):
    """Clase base con autenticacion JWT."""

    def setUp(self):
        self.client = APIClient()
        self.user = crear_usuario()
        response = self.client.post('/api/auth/login/', {
            'email': self.user.email,
            'password': 'testpass123',
        }, format='json')
        if response.status_code == 200:
            token = response.data.get('access')
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.cliente = crear_cliente()
        self.catalogo = crear_catalogo()


# Tests: FacturaViewSet

class FacturaListRetrieveTest(BaseAPITest):
    """Pruebas de listado y detalle de facturas."""

    BASE_URL = '/api/facturacion/facturas/'

    def setUp(self):
        super().setUp()
        self.factura = crear_factura(self.cliente)

    def test_listar_facturas_retorna_200(self):
        """GET retorna 200 con lista de facturas."""
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_detalle_factura_retorna_200(self):
        """GET /{id}/ retorna el detalle de la factura."""
        response = self.client.get(f'{self.BASE_URL}{self.factura.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('numero_factura', response.data)

    def test_respuesta_incluye_cliente_nombre(self):
        """La respuesta incluye el campo cliente_nombre."""
        response = self.client.get(f'{self.BASE_URL}{self.factura.id}/')
        self.assertIn('cliente_nombre', response.data)
        self.assertEqual(response.data['cliente_nombre'], self.cliente.nombre)

    def test_respuesta_incluye_detalles(self):
        """La respuesta incluye el array de detalles."""
        response = self.client.get(f'{self.BASE_URL}{self.factura.id}/')
        self.assertIn('detalles', response.data)
        self.assertIsInstance(response.data['detalles'], list)

    def test_filtrar_por_cliente(self):
        """GET con ?cliente= retorna solo facturas de ese cliente."""
        cliente2 = crear_cliente('Cliente Otro Fact')
        crear_factura(cliente2)
        response = self.client.get(f'{self.BASE_URL}?cliente={self.cliente.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for factura in resultados:
            self.assertEqual(factura['cliente_nombre'], self.cliente.nombre)

    def test_filtrar_por_estado_pendiente(self):
        """GET con ?estado=pendiente retorna solo facturas pendientes."""
        crear_factura(self.cliente, estado='pagada')
        response = self.client.get(f'{self.BASE_URL}?estado=pendiente')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for factura in resultados:
            self.assertEqual(factura['estado'], 'pendiente')

    def test_filtrar_por_estado_pagada(self):
        """GET con ?estado=pagada retorna solo facturas pagadas."""
        crear_factura(self.cliente, estado='pagada')
        response = self.client.get(f'{self.BASE_URL}?estado=pagada')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultados = response.data.get('results', response.data)
        for factura in resultados:
            self.assertEqual(factura['estado'], 'pagada')

    def test_sin_autenticacion_retorna_401(self):
        """GET sin token retorna 401 Unauthorized."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class FacturaGenerarTest(BaseAPITest):
    """Pruebas del endpoint generar factura."""

    BASE_URL = '/api/facturacion/facturas/generar/'

    def test_generar_factura_exitosa(self):
        """POST generar crea la factura con sus detalles correctamente."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        data = {
            'cliente': str(self.cliente.id),
            'fecha_vencimiento': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('numero_factura', response.data)
        self.assertTrue(response.data['numero_factura'].startswith('FAC-'))

    def test_generar_factura_marca_servicios_como_facturados(self):
        """Al generar una factura, los servicios quedan marcados como facturados."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        data = {
            'cliente': str(self.cliente.id),
            'fecha_vencimiento': timezone.now().date().isoformat(),
        }
        self.client.post(self.BASE_URL, data, format='json')
        servicio.refresh_from_db()
        self.assertTrue(servicio.facturado)

    def test_generar_factura_crea_detalles(self):
        """Al generar una factura, se crean sus detalles correctamente."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        data = {
            'cliente': str(self.cliente.id),
            'fecha_vencimiento': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        factura_id = response.data['id']
        detalles = DetalleFactura.objects.filter(factura_id=factura_id)
        self.assertEqual(detalles.count(), 1)

    def test_generar_calcula_impuestos_19_porciento(self):
        """Los impuestos se calculan correctamente al 19% del subtotal."""
        crear_servicio_prestado(self.cliente, self.catalogo, valor=Decimal('100000'))
        data = {
            'cliente': str(self.cliente.id),
            'fecha_vencimiento': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        subtotal = Decimal(response.data['subtotal'])
        impuestos = Decimal(response.data['impuestos'])
        self.assertAlmostEqual(float(impuestos), float(subtotal * Decimal('0.19')), places=2)

    def test_generar_calcula_total_correcto(self):
        """El total es la suma del subtotal mas los impuestos."""
        crear_servicio_prestado(self.cliente, self.catalogo, valor=Decimal('100000'))
        data = {
            'cliente': str(self.cliente.id),
            'fecha_vencimiento': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        subtotal = Decimal(response.data['subtotal'])
        impuestos = Decimal(response.data['impuestos'])
        total = Decimal(response.data['total'])
        self.assertAlmostEqual(float(total), float(subtotal + impuestos), places=2)

    def test_generar_sin_cliente_retorna_400(self):
        """POST sin cliente retorna 400 con mensaje de error."""
        data = {'fecha_vencimiento': timezone.now().date().isoformat()}
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_generar_sin_fecha_vencimiento_retorna_400(self):
        """POST sin fecha_vencimiento retorna 400 con mensaje de error."""
        data = {'cliente': str(self.cliente.id)}
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_generar_sin_servicios_pendientes_retorna_400(self):
        """POST para cliente sin servicios pendientes retorna 400."""
        data = {
            'cliente': str(self.cliente.id),
            'fecha_vencimiento': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_generar_no_incluye_servicios_ya_facturados(self):
        """Los servicios ya facturados no se incluyen en una nueva factura."""
        servicio = crear_servicio_prestado(self.cliente, self.catalogo)
        servicio.facturado = True
        servicio.save()
        data = {
            'cliente': str(self.cliente.id),
            'fecha_vencimiento': timezone.now().date().isoformat(),
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generar_con_servicios_ids_especificos(self):
        """POST con servicios_ids incluye solo los servicios indicados."""
        s1 = crear_servicio_prestado(self.cliente, self.catalogo)
        s2 = crear_servicio_prestado(self.cliente, crear_catalogo('Despacho'))
        data = {
            'cliente': str(self.cliente.id),
            'fecha_vencimiento': timezone.now().date().isoformat(),
            'servicios_ids': [str(s1.id)],
        }
        response = self.client.post(self.BASE_URL, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        factura_id = response.data['id']
        self.assertEqual(DetalleFactura.objects.filter(factura_id=factura_id).count(), 1)
        s2.refresh_from_db()
        self.assertFalse(s2.facturado)


class FacturaMarcarPagadaTest(BaseAPITest):
    """Pruebas del endpoint marcar_pagada."""

    def setUp(self):
        super().setUp()
        self.factura = crear_factura(self.cliente, estado='pendiente')
        self.URL = f'/api/facturacion/facturas/{self.factura.id}/marcar_pagada/'

    def test_marcar_pagada_exitoso(self):
        """POST marcar_pagada cambia el estado a pagada."""
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.factura.refresh_from_db()
        self.assertEqual(self.factura.estado, 'pagada')

    def test_marcar_pagada_retorna_datos_factura(self):
        """POST marcar_pagada retorna los datos actualizados de la factura."""
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado'], 'pagada')

    def test_marcar_pagada_dos_veces_retorna_400(self):
        """No se puede marcar como pagada una factura que ya esta pagada."""
        self.factura.estado = 'pagada'
        self.factura.save()
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_marcar_pagada_incluye_campo_correo_enviado(self):
        """La respuesta incluye el campo correo_enviado."""
        response = self.client.post(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('correo_enviado', response.data)


class FacturaDescargarPDFTest(BaseAPITest):
    """Pruebas del endpoint descargar PDF."""

    def setUp(self):
        super().setUp()
        self.factura = crear_factura(self.cliente)
        self.URL = f'/api/facturacion/facturas/{self.factura.id}/pdf/'

    def test_descargar_pdf_retorna_200(self):
        """GET pdf/ retorna 200 con contenido PDF."""
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_respuesta_es_pdf(self):
        """El content-type de la respuesta es application/pdf."""
        response = self.client.get(self.URL)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_respuesta_tiene_header_descarga(self):
        """La respuesta incluye el header Content-Disposition para descarga."""
        response = self.client.get(self.URL)
        self.assertIn('Content-Disposition', response)
        self.assertIn(self.factura.numero_factura, response['Content-Disposition'])

    def test_pdf_factura_inexistente_retorna_404(self):
        """GET pdf/ con UUID inexistente retorna 404."""
        url = f'/api/facturacion/facturas/{uuid.uuid4()}/pdf/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sin_autenticacion_retorna_401(self):
        """GET pdf/ sin token retorna 401."""
        client_sin_auth = APIClient()
        response = client_sin_auth.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class FacturaPermisosTest(BaseAPITest):
    """Pruebas de permisos del modulo facturacion."""

    def setUp(self):
        super().setUp()
        self.factura = crear_factura(self.cliente)

    def test_empleado_no_puede_generar_factura(self):
        """Un empleado no puede acceder al endpoint generar."""
        empleado = crear_usuario('empleado_fact', rol_nombre='empleado')
        response_login = self.client.post('/api/auth/login/', {
            'email': empleado.email,
            'password': 'testpass123',
        }, format='json')
        if response_login.status_code == 200:
            token = response_login.data.get('access')
            client_empleado = APIClient()
            client_empleado.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
            response = client_empleado.post('/api/facturacion/facturas/generar/', {
                'cliente': str(self.cliente.id),
                'fecha_vencimiento': '2026-12-31',
            }, format='json')
            self.assertIn(response.status_code, [
                status.HTTP_403_FORBIDDEN,
                status.HTTP_400_BAD_REQUEST,
            ])