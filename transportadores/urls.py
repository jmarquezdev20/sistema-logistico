from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.TransportadorViewSet, basename='transportador')

urlpatterns = router.urls
