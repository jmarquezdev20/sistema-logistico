from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'usuarios', views.UsuarioViewSet, basename='usuario')

urlpatterns = [
    path('login/',   views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(),                name='token_refresh'),
    path('logout/',  views.logout_view,                         name='logout'),
    path('me/',      views.me_view,                             name='me'),
    path('crear/',   views.crear_usuario,                       name='crear-usuario'),
    path('',         include(router.urls)),
]