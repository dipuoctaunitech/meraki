"""Tests for accounts authentication."""

from fastapi.testclient import TestClient


class TestAccountsAuth:
    def test_login_and_me(self, test_client: TestClient) -> None:
        # conftest already authenticates; verify me works
        me = test_client.get("/api/v1/auth/me")
        assert me.status_code == 200
        assert me.json()["username"] == "admin"

    def test_rejects_bad_login(self, test_client: TestClient) -> None:
        # clear auth header for this request
        response = test_client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrong"},
            headers={"Authorization": ""},
        )
        assert response.status_code == 401

    def test_entries_require_auth(self, test_client: TestClient) -> None:
        response = test_client.get(
            "/api/v1/accounting/entries",
            headers={"Authorization": ""},
        )
        assert response.status_code == 401
