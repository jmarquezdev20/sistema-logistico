from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Pago
from .serializers import PagoSerializer
from facturacion.models import Factura
from usuarios.permissions import EsAdmin


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.select_related('cliente', 'factura').all()
    serializer_class = PagoSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):
        if self.action == 'create':
            return [EsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Cliente solo ve sus propios pagos
        if hasattr(user, 'rol') and user.rol and user.rol.nombre == 'cliente':
            if hasattr(user, 'cliente') and user.cliente:
                return qs.filter(cliente=user.cliente)
            return qs.none()
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        factura_id = request.data.get('factura')
        try:
            factura = Factura.objects.select_for_update().get(id=factura_id)
        except Factura.DoesNotExist:
            return Response({'error': 'La factura no existe.'}, status=status.HTTP_400_BAD_REQUEST)

        if factura.estado == 'pagada':
            return Response({'error': 'Esta factura ya está registrada como pagada.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        factura.estado = 'pagada'
        factura.save()

        correo_enviado = False
        correo_cliente = getattr(factura.cliente, 'email', None)
        if correo_cliente:
            try:
                from facturacion.views import _enviar_correo_pago
                _enviar_correo_pago(factura, correo_cliente)
                correo_enviado = True
            except Exception as e:
                print(f'[Pagos] Error enviando correo a {correo_cliente}: {e}')

        return Response({
            **serializer.data,
            'correo_enviado': correo_enviado,
            'correo_destinatario': correo_cliente or None,
        }, status=status.HTTP_201_CREATED)