import uuid
from django.db import models, transaction
from clientes.models import Cliente
from servicios.models import ServicioPrestado


class Factura(models.Model):
    PENDIENTE = 'pendiente'
    PAGADA = 'pagada'
    VENCIDA = 'vencida'
    ESTADO_CHOICES = [(PENDIENTE, 'Pendiente'), (PAGADA, 'Pagada'), (VENCIDA, 'Vencida')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='facturas')
    numero_factura = models.CharField(max_length=20, unique=True, blank=True)
    fecha_emision = models.DateField(auto_now_add=True)
    fecha_vencimiento = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    impuestos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default=PENDIENTE)

    @staticmethod
    def _generar_numero_factura():
        """Genera el siguiente número de factura de forma segura ante concurrencia."""
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
        if not self.numero_factura:
            with transaction.atomic():
                self.numero_factura = Factura._generar_numero_factura()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.numero_factura} - {self.cliente.nombre}'

    class Meta:
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
        ordering = ['-fecha_emision']


class DetalleFactura(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE, related_name='detalles')
    servicio_prestado = models.ForeignKey(ServicioPrestado, on_delete=models.CASCADE)
    descripcion = models.CharField(max_length=300)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f'{self.descripcion} - ${self.subtotal}'

    class Meta:
        verbose_name = 'Detalle de Factura'
        verbose_name_plural = 'Detalles de Factura'