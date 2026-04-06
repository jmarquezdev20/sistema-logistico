from django.contrib.auth import get_user_model

User = get_user_model()

if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser(
        username="admin",
        email="admin@gmail.com",
        password="admin1234"
    )
    print("✅ Usuario creado en producción")
else:
    print("⚠️ Ya existe")