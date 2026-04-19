from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'usuarios', views.UsuarioViewSet, basename='usuario')

urlpatterns = [
    # JWT
    path('login/',   views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(),                name='token_refresh'),

    # Sesión
    path('logout/',  views.logout_view,  name='logout'),
    path('me/',      views.me_view,      name='me'),

    # Gestión de usuarios
    path('crear/',            views.crear_usuario,    name='crear-usuario'),
    path('cambiar-password/', views.cambiar_password, name='cambiar-password'),

    # CRUD usuarios (solo admin)
    path('', include(router.urls)),
]