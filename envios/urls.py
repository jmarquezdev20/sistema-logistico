from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrdenEnvioViewSet, EnvioProductoViewSet

router = DefaultRouter()
router.register(r'ordenes', OrdenEnvioViewSet, basename='orden-envio')

urlpatterns = [
    path('', include(router.urls)),
    
    path(
        'ordenes/<uuid:orden_pk>/productos/',
        EnvioProductoViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='orden-productos-list'
    ),

    path(
        'ordenes/<uuid:orden_pk>/productos/<uuid:pk>/',
        EnvioProductoViewSet.as_view({'delete': 'destroy'}),
        name='orden-productos-detail'
    ),
]