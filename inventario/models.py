import uuid
from django.core.validators import MinValueValidator
from django.db import models
from clientes.models import Cliente
from infraestructura_bodegas.models import Ubicacion


class Producto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='productos')
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)

    class Meta:
        unique_together = ('cliente', 'nombre')

    def __str__(self):
        return self.nombre


class Inventario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producto = models.OneToOneField(Producto, on_delete=models.CASCADE, related_name='inventario')
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.CASCADE, related_name='inventarios')
    cantidad = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.producto.nombre} - Stock: {self.cantidad}'

    class Meta:
        verbose_name = 'Inventario'
        verbose_name_plural = 'Inventarios'


class MovimientoInventario(models.Model):
    ENTRADA = 'entrada'
    SALIDA = 'salida'
    TIPO_CHOICES = [(ENTRADA, 'Entrada'), (SALIDA, 'Salida')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.IntegerField(validators=[MinValueValidator(1)])
    observacion = models.TextField(blank=True)
    # FK a EnvioProducto se define via string para evitar importación circular
    envio_producto = models.ForeignKey(
        'envios.EnvioProducto',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='movimientos'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.tipo} - {self.producto.nombre} x{self.cantidad}'

    class Meta:
        verbose_name = 'Movimiento de Inventario'
        verbose_name_plural = 'Movimientos de Inventario'
        ordering = ['-fecha_creacion']
