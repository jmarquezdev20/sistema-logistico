"""
Modelos del módulo de facturación.

Gestiona el ciclo completo de facturación: generación de facturas
a partir de servicios prestados, desglose en detalles y control
de estados de pago.
"""

import uuid
from django.db import models, transaction
from clientes.models import Cliente
from servicios.models import ServicioPrestado


class Factura(models.Model):
    """
    Representa una factura de servicios logísticos emitida a un cliente.

    El número de factura (FAC-XXXX) se genera automáticamente al guardar
    usando select_for_update para evitar duplicados en entornos con múltiples
    workers simultáneos. Los valores de subtotal, impuestos y total son
    calculados en la vista al momento de generar y almacenados aquí
    para referencia histórica inmutable.

    Attributes:
        cliente:           Cliente al que se emite la factura.
        numero_factura:    Código único generado automáticamente (FAC-XXXX).
        fecha_emision:     Fecha de creación (automática).
        fecha_vencimiento: Fecha límite de pago.
        subtotal:          Suma de todos los servicios antes de impuestos.
        impuestos:         IVA del 19% calculado sobre el subtotal.
        total:             subtotal + impuestos.
        estado:            pendiente | pagada | vencida.
    """

    PENDIENTE = 'pendiente'
    PAGADA = 'pagada'
    VENCIDA = 'vencida'
    ESTADO_CHOICES = [
        (PENDIENTE, 'Pendiente'),
        (PAGADA,'Pagada'),
        (VENCIDA,'Vencida'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='facturas',
        help_text='Cliente al que se emite la factura.',
    )
    numero_factura = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        help_text='Generado automáticamente en formato FAC-XXXX.',
    )
    fecha_emision = models.DateField(
        auto_now_add=True,
        help_text='Fecha de creación de la factura (automática).',
    )
    fecha_vencimiento = models.DateField(
        help_text='Fecha límite de pago.',
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Suma de todos los servicios antes de impuestos.',
    )
    impuestos = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='IVA del 19% calculado sobre el subtotal.',
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Total a pagar: subtotal + impuestos.',
    )
    estado = models.CharField(
        max_length=10,
        choices=ESTADO_CHOICES,
        default=PENDIENTE,
        help_text='Estado actual de la factura.',
    )

    @staticmethod
    def _generar_numero_factura() -> str:
        """
        Genera el siguiente número de factura de forma segura ante concurrencia.

        Usa select_for_update para bloquear la última factura durante la lectura,
        evitando que dos requests simultáneos generen el mismo número (race condition).
        Solo cuenta facturas con prefijo FAC- para ignorar registros malformados.

        Returns:
            str: Número en formato FAC-XXXX (ej: FAC-0042).
        """
        last = (
            Factura.objects
            .select_for_update()
            .filter(numero_factura__startswith='FAC-')
            .order_by('-numero_factura')
            .first()
        )
        if last:
            try:
                num = int(last.numero_factura.split('-')[1]) + 1
            except (IndexError, ValueError):
                num = 1
        else:
            num = 1
        return f'FAC-{num:04d}'

    def save(self, *args, **kwargs):
        """
        Genera el número de factura automáticamente si no existe.

        Envuelve la generación en una transacción atómica para garantizar
        que el select_for_update de _generar_numero_factura sea efectivo.
        """
        if not self.numero_factura:
            with transaction.atomic():
                self.numero_factura = Factura._generar_numero_factura()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Retorna el número de factura y el nombre del cliente."""
        return f'{self.numero_factura} - {self.cliente.nombre}'

    class Meta:
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
        ordering = ['-fecha_emision']


class DetalleFactura(models.Model):
    """
    Representa una línea de detalle dentro de una factura.

    Cada DetalleFactura corresponde a un ServicioPrestado específico
    que fue incluido en la factura. Al eliminar una factura, sus
    detalles se eliminan en cascada.

    Attributes:
        factura:           Factura a la que pertenece este detalle.
        servicio_prestado: Servicio que origina este detalle.
        descripcion:       Nombre del servicio al momento de facturar.
        cantidad:          Cantidad del servicio prestado.
        valor_unitario:    Tarifa unitaria al momento de facturar.
        subtotal:          cantidad * valor_unitario.
    """

    id    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    factura = models.ForeignKey(
        Factura,
        on_delete=models.CASCADE,
        related_name='detalles',
        help_text='Factura a la que pertenece este detalle.',
    )
    servicio_prestado = models.ForeignKey(
        ServicioPrestado,
        on_delete=models.CASCADE,
        help_text='Servicio que origina este detalle.',
    )
    descripcion = models.CharField(
        max_length=300,
        help_text='Nombre del servicio al momento de facturar.',
    )
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Cantidad del servicio prestado.',
    )
    valor_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Tarifa unitaria al momento de facturar.',
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total de esta línea: cantidad * valor_unitario.',
    )

    def __str__(self) -> str:
        """Retorna la descripción del servicio y su subtotal."""
        return f'{self.descripcion} - ${self.subtotal}'

    class Meta:
        verbose_name = 'Detalle de Factura'
        verbose_name_plural = 'Detalles de Factura'