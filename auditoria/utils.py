def registrar(usuario, modulo, accion, detalle=''):
    try:
        from .models import RegistroAuditoria
        RegistroAuditoria.objects.create(
            usuario=usuario,
            modulo=modulo,
            accion=accion,
            detalle=detalle,
        )
    except Exception as e:
        print(f'[Auditoría] Error registrando: {e}')