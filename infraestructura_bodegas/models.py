import uuid
from django.db import models


class Bodega(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=200)
    capacidad = models.IntegerField()
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Bodega'
        verbose_name_plural = 'Bodegas'


class Ubicacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bodega = models.ForeignKey(Bodega, on_delete=models.CASCADE, related_name='ubicaciones')
    codigo = models.CharField(max_length=50, db_index=True)
    capacidad = models.IntegerField()

    def __str__(self):
        return f'{self.bodega.nombre} - {self.codigo}'

    class Meta:
        verbose_name = 'Ubicación'
        verbose_name_plural = 'Ubicaciones'
        unique_together = ('bodega', 'codigo')
