import logging

from .registry import get_handlers

logger = logging.getLogger(__name__)

def dispatch_event(event_type, data):
    """Dispatch an event to all registered handlers"""
    handlers = get_handlers(event_type)
    for handler in handlers:
        try:
            handler(data)
        except Exception:
            logger.exception("Event handler %s failed for event %s", getattr(handler, "__name__", repr(handler)), event_type)

    
