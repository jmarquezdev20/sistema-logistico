"""
Vistas del módulo de facturación.

Gestiona la generación de facturas a partir de servicios prestados,
descarga en PDF con ReportLab y envío de correos de confirmación
de pago via Gmail SMTP.
"""

from decimal import Decimal
from io import BytesIO
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.http import HttpResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT
from .models import Factura, DetalleFactura
from .serializers import FacturaSerializer
from servicios.models import ServicioPrestado
from usuarios.permissions import EsAdmin, EsEmpleadoOAdmin


class FacturaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión completa del ciclo de facturación.

    Permisos por acción:
        list / retrieve / descargar_pdf: cualquier usuario autenticado.
          El cliente solo ve sus propias facturas (filtrado en get_queryset).
        generar / marcar_pagada / create / destroy: solo administradores.

    Endpoints personalizados:
        POST /facturas/generar/           genera factura desde servicios pendientes.
        POST /facturas/{id}/marcar_pagada/ marca como pagada y envía correo.
        GET  /facturas/{id}/pdf/          descarga la factura en formato PDF.
    """

    queryset         = Factura.objects.select_related('cliente').prefetch_related('detalles').all()
    serializer_class = FacturaSerializer

    def get_permissions(self):
        """
        Asigna permisos según la acción solicitada.

        Returns:
            list: Instancias de permisos aplicables.
        """
        if self.action in ['list', 'retrieve', 'descargar_pdf']:
            return [IsAuthenticated()]
        return [EsAdmin()]

    def get_queryset(self):
        """
        Filtra facturas según el rol del usuario autenticado.

        Un cliente solo puede ver sus propias facturas — nunca las de otros.
        Admin y empleado pueden filtrar por cliente y estado.

        Returns:
            QuerySet: Facturas filtradas según rol y parámetros.
        """
        qs   = super().get_queryset()
        user = self.request.user

        if hasattr(user, 'cliente') and user.cliente is not None:
            return qs.filter(cliente=user.cliente)

        cliente_id = self.request.query_params.get('cliente')
        estado     = self.request.query_params.get('estado')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    @action(detail=True, methods=['get'], url_path='pdf')
    def descargar_pdf(self, request, pk=None):
        """
        Genera y descarga la factura en formato PDF.

        El acceso está controlado por get_queryset — un cliente solo
        puede descargar sus propias facturas ya que el queryset ya
        filtra por su cliente vinculado.

        Args:
            request: Request HTTP del usuario autenticado.
            pk:      UUID de la factura a descargar.

        Returns:
            HttpResponse: PDF de la factura como archivo adjunto.
        """
        factura   = self.get_object()
        pdf_bytes = _generar_pdf_factura(factura)
        response  = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{factura.numero_factura}.pdf"'
        return response

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def generar(self, request):
        """
        Genera una factura agrupando servicios prestados pendientes de un cliente.

        Flujo completo en una transacción atómica:
        1. Valida que se proporcionaron cliente y fecha_vencimiento.
        2. Filtra ServicioPrestado(facturado=False) del cliente.
        3. Soporta facturación parcial si se pasan servicios_ids específicos.
        4. Calcula subtotal sumando valor_total de cada servicio.
        5. Aplica IVA del 19% sobre el subtotal.
        6. Crea la Factura con los totales calculados.
        7. Crea un DetalleFactura por cada servicio incluido.
        8. Marca todos los servicios como facturado=True.

        Args:
            request: Request HTTP. Body debe incluir:
                cliente (UUID): ID del cliente a facturar.
                fecha_vencimiento (date): Fecha límite de pago.
                servicios_ids (list, opcional): IDs específicos a incluir.

        Returns:
            Response: Datos de la factura generada o mensaje de error.
        """
        cliente_id        = request.data.get('cliente')
        fecha_vencimiento = request.data.get('fecha_vencimiento')
        servicios_ids     = request.data.get('servicios_ids', None)

        if not cliente_id or not fecha_vencimiento:
            return Response(
                {'error': 'cliente y fecha_vencimiento son requeridos.'},
                status=400,
            )

        qs = ServicioPrestado.objects.filter(
            cliente_id=cliente_id, facturado=False
        ).select_related('catalogo_servicio')

        if servicios_ids:
            qs = qs.filter(id__in=servicios_ids)

        servicios = list(qs)
        if not servicios:
            return Response(
                {'error': 'No hay servicios seleccionados o pendientes de facturar.'},
                status=400,
            )

        subtotal  = sum(s.valor_total for s in servicios)
        impuestos = subtotal * Decimal('0.19')
        total     = subtotal + impuestos

        factura = Factura.objects.create(
            cliente_id=cliente_id,
            fecha_vencimiento=fecha_vencimiento,
            subtotal=subtotal,
            impuestos=impuestos,
            total=total,
        )

        for servicio in servicios:
            DetalleFactura.objects.create(
                factura=factura,
                servicio_prestado=servicio,
                descripcion=servicio.catalogo_servicio.nombre,
                cantidad=servicio.cantidad,
                valor_unitario=servicio.valor_unitario,
                subtotal=servicio.valor_total,
            )
            servicio.facturado = True
            servicio.save()

        serializer = self.get_serializer(factura)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def marcar_pagada(self, request, pk=None):
        """
        Marca una factura como pagada y envía correo de confirmación al cliente.

        El correo incluye el detalle de servicios, totales con IVA y
        el PDF de la factura como archivo adjunto. Si el envío del
        correo falla, la factura igual queda marcada como pagada —
        el error se registra en consola pero no interrumpe la operación.

        Args:
            request: Request HTTP del administrador.
            pk:      UUID de la factura a marcar como pagada.

        Returns:
            Response: Datos de la factura actualizada con campos adicionales:
                correo_enviado (bool): Si el correo fue enviado exitosamente.
                correo_destinatario (str|None): Email al que se envió.
        """
        factura = self.get_object()

        if factura.estado == 'pagada':
            return Response(
                {'error': 'Esta factura ya está marcada como pagada.'},
                status=400,
            )

        factura.estado = 'pagada'
        factura.save()

        correo_enviado = False
        correo_cliente = getattr(factura.cliente, 'email', None)

        if correo_cliente:
            try:
                _enviar_correo_pago(factura, correo_cliente)
                correo_enviado = True
            except Exception as e:
                print(f'[Facturación] Error enviando correo a {correo_cliente}: {e}')

        serializer = self.get_serializer(factura)
        return Response({
            **serializer.data,
            'correo_enviado':      correo_enviado,
            'correo_destinatario': correo_cliente or None,
        })


def _generar_pdf_factura(factura) -> bytes:
    """
    Genera el PDF de una factura usando ReportLab.

    Construye el documento con:
      Header con número de factura, cliente, fechas y estado.
      Tabla de servicios con descripción, cantidad, valor unitario y subtotal.
      Tabla de totales con subtotal, IVA 19% y total en COP.
      Footer con identificación del sistema.

    Args:
        factura: Instancia de Factura con sus detalles precargados.

    Returns:
        bytes: Contenido del PDF listo para enviar como respuesta HTTP.
    """
    buffer   = BytesIO()
    cliente  = factura.cliente
    detalles = factura.detalles.all()

    ESTADO_LABELS = {
        'pendiente': 'PENDIENTE',
        'pagada':    'PAGADA',
        'vencida':   'VENCIDA',
    }
    estado_label = ESTADO_LABELS.get(factura.estado, factura.estado.upper())

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=15*mm, leftMargin=15*mm,
        topMargin=15*mm, bottomMargin=15*mm,
    )

    COLOR_DARK   = colors.HexColor('#0f1d3a')
    COLOR_GREEN  = colors.HexColor('#059669')
    COLOR_GRAY   = colors.HexColor('#8a97ad')
    COLOR_LIGHT  = colors.HexColor('#f9fafc')
    COLOR_BORDER = colors.HexColor('#e5e9f0')
    COLOR_WHITE  = colors.white

    story = []

    header_data = [[
        Paragraph(
            f'<font color="#7b9bc7" size="7">FACTURA DE SERVICIOS LOGÍSTICOS</font><br/>'
            f'<font color="white" size="16"><b>{factura.numero_factura}</b></font><br/>'
            f'<font color="#b4c8e6" size="8">Cliente: {cliente.nombre}</font><br/>'
            f'<font color="#b4c8e6" size="8">'
            f'Emitida: {factura.fecha_emision.strftime("%d/%m/%Y")}   '
            f'Vence: {factura.fecha_vencimiento.strftime("%d/%m/%Y")}</font>',
            ParagraphStyle('h', fontName='Helvetica', leading=16),
        ),
        Paragraph(
            f'<font color="white" size="8"><b>{estado_label}</b></font>',
            ParagraphStyle('badge', fontName='Helvetica-Bold', alignment=TA_RIGHT),
        ),
    ]]
    header_table = Table(header_data, colWidths=[130*mm, 40*mm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), COLOR_DARK),
        ('TEXTCOLOR',     (0, 0), (-1, -1), COLOR_WHITE),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING',   (0, 0), (0, -1),  12),
        ('RIGHTPADDING',  (-1, 0), (-1, -1), 12),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8*mm))

    col_headers = ['Descripción del servicio', 'Cant.', 'V. Unitario', 'Subtotal']
    filas       = [col_headers]
    for d in detalles:
        filas.append([
            d.descripcion, str(d.cantidad),
            f'${int(d.valor_unitario):,}', f'${int(d.subtotal):,}',
        ])

    servicios_table = Table(filas, colWidths=[95*mm, 20*mm, 35*mm, 30*mm])
    servicios_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  COLOR_LIGHT),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  COLOR_GRAY),
        ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0),  8),
        ('TOPPADDING',    (0, 0), (-1, 0),  6),
        ('BOTTOMPADDING', (0, 0), (-1, 0),  6),
        ('FONTNAME',      (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',      (0, 1), (-1, -1), 9),
        ('TEXTCOLOR',     (0, 1), (0, -1),  COLOR_DARK),
        ('TEXTCOLOR',     (1, 1), (2, -1),  COLOR_GRAY),
        ('TEXTCOLOR',     (3, 1), (3, -1),  COLOR_GREEN),
        ('FONTNAME',      (3, 1), (3, -1),  'Helvetica-Bold'),
        ('ALIGN',         (1, 0), (1, -1),  'CENTER'),
        ('ALIGN',         (2, 0), (3, -1),  'RIGHT'),
        ('TOPPADDING',    (0, 1), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('GRID',          (0, 0), (-1, -1), 0.3, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_LIGHT]),
    ]))
    story.append(servicios_table)
    story.append(Spacer(1, 6*mm))

    totales_data  = [
        ['Subtotal',  f'${int(factura.subtotal):,} COP'],
        ['IVA (19%)', f'${int(factura.impuestos):,} COP'],
        ['TOTAL',     f'${int(factura.total):,} COP'],
    ]
    totales_table = Table(totales_data, colWidths=[45*mm, 35*mm], hAlign='RIGHT')
    totales_table.setStyle(TableStyle([
        ('FONTNAME',      (0, 0), (-1, 1),  'Helvetica'),
        ('FONTSIZE',      (0, 0), (-1, 1),  9),
        ('TEXTCOLOR',     (0, 0), (0, 1),   COLOR_GRAY),
        ('TEXTCOLOR',     (1, 0), (1, 1),   colors.HexColor('#6b7a99')),
        ('ALIGN',         (1, 0), (1, -1),  'RIGHT'),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('FONTNAME',      (0, 2), (-1, 2),  'Helvetica-Bold'),
        ('FONTSIZE',      (0, 2), (0, 2),   10),
        ('FONTSIZE',      (1, 2), (1, 2),   13),
        ('TEXTCOLOR',     (0, 2), (0, 2),   COLOR_DARK),
        ('TEXTCOLOR',     (1, 2), (1, 2),   COLOR_GREEN),
        ('LINEABOVE',     (0, 2), (-1, 2),  0.5, COLOR_BORDER),
        ('BACKGROUND',    (0, 0), (-1, -1), COLOR_LIGHT),
        ('BOX',           (0, 0), (-1, -1), 0.4, COLOR_BORDER),
    ]))
    story.append(totales_table)
    story.append(Spacer(1, 8*mm))

    footer_data  = [['Sistema de Gestión Logística  ·  Documento generado automáticamente']]
    footer_table = Table(footer_data, colWidths=[180*mm])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), COLOR_LIGHT),
        ('TEXTCOLOR',     (0, 0), (-1, -1), COLOR_GRAY),
        ('FONTNAME',      (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX',           (0, 0), (-1, -1), 0.3, COLOR_BORDER),
    ]))
    story.append(footer_table)

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def _enviar_correo_pago(factura, correo_cliente: str) -> None:
    """
    Envía un correo HTML de confirmación de pago al cliente.

    El correo incluye:
      Tabla detallada de servicios facturados.
      Resumen de totales con IVA.
      El PDF de la factura como archivo adjunto.
      Versión en texto plano como fallback.

    Args:
        factura:        Instancia de Factura con estado=PAGADA.
        correo_cliente: Email del destinatario.

    Raises:
        Exception: Si el envío falla por configuración SMTP u otro error.
                   El llamador decide si ignorar o registrar el error.
    """
    cliente  = factura.cliente
    detalles = factura.detalles.all()

    filas_html = ''
    filas_txt  = ''
    for d in detalles:
        subtotal_fmt = f"{int(d.subtotal):,}"
        val_fmt      = f"{int(d.valor_unitario):,}"
        filas_html  += f"""
        <tr>
          <td style="padding:11px 16px;border-bottom:1px solid #f0f3f8;color:#1e2a3b;font-size:13px">{d.descripcion}</td>
          <td style="padding:11px 16px;border-bottom:1px solid #f0f3f8;text-align:center;color:#6b7a99;font-size:13px">{d.cantidad}</td>
          <td style="padding:11px 16px;border-bottom:1px solid #f0f3f8;text-align:right;color:#6b7a99;font-size:13px">${val_fmt}</td>
          <td style="padding:11px 16px;border-bottom:1px solid #f0f3f8;text-align:right;font-weight:700;color:#059669;font-size:13px">${subtotal_fmt}</td>
        </tr>"""
        filas_txt   += f"  - {d.descripcion}: {d.cantidad} x ${val_fmt} = ${subtotal_fmt}\n"

    html  = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,29,58,0.1)">
    <div style="background:#0f1d3a;padding:30px 36px">
      <p style="color:#7b9bc7;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px">Confirmación de pago</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0">{factura.numero_factura}</h1>
    </div>
    <div style="padding:32px 36px">
      <p style="color:#1e2a3b;font-size:15px;margin:0 0 6px">Hola, <strong>{cliente.nombre}</strong></p>
      <p style="color:#6b7a99;font-size:14px;margin:0 0 28px;line-height:1.65">
        Confirmamos la recepción del pago de la factura <strong style="color:#0f1d3a">{factura.numero_factura}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e9f0;margin-bottom:22px">
        <thead>
          <tr style="background:#f9fafc">
            <th style="padding:10px 16px;text-align:left;color:#8a97ad;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e5e9f0">Servicio</th>
            <th style="padding:10px 16px;text-align:center;color:#8a97ad;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e5e9f0">Cant.</th>
            <th style="padding:10px 16px;text-align:right;color:#8a97ad;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e5e9f0">V. Unit.</th>
            <th style="padding:10px 16px;text-align:right;color:#8a97ad;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e5e9f0">Total</th>
          </tr>
        </thead>
        <tbody>{filas_html}</tbody>
      </table>
      <div style="background:#f9fafc;border:1px solid #e5e9f0;border-radius:8px;padding:18px 20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#8a97ad;font-size:13px">Subtotal</span>
          <span style="color:#6b7a99;font-size:13px">${int(factura.subtotal):,} COP</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="color:#8a97ad;font-size:13px">IVA (19%)</span>
          <span style="color:#6b7a99;font-size:13px">${int(factura.impuestos):,} COP</span>
        </div>
        <div style="border-top:1px solid #e5e9f0;padding-top:12px;display:flex;justify-content:space-between;align-items:center">
          <span style="color:#0f1d3a;font-size:15px;font-weight:700">Total pagado</span>
          <span style="color:#059669;font-size:22px;font-weight:700">${int(factura.total):,} COP</span>
        </div>
      </div>
    </div>
    <div style="background:#f9fafc;border-top:1px solid #e5e9f0;padding:18px 36px;text-align:center">
      <p style="color:#b0bac9;font-size:11px;margin:0">Sistema de Gestión Logística · Correo generado automáticamente</p>
    </div>
  </div>
</body>
</html>"""

    texto = f"""Confirmación de pago — {factura.numero_factura}
Hola {cliente.nombre},
Confirmamos el pago de la factura {factura.numero_factura}.
Subtotal : ${int(factura.subtotal):,} COP
IVA 19%  : ${int(factura.impuestos):,} COP
Total    : ${int(factura.total):,} COP
"""

    msg = EmailMultiAlternatives(
        subject=f'✅ Pago confirmado — {factura.numero_factura}',
        body=texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[correo_cliente],
    )
    msg.attach_alternative(html, 'text/html')
    pdf_bytes = _generar_pdf_factura(factura)
    msg.attach(
        filename=f'{factura.numero_factura}.pdf',
        content=pdf_bytes,
        mimetype='application/pdf',
    )
    msg.send()