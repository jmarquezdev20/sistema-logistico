from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.contrib.auth.hashers import make_password
from django.conf import settings
import secrets
from .serializers import CustomTokenObtainPairSerializer, UserSerializer
from .models import User, Rol
from .permissions import EsAdmin


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('rol', 'cliente').order_by('fecha_creacion')
    serializer_class = UserSerializer
    permission_classes = [EsAdmin]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    return Response({'message': 'Logout exitoso.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([EsAdmin])
def crear_usuario(request):
    email      = request.data.get('email')
    nombre     = request.data.get('nombre', '')
    rol_nombre = request.data.get('rol')
    cliente_id = request.data.get('cliente_id')

    if not email or not rol_nombre:
        return Response({'error': 'email y rol son requeridos.'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Ya existe un usuario con ese correo.'}, status=400)

    try:
        rol = Rol.objects.get(nombre=rol_nombre)
    except Rol.DoesNotExist:
        return Response({'error': f'Rol "{rol_nombre}" no existe.'}, status=400)

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

    # ✅ Devuelve la contraseña temporal para que el admin la copie
    return Response({
        'id': str(user.id),
        'email': user.email,
        'rol': rol_nombre,
        'password_temporal': password_temporal,
        'mensaje': 'Usuario creado correctamente.',
    }, status=status.HTTP_201_CREATED)