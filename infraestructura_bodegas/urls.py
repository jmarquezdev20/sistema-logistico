from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'bodegas', views.BodegaViewSet, basename='bodega')
router.register(r'ubicaciones', views.UbicacionViewSet, basename='ubicacion')

urlpatterns = router.urls
