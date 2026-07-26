#!/usr/bin/env bash
set -o errexit

echo "Checking external services..."

# Wait for Redis if configured
if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    echo "Waiting for Redis ($REDIS_HOST:$REDIS_PORT)..."
    count=0
    while ! nc -z -w 2 "$REDIS_HOST" "$REDIS_PORT"; do
        sleep 0.5
        count=$((count+1))
        if [ "$count" -ge 10 ]; then
            echo "Warning: Redis check timed out, proceeding..."
            break
        fi
    done
    echo "Redis check finished."
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

if [ "$1" != "celery" ]; then
    echo "Starting Celery worker in background..."
    celery -A config worker --loglevel=info --concurrency=1 &
fi

echo "Starting application server: $*"
exec "$@"

