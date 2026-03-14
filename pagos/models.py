import uuid
from django.db import models
from clientes.models import Cliente
from facturacion.models import Factura
from usuarios.models import User


class Pago(models.Model):
    EFECTIVO = 'efectivo'
    TRANSFERENCIA = 'transferencia'
    CHEQUE = 'cheque'
    TARJETA = 'tarjeta'
    METODO_CHOICES = [
        (EFECTIVO, 'Efectivo'), (TRANSFERENCIA, 'Transferencia'),
        (CHEQUE, 'Cheque'), (TARJETA, 'Tarjeta'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    factura = models.ForeignKey(Factura, on_delete=models.SET_NULL, null=True, related_name='pagos')
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='pagos')
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODO_CHOICES)
    referencia = models.CharField(max_length=100, blank=True)
    fecha_pago = models.DateField()
    registrado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    observacion = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.factura:
            self.factura.estado = Factura.PAGADA
            self.factura.save()

    def __str__(self):
        return f'Pago {self.id} - {self.cliente.nombre} ${self.monto}'

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha_pago']
