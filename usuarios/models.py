import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class Rol(models.Model):
    ADMIN = 'admin'
    EMPLEADO = 'empleado'
    CLIENTE = 'cliente'
    CHOICES = [(ADMIN, 'Administrador'), (EMPLEADO, 'Empleado'), (CLIENTE, 'Cliente')]

    nombre = models.CharField(max_length=20, choices=CHOICES, unique=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios')
    #Vínculo opcional al cliente — solo aplica cuando rol = 'cliente'
    cliente = models.OneToOneField(
        'clientes.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usuario',
    )
    is_active = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

    @property
    def es_admin(self):
        return self.rol and self.rol.nombre == 'admin'

    @property
    def es_empleado(self):
        return self.rol and self.rol.nombre == 'empleado'

    @property
    def es_cliente(self):
        return self.rol and self.rol.nombre == 'cliente'

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'