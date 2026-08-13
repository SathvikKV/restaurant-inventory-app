import pytest
from app.routers.inventory import resolve_actor_info

@pytest.fixture
def mock_users_map():
    class DummyRole:
        def __init__(self, value):
            self.value = value

    class DummyUser:
        def __init__(self, name, phone, role_val):
            self.name = name
            self.phone = phone
            self.role = DummyRole(role_val)

    return {
        "by_id": {
            "uuid-owner": DummyUser("Alice Owner", "9876543210", "owner"),
            "uuid-manager": DummyUser("Bob Manager", None, "manager"),
        },
        "by_name": {
            "alice owner": DummyUser("Alice Owner", "9876543210", "owner"),
            "9876543210": DummyUser("Alice Owner", "9876543210", "owner"),
        }
    }

def test_resolve_actor_info_known_user(mock_users_map):
    # Lookup by ID
    name, role = resolve_actor_info("uuid-owner", mock_users_map)
    assert name == "Alice Owner"
    assert role == "owner"

    name, role = resolve_actor_info("uuid-manager", mock_users_map)
    assert name == "Bob Manager"
    assert role == "manager"

    # Lookup by Name
    name, role = resolve_actor_info("Alice Owner", mock_users_map)
    assert name == "Alice Owner"
    assert role == "owner"

    # Lookup by Phone
    name, role = resolve_actor_info("9876543210", mock_users_map)
    assert name == "Alice Owner"
    assert role == "owner"

def test_resolve_actor_info_fallback(mock_users_map):
    # None or unknown
    name, role = resolve_actor_info(None, mock_users_map)
    assert name == "System (Auto)"
    assert role == "system"

    name, role = resolve_actor_info("Unknown", mock_users_map)
    assert name == "System (Auto)"
    assert role == "system"

    name, role = resolve_actor_info("", mock_users_map)
    assert name == "System (Auto)"
    assert role == "system"

    # System keywords
    name, role = resolve_actor_info("Mise Integration", mock_users_map)
    assert name == "Mise Integration"
    assert role == "system"
    
    name, role = resolve_actor_info("Auto Bot", mock_users_map)
    assert name == "Auto Bot"
    assert role == "system"

    # Unrecognized user string (fallback to just returning the string as name and "manager" as role)
    name, role = resolve_actor_info("Charlie Chef", mock_users_map)
    assert name == "Charlie Chef"
    assert role == "manager"
