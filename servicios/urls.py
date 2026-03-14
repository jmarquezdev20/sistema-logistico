from rest_framework.routers import DefaultRouter
from .views import CatalogoServicioViewSet, ServicioPrestadoViewSet

router = DefaultRouter()
router.register(r'catalogo', CatalogoServicioViewSet, basename='catalogo')
router.register(r'prestados', ServicioPrestadoViewSet, basename='prestados')

urlpatterns = router.urls