from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.contrib.auth.hashers import make_password
from django.conf import settings
from drf_spectacular.utils import extend_schema, OpenApiResponse
import secrets

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    LoginInputSerializer,
    LoginResponseSerializer,
    CrearUsuarioInputSerializer,
    CrearUsuarioResponseSerializer,
    CambiarPasswordInputSerializer,
    MensajeResponseSerializer,
)
from .models import User, Rol
from .permissions import EsAdmin


# Auth: Login

@extend_schema(
    tags=['auth'],
    summary="Iniciar sesión",
    description="Recibe email y password, retorna un par de tokens JWT (access + refresh).",
    request=LoginInputSerializer,
    responses={
        200: LoginResponseSerializer,
        401: OpenApiResponse(description="Credenciales inválidas"),
    }
)
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# Usuarios: CRUD completo (solo Admin)

@extend_schema(tags=['usuarios'])
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('rol', 'cliente').order_by('fecha_creacion')
    serializer_class = UserSerializer
    permission_classes = [EsAdmin]


# Auth: Logout

@extend_schema(
    tags=['auth'],
    summary="Cerrar sesión",
    description="Invalida la sesión del usuario autenticado.",
    request=None,
    responses={200: MensajeResponseSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    return Response({'mensaje': 'Logout exitoso.'}, status=status.HTTP_200_OK)


# Auth: Perfil del usuario autenticado

@extend_schema(
    tags=['auth'],
    summary="Perfil del usuario autenticado",
    description="Retorna los datos del usuario que hace la petición.",
    responses={200: UserSerializer},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# Auth: Crear usuario (Admin)

@extend_schema(
    tags=['auth'],
    summary="Crear usuario",
    description=(
        "Crea un nuevo usuario con contraseña temporal y le envía un correo de bienvenida. "
        "Solo accesible para administradores."
    ),
    request=CrearUsuarioInputSerializer,
    responses={
        201: CrearUsuarioResponseSerializer,
        400: OpenApiResponse(description="Datos inválidos o usuario ya existe"),
    },
)
@api_view(['POST'])
@permission_classes([EsAdmin])
def crear_usuario(request):
    input_serializer = CrearUsuarioInputSerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data       = input_serializer.validated_data
    email      = data['email']
    nombre     = data.get('nombre', '')
    rol_nombre = data['rol']
    cliente_id = data.get('cliente_id')

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Ya existe un usuario con ese correo.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rol = Rol.objects.get(nombre=rol_nombre)
    except Rol.DoesNotExist:
        return Response({'error': f'Rol "{rol_nombre}" no existe.'}, status=status.HTTP_400_BAD_REQUEST)

    password_temporal = secrets.token_urlsafe(10)

    user = User.objects.create(
        email=email,
        username=email,
        first_name=nombre,
        rol=rol,
        password=make_password(password_temporal),
    )

    if rol_nombre == 'cliente' and cliente_id:
        from clientes.models import Cliente
        try:
            user.cliente = Cliente.objects.get(id=cliente_id)
            user.save()
        except Cliente.DoesNotExist:
            pass

    correo_enviado = False
    try:
        _enviar_correo_bienvenida(user, password_temporal, rol_nombre)
        correo_enviado = True
    except Exception as e:
        print(f'[Usuarios] Error enviando correo a {email}: {e}')

    return Response({
        'id':               str(user.id),
        'email':            user.email,
        'rol':              rol_nombre,
        'password_temporal': password_temporal,
        'correo_enviado':   correo_enviado,
        'mensaje':          'Usuario creado correctamente.',
    }, status=status.HTTP_201_CREATED)



# Auth: Cambiar contraseña

@extend_schema(
    tags=['auth'],
    summary="Cambiar contraseña",
    description="Permite al usuario autenticado cambiar su contraseña actual.",
    request=CambiarPasswordInputSerializer,
    responses={
        200: MensajeResponseSerializer,
        400: OpenApiResponse(description="Datos inválidos o contraseña incorrecta"),
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cambiar_password(request):
    input_serializer = CambiarPasswordInputSerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data               = input_serializer.validated_data
    password_actual    = data['password_actual']
    password_nueva     = data['password_nueva']

    user = request.user

    if not user.check_password(password_actual):
        return Response({'error': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password_nueva)
    user.save()

    return Response({'mensaje': 'Contraseña actualizada correctamente.'}, status=status.HTTP_200_OK)


# Helper privado: envío de correo de bienvenida


def _enviar_correo_bienvenida(user, password_temporal, rol_nombre):
    from django.core.mail import EmailMultiAlternatives

    FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    ROL_LABELS = {
        'admin':    'Administrador',
        'empleado': 'Empleado',
        'cliente':  'Cliente',
    }
    rol_label      = ROL_LABELS.get(rol_nombre, rol_nombre.capitalize())
    nombre_display = user.first_name or user.email

    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,29,58,0.1)">

    <div style="background:#0f1d3a;padding:30px 36px">
      <p style="color:#7b9bc7;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px">
        Bienvenido al sistema
      </p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0">BodegaXpress</h1>
      <p style="color:#b4c8e6;font-size:13px;margin:6px 0 0">Gestión Logística</p>
    </div>

    <div style="padding:32px 36px">
      <p style="color:#1e2a3b;font-size:15px;margin:0 0 8px">
        Hola, <strong>{nombre_display}</strong>
      </p>
      <p style="color:#6b7a99;font-size:14px;margin:0 0 28px;line-height:1.65">
        El administrador ha creado tu cuenta en el sistema con el rol de
        <strong style="color:#0f1d3a">{rol_label}</strong>.
        A continuación encontrarás tus credenciales de acceso:
      </p>

      <div style="background:#f9fafc;border:1px solid #e5e9f0;border-radius:8px;padding:20px 24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="color:#8a97ad;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:6px 0">
              Correo electrónico
            </td>
            <td style="color:#1e2a3b;font-size:14px;font-weight:600;text-align:right;padding:6px 0">
              {user.email}
            </td>
          </tr>
          <tr>
            <td style="color:#8a97ad;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:6px 0;border-top:1px solid #e5e9f0">
              Contraseña temporal
            </td>
            <td style="text-align:right;padding:6px 0;border-top:1px solid #e5e9f0">
              <span style="background:#0f1d3a;color:#ffffff;font-family:monospace;font-size:15px;font-weight:700;padding:4px 12px;border-radius:4px;letter-spacing:0.05em">
                {password_temporal}
              </span>
            </td>
          </tr>
          <tr>
            <td style="color:#8a97ad;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:6px 0;border-top:1px solid #e5e9f0">
              Rol asignado
            </td>
            <td style="color:#4f8ef7;font-size:14px;font-weight:600;text-align:right;padding:6px 0;border-top:1px solid #e5e9f0">
              {rol_label}
            </td>
          </tr>
        </table>
      </div>

      <div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;margin-bottom:28px">
        <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 4px">
          Cambia tu contraseña al ingresar por primera vez
        </p>
        <p style="color:#78350f;font-size:12px;margin:0;line-height:1.5">
          Esta es una contraseña temporal. Por seguridad, te recomendamos cambiarla
          inmediatamente después de iniciar sesión.
        </p>
      </div>

      <p style="color:#6b7a99;font-size:13px;margin:0">
        Puedes ingresar al sistema en:
        <a href="{FRONTEND_URL}" style="color:#4f8ef7;font-weight:600">
          {FRONTEND_URL}
        </a>
      </p>
    </div>

    <div style="background:#f9fafc;border-top:1px solid #e5e9f0;padding:18px 36px;text-align:center">
      <p style="color:#b0bac9;font-size:11px;margin:0">
        BodegaXpress · Sistema de Gestión Logística · Correo generado automáticamente
      </p>
    </div>

  </div>
</body>
</html>"""

    texto = f"""Bienvenido a BodegaXpress - Gestión Logística

Hola {nombre_display},

El administrador ha creado tu cuenta con el rol de {rol_label}.

Tus credenciales de acceso:
  Correo:              {user.email}
  Contraseña temporal: {password_temporal}
  Rol:                 {rol_label}

Cambia tu contraseña al ingresar por primera vez.

Ingresa en: {FRONTEND_URL}

BodegaXpress · Correo generado automáticamente
"""

    msg = EmailMultiAlternatives(
        subject='🎉 Bienvenido a BodegaXpress — Tus credenciales de acceso',
        body=texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    msg.attach_alternative(html, 'text/html')
    msg.send()