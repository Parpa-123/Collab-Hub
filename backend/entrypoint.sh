#!/usr/bin/env bash
set -o errexit

echo "Checking external services..."

# Wait for Redis if configured
if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    echo "Waiting for Redis ($REDIS_HOST:$REDIS_PORT)..."
    while ! nc -z "$REDIS_HOST" "$REDIS_PORT"; do
        sleep 0.5
    done
    echo "Redis is up!"
fi

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running database migrations..."
python manage.py migrate

cat <<EOF | python manage.py shell
import os
from django.contrib.auth import get_user_model

User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

if email and password:
    if not User.objects.filter(email=email).exists():
        User.objects.create_superuser(email=email, password=password)
        print(f"Superuser {email} created successfully!")
    else:
        print(f"Superuser {email} already exists.")
EOF

if [ "$#" -eq 0 ]; then
  set -- daphne -b 0.0.0.0 -p 8000 config.asgi:application
fi

echo "Starting application server: $*"
exec "$@"

