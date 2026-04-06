from django.http import JsonResponse
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

def home(request):
    return JsonResponse({
        "status": "ok",
        "mensaje": "API Sistema Logístico funcionando 🚀"
    })

urlpatterns = [
    path('', home),  

    path('admin/', admin.site.urls),

    # Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Apps
    path('api/auth/', include('usuarios.urls')),
    path('api/clientes/', include('clientes.urls')),
    path('api/infraestructura/', include('infraestructura_bodegas.urls')),
    path('api/transportadores/', include('transportadores.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/envios/', include('envios.urls')),
    path('api/servicios/', include('servicios.urls')),
    path('api/facturacion/', include('facturacion.urls')),
    path('api/pagos/', include('pagos.urls')),
    path('api/', include('auditoria.urls')),
]