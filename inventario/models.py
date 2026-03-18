"""
Modelos del módulo de inventario.

Gestiona el ciclo completo de productos: registro, ubicación en bodega,
control de stock y trazabilidad de movimientos de entrada y salida.
"""

import uuid
from django.core.validators import MinValueValidator
from django.db import models
from clientes.models import Cliente
from infraestructura_bodegas.models import Ubicacion


class Producto(models.Model):
    """
    Representa un producto registrado en el sistema logístico.

    Cada producto pertenece a un cliente específico y debe tener
    un nombre único por cliente (unique_together). Se crea siempre
    junto a un registro de Inventario que define su ubicación inicial.

    Attributes:
        cliente: Cliente propietario del producto.
        nombre: Nombre descriptivo del producto.
        descripcion: Información adicional opcional.
    """

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente     = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='productos',
        help_text='Cliente propietario del producto.',
    )
    nombre      = models.CharField(
        max_length=200,
        help_text='Nombre único del producto por cliente.',
    )
    descripcion = models.TextField(
        blank=True,
        help_text='Descripción o características adicionales.',
    )

    def __str__(self) -> str:
        """Retorna el nombre del producto."""
        return self.nombre

    class Meta:
        unique_together = ('cliente', 'nombre')
        ordering        = ['nombre']


class Inventario(models.Model):
    """
    Registra el stock actual de un producto en una ubicación de bodega.

    Relación OneToOne con Producto — cada producto tiene exactamente
    una ubicación asignada. La cantidad nunca puede ser negativa
    (MinValueValidator). Todos los cambios de stock deben realizarse
    a través de MovimientoInventario para mantener trazabilidad completa.

    Attributes:
        producto: Producto al que pertenece este inventario.
        ubicacion: Ubicación física dentro de la bodega.
        cantidad: Stock actual disponible (nunca negativo).
        fecha_actualizacion: Se actualiza automáticamente en cada save().
        fecha_creacion: Timestamp de creación del registro.
    """

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producto            = models.OneToOneField(
        Producto,
        on_delete=models.CASCADE,
        related_name='inventario',
        help_text='Producto al que pertenece este inventario.',
    )
    ubicacion           = models.ForeignKey(
        Ubicacion,
        on_delete=models.CASCADE,
        related_name='inventarios',
        help_text='Ubicación física dentro de la bodega.',
    )
    cantidad            = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Stock actual disponible. Nunca puede ser negativo.',
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        help_text='Se actualiza automáticamente en cada modificación.',
    )
    fecha_creacion      = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        """Retorna el nombre del producto y su stock actual."""
        return f'{self.producto.nombre} - Stock: {self.cantidad}'

    class Meta:
        verbose_name        = 'Inventario'
        verbose_name_plural = 'Inventarios'
        ordering            = ['producto__nombre']


class MovimientoInventario(models.Model):
    """
    Registra cada entrada o salida de stock de un producto.

    Es la fuente de verdad para la trazabilidad del inventario.
    Cada cambio de cantidad en Inventario debe respaldarse con
    un registro aquí. Los movimientos originados por despachos
    se vinculan al EnvioProducto correspondiente.

    Attributes:
        producto: Producto afectado por el movimiento.
        tipo: 'entrada' para ingresos, 'salida' para despachos.
        cantidad: Unidades movidas (mínimo 1).
        observacion: Contexto adicional del movimiento.
        envio_producto: Vinculo al despacho si la salida fue automática.
        fecha_creacion: Timestamp automático del movimiento.
    """

    ENTRADA      = 'entrada'
    SALIDA       = 'salida'
    TIPO_CHOICES = [(ENTRADA, 'Entrada'), (SALIDA, 'Salida')]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producto       = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='movimientos',
        help_text='Producto afectado por el movimiento.',
    )
    tipo           = models.CharField(
        max_length=10,
        choices=TIPO_CHOICES,
        help_text="'entrada' para ingresos, 'salida' para despachos.",
    )
    cantidad       = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text='Unidades movidas. Mínimo 1.',
    )
    observacion    = models.TextField(
        blank=True,
        help_text='Contexto adicional del movimiento.',
    )
    envio_producto = models.ForeignKey(
        'envios.EnvioProducto',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos',
        help_text='Vínculo al despacho si la salida fue automática.',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        """Retorna tipo, nombre del producto y cantidad del movimiento."""
        return f'{self.tipo} - {self.producto.nombre} x{self.cantidad}'

    class Meta:
        verbose_name        = 'Movimiento de Inventario'
        verbose_name_plural = 'Movimientos de Inventario'
        ordering            = ['-fecha_creacion']