import uuid
from django.db import models


class Transportador(models.Model):
    MOTO = 'moto'
    CAMIONETA = 'camioneta'
    CAMION = 'camion'
    FURGON = 'furgon'
    TIPO_CHOICES = [
        (MOTO, 'Moto'), (CAMIONETA, 'Camioneta'),
        (CAMION, 'Camión'), (FURGON, 'Furgón'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20)
    placa_vehiculo = models.CharField(max_length=20)
    tipo_vehiculo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.nombre} ({self.placa_vehiculo})'

    class Meta:
        verbose_name = 'Transportador'
        verbose_name_plural = 'Transportadores'
        ordering = ['nombre']