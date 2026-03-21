from collections import defaultdict

EVENT_REGISTRY = defaultdict(list)

def register_handler(event_type, handler):
    """Register a handler for an event type"""
    EVENT_REGISTRY[event_type].append(handler)

def get_handlers(event_type):
    """Get all handlers for an event type"""
    return EVENT_REGISTRY.get(event_type, [])
