"""
Modelos del módulo de pagos.

Registra los pagos realizados por clientes contra sus facturas.
Al registrar un pago, la factura asociada se marca automáticamente
como pagada mediante el método save() del modelo.
"""

import uuid
from django.db import models
from clientes.models import Cliente
from facturacion.models import Factura
from usuarios.models import User


class Pago(models.Model):
    """
    Registra el pago de una factura por parte de un cliente.

    Al guardar (método save), marca automáticamente la factura asociada
    como PAGADA. Esto garantiza consistencia — no puede existir un Pago
    sin que su factura quede reflejada como pagada.

    La factura usa SET_NULL si es eliminada, pero el registro del pago
    se conserva para auditoría financiera histórica.

    Attributes:
        factura:        Factura que se está pagando. Null si fue eliminada.
        cliente:        Cliente que realiza el pago.
        monto:          Monto total pagado.
        metodo_pago:    Forma de pago utilizada.
        referencia:     Número de transferencia, cheque u otro comprobante.
        fecha_pago:     Fecha en que se realizó el pago.
        registrado_por: Usuario admin que registró el pago en el sistema.
        observacion:    Notas adicionales opcionales.
    """

    EFECTIVO       = 'efectivo'
    TRANSFERENCIA  = 'transferencia'
    CHEQUE         = 'cheque'
    TARJETA        = 'tarjeta'
    METODO_CHOICES = [
        (EFECTIVO,      'Efectivo'),
        (TRANSFERENCIA, 'Transferencia'),
        (CHEQUE,        'Cheque'),
        (TARJETA,       'Tarjeta'),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    factura        = models.ForeignKey(
        Factura,
        on_delete=models.SET_NULL,
        null=True,
        related_name='pagos',
        help_text='Factura que se está pagando. Se conserva null si la factura es eliminada.',
    )
    cliente        = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='pagos',
        help_text='Cliente que realiza el pago.',
    )
    monto          = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Monto total pagado en COP.',
    )
    metodo_pago    = models.CharField(
        max_length=20,
        choices=METODO_CHOICES,
        help_text='Forma de pago utilizada.',
    )
    referencia     = models.CharField(
        max_length=100,
        blank=True,
        help_text='Número de transferencia, cheque u otro comprobante.',
    )
    fecha_pago     = models.DateField(
        help_text='Fecha en que se realizó el pago.',
    )
    registrado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        help_text='Usuario admin que registró el pago en el sistema.',
    )
    observacion    = models.TextField(
        blank=True,
        help_text='Notas adicionales opcionales.',
    )

    def save(self, *args, **kwargs):
        """
        Guarda el pago y marca la factura asociada como pagada.

        El efecto secundario sobre la factura es intencional — garantiza
        que ambos registros estén siempre sincronizados sin necesidad
        de lógica adicional en la vista.
        """
        super().save(*args, **kwargs)
        if self.factura:
            self.factura.estado = Factura.PAGADA
            self.factura.save()

    def __str__(self) -> str:
        """Retorna el ID del pago, nombre del cliente y monto."""
        return f'Pago {self.id} - {self.cliente.nombre} ${self.monto}'

    class Meta:
        verbose_name        = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering            = ['-fecha_pago']