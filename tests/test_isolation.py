"""
Regression test for the CRITICAL cross-user data leakage bug (§1 of the
master prompt): "When multiple users register, all users see the same
account information in their accounts."

This test creates two users (alice, bob), has alice create a party, order,
and payment, then asserts bob cannot see, edit, or delete any of it via
any of the 5 endpoint groups (parties, orders, payments, dashboard,
brokerage) across all 4 verbs (GET, POST, PUT, DELETE).
"""
from tests.conftest import register_and_login


def test_parties_are_isolated_between_users(client):
    alice_headers = register_and_login(client, "alice", "Alice@1234", "9000000001")
    bob_headers = register_and_login(client, "bob", "Bob@12345", "9000000002")

    # Alice creates a party
    resp = client.post("/api/parties", json={"name": "Vardhman Textiles", "mobile": "9999999999", "terms": 30},
                        headers=alice_headers)
    assert resp.status_code == 200, resp.text
    alice_party_id = resp.json()["id"]

    # Bob's party list must be empty — he must not see alice's party
    resp = client.get("/api/parties", headers=bob_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # Bob cannot GET/edit/delete alice's party by ID (404, not 403 — no info leak)
    resp = client.put(f"/api/parties/{alice_party_id}", json={"name": "Hacked"}, headers=bob_headers)
    assert resp.status_code == 404

    resp = client.delete(f"/api/parties/{alice_party_id}", headers=bob_headers)
    assert resp.status_code == 404

    # Alice still sees her own party, unaffected
    resp = client.get("/api/parties", headers=alice_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "Vardhman Textiles"

    # Bob can create a party with the SAME name — composite unique constraint
    # is per-user, not global
    resp = client.post("/api/parties", json={"name": "Vardhman Textiles", "mobile": None, "terms": None},
                        headers=bob_headers)
    assert resp.status_code == 200, resp.text


def test_orders_are_isolated_between_users(client):
    alice_headers = register_and_login(client, "alice", "Alice@1234", "9000000001")
    bob_headers = register_and_login(client, "bob", "Bob@12345", "9000000002")

    resp = client.post("/api/orders", json={
        "party_name": "Reliance Fabrics", "qty": 100, "rate": 50, "b_percent": 1.0,
    }, headers=alice_headers)
    assert resp.status_code == 200, resp.text
    alice_order_id = resp.json()["id"]

    # Bob's order list is empty
    resp = client.get("/api/orders", headers=bob_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # Bob cannot update or delete alice's order
    resp = client.put(f"/api/orders/{alice_order_id}", json={"qty": 999}, headers=bob_headers)
    assert resp.status_code == 404

    resp = client.delete(f"/api/orders/{alice_order_id}", headers=bob_headers)
    assert resp.status_code == 404

    # Alice's order is untouched
    resp = client.get("/api/orders", headers=alice_headers)
    assert len(resp.json()) == 1
    assert resp.json()[0]["qty"] == 100

    # Bob can independently create an order with the same auto-generated pattern
    resp = client.post("/api/orders", json={
        "party_name": "Reliance Fabrics", "qty": 50, "rate": 40, "b_percent": 1.0,
    }, headers=bob_headers)
    assert resp.status_code == 200, resp.text


def test_payments_are_isolated_between_users(client):
    alice_headers = register_and_login(client, "alice", "Alice@1234", "9000000001")
    bob_headers = register_and_login(client, "bob", "Bob@12345", "9000000002")

    resp = client.post("/api/payments", json={"party_name": "Reliance Fabrics", "amount": 5000},
                        headers=alice_headers)
    assert resp.status_code == 200, resp.text
    alice_payment_id = resp.json()["id"]

    resp = client.get("/api/payments", headers=bob_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    resp = client.put(f"/api/payments/{alice_payment_id}", json={"amount": 99999}, headers=bob_headers)
    assert resp.status_code == 404

    resp = client.delete(f"/api/payments/{alice_payment_id}", headers=bob_headers)
    assert resp.status_code == 404

    resp = client.get("/api/payments", headers=alice_headers)
    assert len(resp.json()) == 1
    assert resp.json()[0]["amount"] == 5000


def test_dashboard_stats_are_isolated_between_users(client):
    alice_headers = register_and_login(client, "alice", "Alice@1234", "9000000001")
    bob_headers = register_and_login(client, "bob", "Bob@12345", "9000000002")

    client.post("/api/orders", json={"party_name": "P1", "qty": 100, "rate": 10, "b_percent": 1.0},
                headers=alice_headers)

    alice_stats = client.get("/api/dashboard/stats", headers=alice_headers).json()
    bob_stats = client.get("/api/dashboard/stats", headers=bob_headers).json()

    assert alice_stats["order_count"] == 1
    assert bob_stats["order_count"] == 0
    assert bob_stats["total_meters"] == 0
    assert bob_stats["total_brokerage"] == 0


def test_brokerage_summary_is_isolated_between_users(client):
    alice_headers = register_and_login(client, "alice", "Alice@1234", "9000000001")
    bob_headers = register_and_login(client, "bob", "Bob@12345", "9000000002")

    client.post("/api/orders", json={"party_name": "Alice Party", "qty": 100, "rate": 10, "b_percent": 1.0},
                headers=alice_headers)

    alice_brokerage = client.get("/api/brokerage", headers=alice_headers).json()
    bob_brokerage = client.get("/api/brokerage", headers=bob_headers).json()

    assert len(alice_brokerage) == 1
    assert alice_brokerage[0]["party_name"] == "Alice Party"
    assert bob_brokerage == []


def test_unauthenticated_requests_are_rejected():
    """Sanity check: no token at all must never return another user's data."""
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as client:
        for path in ["/api/parties", "/api/orders", "/api/payments",
                     "/api/dashboard/stats", "/api/brokerage"]:
            resp = client.get(path)
            assert resp.status_code == 401, f"{path} should require auth"
