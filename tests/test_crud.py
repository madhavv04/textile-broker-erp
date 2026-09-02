from tests.conftest import register_and_login


def test_party_crud_lifecycle(client):
    headers = register_and_login(client)

    resp = client.post("/api/parties", json={"name": "Test Party", "mobile": "9998887777", "terms": 15},
                        headers=headers)
    assert resp.status_code == 200
    party_id = resp.json()["id"]

    resp = client.get("/api/parties", headers=headers)
    assert len(resp.json()) == 1

    resp = client.put(f"/api/parties/{party_id}", json={"terms": 30}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["terms"] == 30

    resp = client.delete(f"/api/parties/{party_id}", headers=headers)
    assert resp.status_code == 200

    resp = client.get("/api/parties", headers=headers)
    assert resp.json() == []


def test_duplicate_party_name_same_user_rejected(client):
    headers = register_and_login(client)
    client.post("/api/parties", json={"name": "Dup Co", "mobile": None, "terms": None}, headers=headers)
    resp = client.post("/api/parties", json={"name": "Dup Co", "mobile": None, "terms": None}, headers=headers)
    assert resp.status_code == 400
    assert "already" in resp.json()["detail"].lower()


def test_order_lifecycle_and_calculations(client):
    headers = register_and_login(client)
    resp = client.post("/api/orders", json={
        "party_name": "Order Party", "qty": 200, "rate": 25, "b_percent": 2.0,
    }, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["value"] == 200 * 25
    assert body["b_value"] == (200 * 25) * 2.0 / 100.0
    order_id = body["id"]

    resp = client.put(f"/api/orders/{order_id}", json={"qty": 300}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["value"] == 300 * 25  # recalculated

    resp = client.delete(f"/api/orders/{order_id}", headers=headers)
    assert resp.status_code == 200


def test_order_auto_generates_order_number(client):
    headers = register_and_login(client)
    resp = client.post("/api/orders", json={
        "party_name": "Auto No Party", "qty": 10, "rate": 5, "b_percent": 1.0,
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["no"].startswith("ORD-")


def test_invalid_date_format_rejected(client):
    headers = register_and_login(client)
    resp = client.post("/api/orders", json={
        "party_name": "Date Party", "qty": 10, "rate": 5, "date": "29-08-2026",
    }, headers=headers)
    assert resp.status_code == 422


def test_payment_lifecycle(client):
    headers = register_and_login(client)
    resp = client.post("/api/payments", json={"party_name": "Pay Party", "amount": 1000}, headers=headers)
    assert resp.status_code == 200
    payment_id = resp.json()["id"]

    resp = client.put(f"/api/payments/{payment_id}", json={"amount": 1500}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["amount"] == 1500

    resp = client.delete(f"/api/payments/{payment_id}", headers=headers)
    assert resp.status_code == 200


def test_deleting_party_cascades_to_orders_and_payments(client):
    headers = register_and_login(client)
    client.post("/api/orders", json={"party_name": "Cascade Party", "qty": 10, "rate": 5}, headers=headers)
    client.post("/api/payments", json={"party_name": "Cascade Party", "amount": 100}, headers=headers)

    parties = client.get("/api/parties", headers=headers).json()
    party_id = next(p["id"] for p in parties if p["name"] == "Cascade Party")

    resp = client.delete(f"/api/parties/{party_id}", headers=headers)
    assert resp.status_code == 200

    orders = client.get("/api/orders", headers=headers).json()
    payments = client.get("/api/payments", headers=headers).json()
    assert orders == []
    assert payments == []


def test_dashboard_outstanding_calculation(client):
    headers = register_and_login(client)
    client.post("/api/orders", json={"party_name": "Outstanding Party", "qty": 100, "rate": 10}, headers=headers)
    client.post("/api/payments", json={"party_name": "Outstanding Party", "amount": 400}, headers=headers)

    stats = client.get("/api/dashboard/stats", headers=headers).json()
    assert stats["outstanding"] == 1000 - 400


def test_orders_pagination(client):
    headers = register_and_login(client)
    for i in range(5):
        client.post("/api/orders", json={"party_name": f"P{i}", "qty": 1, "rate": 1}, headers=headers)

    resp = client.get("/api/orders?limit=2&offset=0", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_orders_search_filter(client):
    headers = register_and_login(client)
    client.post("/api/orders", json={"party_name": "Findable Silk Co", "qty": 1, "rate": 1}, headers=headers)
    client.post("/api/orders", json={"party_name": "Other Textiles", "qty": 1, "rate": 1}, headers=headers)

    resp = client.get("/api/orders?search=Findable", headers=headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["party_name"] == "Findable Silk Co"
