import logging
import os
import urllib.request
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="common.tasks.ping_health_endpoint")
def ping_health_endpoint():
    """Periodic task running every 45 seconds to ping health check endpoint."""
    target_url = os.environ.get("HEALTH_PING_URL", "http://127.0.0.1:8000/api/health/")
    try:
        req = urllib.request.Request(
            target_url,
            headers={"User-Agent": "CollabHub-HealthWorker/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.status
            body = response.read().decode("utf-8")
            logger.info("Health ping to %s succeeded [HTTP %s]: %s", target_url, status_code, body)
            return {"status": status_code, "body": body}
    except Exception as exc:
        logger.warning("Health ping to %s failed: %s", target_url, str(exc))
        return {"error": str(exc)}
