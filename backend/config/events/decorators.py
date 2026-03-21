from .registry import register_handler

def event_handler(event_type):
    """Decorator to register an event handler"""
    def decorator(func):
        register_handler(event_type, func)
        return func
    return decorator