from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'productos', views.ProductoViewSet, basename='producto')
router.register(r'inventarios', views.InventarioViewSet, basename='inventario')
router.register(r'movimientos', views.MovimientoInventarioViewSet, basename='movimiento')

urlpatterns = router.urls
