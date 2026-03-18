import uuid
from django.core.validators import MinValueValidator
from django.db import models
from clientes.models import Cliente
from transportadores.models import Transportador
from inventario.models import Producto

class OrdenEnvio(models.Model):
    PENDIENTE = 'pendiente'
    PREPARANDO = 'preparando'
    EN_TRANSITO = 'en_transito'
    ENTREGADO = 'entregado'
    ESTADO_CHOICES = [
        (PENDIENTE, 'Pendiente'), (PREPARANDO, 'Preparando'),
        (EN_TRANSITO, 'En Tránsito'), (ENTREGADO, 'Entregado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='ordenes_envio')
    transportador = models.ForeignKey(
        Transportador, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='ordenes'
    )
    destino = models.CharField(max_length=300)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=PENDIENTE)
    observacion = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_despacho = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Orden {self.id} - {self.cliente.nombre} [{self.estado}]'

    class Meta:
        verbose_name = 'Orden de Envío'
        verbose_name_plural = 'Órdenes de Envío'
        ordering = ['-fecha_creacion']


class EnvioProducto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orden_envio = models.ForeignKey(OrdenEnvio, on_delete=models.CASCADE, related_name='productos')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='envios')
    cantidad = models.IntegerField(validators=[MinValueValidator(1)])

    def __str__(self):
        return f'{self.producto.nombre} x{self.cantidad}'

    class Meta:
        verbose_name = 'Producto en Envío'
        verbose_name_plural = 'Productos en Envío'