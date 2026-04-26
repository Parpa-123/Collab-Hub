from unittest.mock import Mock

from django.test import TestCase

from config.events.dispatcher import dispatch_event
from config.events.registry import EVENT_REGISTRY, get_handlers, register_handler


class EventRegistryAndDispatchTest(TestCase):
    def tearDown(self):
        EVENT_REGISTRY.pop("test_event_registry_dedupe", None)
        EVENT_REGISTRY.pop("test_event_dispatch_resilience", None)

    def test_register_handler_avoids_duplicates(self):
        event_type = "test_event_registry_dedupe"
        handler = Mock()

        register_handler(event_type, handler)
        register_handler(event_type, handler)

        self.assertEqual(len(get_handlers(event_type)), 1)

    def test_dispatch_event_continues_when_one_handler_fails(self):
        event_type = "test_event_dispatch_resilience"
        payload = {"value": 1}
        succeeding_handler = Mock()

        def failing_handler(_payload):
            raise RuntimeError("boom")

        register_handler(event_type, failing_handler)
        register_handler(event_type, succeeding_handler)

        dispatch_event(event_type, payload)

        succeeding_handler.assert_called_once_with(payload)
