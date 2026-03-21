from .registry import get_handlers

def dispatch_event(event_type, data):
    """Dispatch an event to all registered handlers"""
    handlers = get_handlers(event_type)
    for handler in handlers:
        handler(data)

    