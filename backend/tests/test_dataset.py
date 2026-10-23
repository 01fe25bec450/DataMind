"""
DataMind Dataset Query and Intent-to-Query Unit & Integration Tests
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.dataset_service import (
    get_suggested_queries,
    match_intent_to_query,
    execute_dataset_query,
)

client = TestClient(app)


def test_dataset_suggestions_endpoint():
    """Verify that GET /api/dataset/suggestions returns the 5 core suggested queries."""
    resp = client.get("/api/dataset/suggestions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "suggestions" in data
    assert len(data["suggestions"]) == 5

    questions = [s["question"] for s in data["suggestions"]]
    assert "Show order status counts" in questions
    assert "Show total orders" in questions
    assert "Show total order value" in questions
    assert "Show the highest-value orders" in questions
    assert "Show orders by date" in questions


@pytest.mark.parametrize("question,expected_canonical", [
    ("Show order status counts", "order-status-counts"),
    ("what are the order status counts?", "order-status-counts"),
    ("Show total orders", "total-orders"),
    ("how many orders are there in the dataset?", "total-orders"),
    ("Show total order value", "total-order-value"),
    ("what is the total value of all orders?", "total-order-value"),
    ("Show the highest-value orders", "highest-value-orders"),
    ("top 10 highest value orders", "highest-value-orders"),
    ("Show orders by date", "orders-by-date"),
    ("orders by year trend", "orders-by-date"),
])
def test_match_intent_to_query_variations(question, expected_canonical):
    """Verify that natural variations match the correct canonical query."""
    matched = match_intent_to_query(question)
    assert matched == expected_canonical


def test_query_dataset_order_status_counts():
    """Verify order status counts query execution."""
    resp = client.post("/api/dataset/query", json={"question": "Show order status counts"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["columns"] == ["ORDER_STATUS", "TOTAL_ORDERS"]
    assert len(data["rows"]) == 3
    assert len(data["chart_data"]) == 3
    assert "SELECT" in data["sql"]


def test_query_dataset_total_orders():
    """Verify total orders query execution."""
    resp = client.post("/api/dataset/query", json={"question": "Show total orders"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["columns"] == ["TOTAL_ORDERS"]
    assert data["rows"][0]["TOTAL_ORDERS"] == 1500000


def test_query_dataset_total_value():
    """Verify total order value query execution."""
    resp = client.post("/api/dataset/query", json={"question": "Show total order value"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "TOTAL_ORDER_VALUE ($)" in data["columns"]
    assert len(data["rows"]) == 3


def test_query_dataset_highest_value_orders():
    """Verify highest-value orders query execution."""
    resp = client.post("/api/dataset/query", json={"question": "Show the highest-value orders"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["rows"]) == 10
    assert "ORDER_ID" in data["columns"]
    assert "TOTAL_PRICE ($)" in data["columns"]


def test_query_dataset_orders_by_date():
    """Verify orders by date query execution."""
    resp = client.post("/api/dataset/query", json={"question": "Show orders by date"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "ORDER_YEAR" in data["columns"]
    assert len(data["rows"]) == 7


def test_query_dataset_empty_question():
    """Verify empty question rejection."""
    resp = client.post("/api/dataset/query", json={"question": "   "})
    assert resp.status_code == 400
    data = resp.json()
    assert data["success"] is False
    assert data["error"] == "EmptyQuestion"


def test_query_dataset_unsupported_question():
    """Verify that unsupported questions return clear error with suggestions."""
    resp = client.post("/api/dataset/query", json={"question": "What is the weather in Tokyo?"})
    assert resp.status_code == 422
    data = resp.json()
    assert data["success"] is False
    assert data["error"] == "UnsupportedQuestion"
    assert "not currently mapped to the dataset" in data["message"]
    assert "supported_queries" in data
    assert len(data["supported_queries"]) == 5
