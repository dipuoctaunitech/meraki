from fastapi.testclient import TestClient


class TestHealthEndpoint:
    def test_health_check_returns_ok(self, test_client: TestClient) -> None:
        response = test_client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
