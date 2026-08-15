import logging
import os
import urllib.request
from django.conf import settings
from celery import shared_task

logger = logging.getLogger(__name__)


class LocalLoopbackRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Don't follow automatic redirects if redirected to https://127.0.0.1 or https://localhost
        if newurl.startswith("https://127.0.0.1") or newurl.startswith("https://localhost"):
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def get_health_target_url() -> str:
    """Determine the health ping target URL from environment settings."""
    health_url = os.getenv("HEALTH_PING_URL")
    if health_url:
        return health_url.strip()

    backend_url = os.getenv("BACKEND_URL")
    if backend_url:
        return f"{backend_url.rstrip('/')}/api/health/"

    render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
    if render_host:
        return f"https://{render_host}/api/health/"

    return "http://127.0.0.1:8000/api/health/"


@shared_task(name="common.tasks.ping_health_endpoint")
def ping_health_endpoint():
    """Periodic task running every 180 seconds to ping health check endpoint."""
    target_url = get_health_target_url()
    
    headers = {
        "User-Agent": "CollabHub-HealthWorker/1.0",
        "X-Forwarded-Proto": "http" if "127.0.0.1" in target_url or "localhost" in target_url else "https",
    }

    try:
        req = urllib.request.Request(target_url, headers=headers)
        opener = urllib.request.build_opener(LocalLoopbackRedirectHandler())
        with opener.open(req, timeout=10) as response:
            status_code = response.status
            body = response.read().decode("utf-8")
            logger.info("Health ping to %s succeeded [HTTP %s]: %s", target_url, status_code, body)
            return {"status": status_code, "body": body}
    except Exception as exc:
        logger.warning("Health ping to %s failed: %s", target_url, str(exc))
        return {"error": str(exc)}
