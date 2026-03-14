import uuid
from django.db import models
from clientes.models import Cliente
from envios.models import OrdenEnvio


class CatalogoServicio(models.Model):
    POR_DIA = 'por_dia'
    POR_ENVIO = 'por_envio'
    POR_RECEPCION = 'por_recepcion'
    UNITARIO = 'unitario'
    UNIDAD_CHOICES = [
        (POR_DIA, 'Por día'),
        (POR_ENVIO, 'Por envío'),
        (POR_RECEPCION, 'Por recepción'),
        (UNITARIO, 'Unitario'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    tarifa = models.DecimalField(max_digits=10, decimal_places=2)
    unidad = models.CharField(max_length=20, choices=UNIDAD_CHOICES)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.nombre} - ${self.tarifa}/{self.unidad}'

    class Meta:
        verbose_name = 'Catálogo de Servicio'
        verbose_name_plural = 'Catálogo de Servicios'


class ServicioPrestado(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='servicios_prestados')
    catalogo_servicio = models.ForeignKey(CatalogoServicio, on_delete=models.CASCADE)
    orden_envio = models.ForeignKey(
        OrdenEnvio, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='servicios'
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateField()
    facturado = models.BooleanField(default=False)
    observacion = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        self.valor_total = self.cantidad * self.valor_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.catalogo_servicio.nombre} - {self.cliente.nombre} - ${self.valor_total}'

    class Meta:
        verbose_name = 'Servicio Prestado'
        verbose_name_plural = 'Servicios Prestados'
        ordering = ['-fecha']