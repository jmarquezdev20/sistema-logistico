from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'facturas', views.FacturaViewSet, basename='factura')

urlpatterns = router.urls
