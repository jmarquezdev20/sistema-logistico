# Sistema de Gestión de Bodegas y Servicios Logísticos

## Stack
- **Backend:** Python 3.13 + Django 5 + DRF
- **Base de datos:** PostgreSQL 16
- **Frontend:** React + Vite
- **Auth:** JWT (djangorestframework-simplejwt)
- **Docs:** Swagger en `/api/docs/`
- **Infraestructura:** Docker + Docker Compose

## Inicio rápido

```bash
docker-compose up --build
```

Luego, en otra terminal:
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

## URLs
- Frontend: http://localhost:5173
- API: http://localhost:8000/api/
- Swagger: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/admin/

## Apps Django
| App | Modelos | URL base |
|-----|---------|----------|
| usuarios | User, Rol | /api/auth/ |
| clientes | Cliente | /api/clientes/ |
| infraestructura_bodegas | Bodega, Ubicacion | /api/infraestructura/ |
| transportadores | Transportador | /api/transportadores/ |
| inventario | Producto, Inventario, MovimientoInventario | /api/inventario/ |
| envios | OrdenEnvio, EnvioProducto | /api/envios/ |
| servicios | CatalogoServicio, ServicioPrestado | /api/servicios/ |
| facturacion | Factura, DetalleFactura | /api/facturacion/ |
| pagos | Pago | /api/pagos/ |

## Flujo de despacho automático
1. Crear OrdenEnvio con productos
2. POST `/api/envios/ordenes/{id}/despachar/` → genera salidas de inventario + ServicioPrestado automáticamente

## Facturación
- POST `/api/facturacion/facturas/generar/` con `{cliente, fecha_vencimiento}` → agrupa todos los ServiciosPrestados no facturados

## Roles
- `admin`: acceso total
- `empleado`: inventario, envíos, movimientos
- `cliente`: solo lectura de sus datos
