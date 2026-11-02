"""Tests for salary records and advances."""

from fastapi.testclient import TestClient


def _salary_payload(**overrides):
    payload = {
        "name": "Ravi",
        "fixed_salary": 20000,
        "miscellaneous": 1500,
        "advances": [
            {"amount": 2000, "advance_date": "2026-10-05"},
            {"amount": 1000, "advance_date": "2026-10-15"},
        ],
    }
    payload.update(overrides)
    return payload


class TestSalaryRecords:
    def test_create_list_and_balance(self, test_client: TestClient) -> None:
        created = test_client.post(
            "/api/v1/accounting/salaries",
            json=_salary_payload(),
        )
        assert created.status_code == 201
        body = created.json()
        assert body["name"] == "Ravi"
        assert body["advance_total"] == 3000
        assert body["balance"] == 18500
        assert len(body["advances"]) == 2

        listed = test_client.get("/api/v1/accounting/salaries")
        assert listed.status_code == 200
        assert any(row["id"] == body["id"] for row in listed.json())

    def test_name_suggestions(self, test_client: TestClient) -> None:
        test_client.post(
            "/api/v1/accounting/salaries",
            json=_salary_payload(name="Anita"),
        )
        test_client.post(
            "/api/v1/accounting/salaries",
            json=_salary_payload(name="Ravi"),
        )
        suggestions = test_client.get(
            "/api/v1/accounting/salaries/names",
            params={"q": "a"},
        )
        assert suggestions.status_code == 200
        names = suggestions.json()
        assert "Anita" in names
        assert "Ravi" in names

    def test_name_filter_sort_and_export(self, test_client: TestClient) -> None:
        test_client.post(
            "/api/v1/accounting/salaries",
            json=_salary_payload(name="Anita"),
        )
        test_client.post(
            "/api/v1/accounting/salaries",
            json=_salary_payload(
                name="Ravi",
                advances=[{"amount": 500, "advance_date": "2026-11-01"}],
            ),
        )

        filtered = test_client.get(
            "/api/v1/accounting/salaries",
            params={"name": "rav"},
        )
        assert filtered.status_code == 200
        assert len(filtered.json()) == 1
        assert filtered.json()[0]["name"] == "Ravi"

        sorted_desc = test_client.get(
            "/api/v1/accounting/salaries",
            params={"sort_order": "desc"},
        )
        assert sorted_desc.status_code == 200
        names = [row["name"] for row in sorted_desc.json()]
        assert names.index("Ravi") < names.index("Anita")

        export = test_client.get(
            "/api/v1/accounting/salaries/reports/export",
            params={"name": "rav"},
        )
        assert export.status_code == 200
        assert export.content[:2] == b"PK"

    def test_update_and_delete(self, test_client: TestClient) -> None:
        created = test_client.post(
            "/api/v1/accounting/salaries",
            json=_salary_payload(),
        )
        assert created.status_code == 201
        salary_id = created.json()["id"]

        updated = test_client.put(
            f"/api/v1/accounting/salaries/{salary_id}",
            json=_salary_payload(
                name="Ravi K",
                fixed_salary=22000,
                miscellaneous=0,
                advances=[{"amount": 500, "advance_date": "2026-10-20"}],
            ),
        )
        assert updated.status_code == 200
        body = updated.json()
        assert body["name"] == "Ravi K"
        assert body["balance"] == 21500
        assert len(body["advances"]) == 1

        deleted = test_client.delete(f"/api/v1/accounting/salaries/{salary_id}")
        assert deleted.status_code == 204

        missing = test_client.delete(f"/api/v1/accounting/salaries/{salary_id}")
        assert missing.status_code == 404
