import uuid
from django.db import models
from usuarios.models import User


class RegistroAuditoria(models.Model):
    MODULOS = [
        ('envios',               'Envíos'),
        ('inventario',           'Inventario'),
        ('servicios',            'Servicios'),
        ('facturacion',          'Facturación'),
        ('pagos',                'Pagos'),
        ('clientes',             'Clientes'),
        ('usuarios',             'Usuarios'),
        ('transportadores',      'Transportadores'),   
        ('infraestructura_bodegas', 'Bodegas'),        
    ]

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='auditoria')
    modulo   = models.CharField(max_length=30, choices=MODULOS) 
    accion   = models.CharField(max_length=200)
    detalle  = models.TextField(blank=True)
    fecha    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Registro de Auditoría'

    def __str__(self):
        return f'{self.usuario} — {self.accion} [{self.fecha}]'