from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.PagoViewSet, basename='pago')

urlpatterns = router.urls
