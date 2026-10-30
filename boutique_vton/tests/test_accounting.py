"""Tests for accounting API."""

from datetime import date

from fastapi.testclient import TestClient


def _credit_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "entry_type": "credit",
        "entry_date": date.today().isoformat(),
        "customer_name": "Asha Kumar",
        "phone": "9876543210",
        "item_name": "Silk Saree",
        "item_price": 2500,
        "quantity": 2,
        "is_paid": True,
        "payment_method": "gpay",
    }
    payload.update(overrides)
    return payload


def _debit_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "entry_type": "debit",
        "entry_date": date.today().isoformat(),
        "item_name": "Electricity bill",
        "item_price": 1800,
        "is_paid": True,
        "payment_method": "bank_hdfc",
        "customer_name": "KSEB",
    }
    payload.update(overrides)
    return payload


class TestAccountingEntries:
    def test_create_credit_entry_and_compute_total(self, test_client: TestClient) -> None:
        response = test_client.post("/api/v1/accounting/entries", json=_credit_payload())
        assert response.status_code == 201
        data = response.json()
        assert data["total"] == 5000
        assert data["entry_type"] == "credit"
        assert data["is_paid"] is True
        assert data["payment_method"] == "gpay"
        assert data["phone"] == "9876543210"

    def test_phone_lookup_autofill_customer(self, test_client: TestClient) -> None:
        create = test_client.post("/api/v1/accounting/entries", json=_credit_payload())
        assert create.status_code == 201

        lookup = test_client.get("/api/v1/accounting/customers/by-phone/9876543210")
        assert lookup.status_code == 200
        assert lookup.json()["name"] == "Asha Kumar"

        second = test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(item_name="Cotton Kurti", item_price=800, quantity=1),
        )
        assert second.status_code == 201

        listed = test_client.get("/api/v1/accounting/entries?phone=9876543210")
        assert listed.status_code == 200
        assert len(listed.json()) == 2

    def test_unpaid_rejects_payment_method(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(is_paid=False, payment_method="cash"),
        )
        assert response.status_code == 422

    def test_paid_requires_payment_method(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(is_paid=True, payment_method=None),
        )
        assert response.status_code == 422

    def test_create_debit_expense_without_phone(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/api/v1/accounting/entries",
            json=_debit_payload(),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["entry_type"] == "debit"
        assert data["item_name"] == "Electricity bill"
        assert data["total"] == 1800
        assert data["quantity"] == 1
        assert data["phone"] == ""
        assert data["customer_name"] == "KSEB"
        assert data["customer_id"] is None

    def test_credit_requires_phone(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(phone=None),
        )
        assert response.status_code == 422

    def test_phone_prefix_suggestions(self, test_client: TestClient) -> None:
        create = test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(phone="9876543210", customer_name="Asha Kumar"),
        )
        assert create.status_code == 201

        too_short = test_client.get("/api/v1/accounting/customers", params={"q": "98"})
        assert too_short.status_code == 200
        assert too_short.json() == []

        matches = test_client.get(
            "/api/v1/accounting/customers",
            params={"q": "987"},
        )
        assert matches.status_code == 200
        assert len(matches.json()) == 1
        assert matches.json()[0]["phone"] == "9876543210"
        assert matches.json()[0]["name"] == "Asha Kumar"

    def test_catalog_item_saved_and_searchable(self, test_client: TestClient) -> None:
        create = test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(item_name="Linen Dress", item_price=2200, quantity=1),
        )
        assert create.status_code == 201

        search = test_client.get("/api/v1/accounting/items", params={"q": "linen"})
        assert search.status_code == 200
        assert len(search.json()) == 1
        assert search.json()[0]["name"] == "Linen Dress"
        assert search.json()[0]["price"] == 2200

        update = test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(
                item_name="linen dress",
                item_price=2400,
                quantity=1,
                phone="9876543299",
                customer_name="Other Buyer",
            ),
        )
        assert update.status_code == 201

        search_again = test_client.get(
            "/api/v1/accounting/items",
            params={"q": "Linen"},
        )
        assert search_again.status_code == 200
        assert len(search_again.json()) == 1
        assert search_again.json()[0]["name"] == "linen dress"
        assert search_again.json()[0]["price"] == 2400

    def test_date_filter_and_sort_order(self, test_client: TestClient) -> None:
        test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(entry_date="2026-01-10", item_name="Old sale"),
        )
        test_client.post(
            "/api/v1/accounting/entries",
            json=_credit_payload(
                entry_date="2026-03-20",
                item_name="New sale",
                phone="9876543211",
                customer_name="Later Buyer",
            ),
        )

        filtered = test_client.get(
            "/api/v1/accounting/entries",
            params={"date_from": "2026-03-01", "date_to": "2026-03-31"},
        )
        assert filtered.status_code == 200
        assert len(filtered.json()) == 1
        assert filtered.json()[0]["item_name"] == "New sale"

        oldest_first = test_client.get(
            "/api/v1/accounting/entries",
            params={"sort_order": "asc"},
        )
        assert oldest_first.status_code == 200
        names = [row["item_name"] for row in oldest_first.json()]
        assert names.index("Old sale") < names.index("New sale")

        export = test_client.get(
            "/api/v1/accounting/reports/export",
            params={
                "date_from": "2026-03-01",
                "date_to": "2026-03-31",
                "entry_type": "credit",
                "sort_order": "asc",
            },
        )
        assert export.status_code == 200
        assert export.content[:2] == b"PK"

    def test_summary_and_excel_export(self, test_client: TestClient) -> None:
        test_client.post("/api/v1/accounting/entries", json=_credit_payload())
        test_client.post(
            "/api/v1/accounting/entries",
            json=_debit_payload(
                item_name="Rent",
                item_price=500,
                is_paid=False,
                payment_method=None,
                customer_name=None,
            ),
        )

        summary = test_client.get("/api/v1/accounting/summary")
        assert summary.status_code == 200
        body = summary.json()
        assert body["credit_total"] == 5000
        assert body["debit_total"] == 500
        assert body["entry_count"] == 2

        export = test_client.get("/api/v1/accounting/reports/export")
        assert export.status_code == 200
        assert (
            export.headers["content-type"]
            == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        assert export.content[:2] == b"PK"
