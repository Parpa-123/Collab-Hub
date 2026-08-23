import logging
import os
import urllib.request
from django.conf import settings
from celery import shared_task

logger = logging.getLogger(__name__)



