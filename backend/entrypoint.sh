#!/usr/bin/env bash
# exit on error
set -o errexit

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

echo "Starting Gunicorn server..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000
