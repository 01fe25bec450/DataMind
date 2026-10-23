"""
DataMind Stage 3 Automated Unit & Integration Tests
ZeroDay OSS Hacktoberfest 2026

Tests:
  1. Empty and overly long questions.
  2. Model unavailable or malformed output handling.
  3. SQL safety validation (single statement, CTEs, data-changing rejection, table checking).
  4. Missing Snowflake configuration.
  5. Query execution failure handling.
  6. Empty and non-empty query results.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.sql_validator import validate_and_normalize_sql
from backend.app.snowflake_service import DEFAULT_FALLBACK_SCHEMA

client = TestClient(app)


# ==============================================================================
# Suite 1: SQL Validator Unit Tests (Independent AST-Based Verification)
# ==============================================================================

def test_sql_validator_valid_select():
    """Verify that legitimate read-only SELECT queries are accepted."""
    sql = "SELECT O_ORDERSTATUS, COUNT(*) AS TOTAL_ORDERS FROM ORDERS GROUP BY 1"
    is_valid, msg, norm = validate_and_normalize_sql(sql, allowed_tables=["ORDERS"])
    assert is_valid is True
    assert "LIMIT 100" in norm
    assert "ORDERS" in norm


def test_sql_validator_valid_cte():
    """Verify that Common Table Expressions (WITH ... SELECT) are accepted."""
    sql = """
    WITH status_agg AS (
        SELECT O_ORDERSTATUS, COUNT(*) AS CNT
        FROM ORDERS
        GROUP BY 1
    )
    SELECT * FROM status_agg WHERE CNT > 50
    """
    is_valid, msg, norm = validate_and_normalize_sql(sql, allowed_tables=["ORDERS"])
    assert is_valid is True
    assert "status_agg" in norm.lower()


def test_sql_validator_reject_multiple_statements():
    """Verify that multi-statement injection attempts are strictly rejected."""
    malicious_sql = "SELECT 1 FROM ORDERS; DROP TABLE ORDERS;"
    is_valid, msg, norm = validate_and_normalize_sql(malicious_sql, allowed_tables=["ORDERS"])
    assert is_valid is False
    assert "Multiple SQL statements detected" in msg


def test_sql_validator_reject_data_changing_operations():
    """Verify that INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE are blocked."""
    prohibited_queries = [
        "DELETE FROM ORDERS WHERE 1=1",
        "DROP TABLE ORDERS",
        "INSERT INTO ORDERS (O_ORDERKEY) VALUES (999)",
        "UPDATE ORDERS SET O_ORDERSTATUS = 'F'",
        "ALTER TABLE ORDERS ADD COLUMN HACKED VARCHAR",
        "TRUNCATE TABLE ORDERS",
    ]
    for q in prohibited_queries:
        is_valid, msg, norm = validate_and_normalize_sql(q, allowed_tables=["ORDERS"])
        assert is_valid is False
        assert ("Disallowed statement type" in msg or "Disallowed operation detected" in msg)


def test_sql_validator_reject_unapproved_tables():
    """Verify that queries referencing tables outside the allowed schema are rejected."""
    sql = "SELECT * FROM USER_PASSWORDS"
    is_valid, msg, norm = validate_and_normalize_sql(sql, allowed_tables=["ORDERS", "CUSTOMER"])
    assert is_valid is False
    assert "references unapproved table" in msg
    assert "USER_PASSWORDS" in msg


def test_sql_validator_syntax_parser_failure():
    """Verify that malformed SQL fails closed with clear error."""
    malformed = "SELECT FROM WHERE *** INVALID SYNTAX"
    is_valid, msg, norm = validate_and_normalize_sql(malformed, allowed_tables=["ORDERS"])
    assert is_valid is False
    assert "parsing failed" in msg.lower()


# ==============================================================================
# Suite 2: Question Input Validation (/api/query)
# ==============================================================================

def test_query_endpoint_empty_question():
    """Verify that empty questions return HTTP 422 or 400 validation error."""
    resp = client.post("/api/query", json={"question": ""})
    assert resp.status_code in (400, 422)


def test_query_endpoint_whitespace_question():
    """Verify that whitespace-only questions are rejected."""
    resp = client.post("/api/query", json={"question": "   \n\t  "})
    assert resp.status_code in (400, 422)


def test_query_endpoint_overly_long_question():
    """Verify that questions exceeding 500 characters are rejected."""
    long_question = "What is " + ("very long question " * 35)
    assert len(long_question) > 500
    resp = client.post("/api/query", json={"question": long_question})
    assert resp.status_code in (400, 422)


# ==============================================================================
# Suite 3: Missing Snowflake Configuration & Model Availability
# ==============================================================================

@patch("backend.app.main.check_configuration_status")
def test_query_missing_snowflake_config(mock_snow):
    """Verify clean 503 response when Snowflake is not configured."""
    mock_snow.return_value = {
        "configured": False,
        "missing_variables": ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_PASSWORD"],
    }
    resp = client.post("/api/query", json={"question": "How many orders are there?"})
    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["error"] == "SnowflakeNotConfigured"


@patch("backend.app.main.check_configuration_status")
@patch("backend.app.main.get_gemma_status")
def test_query_model_unavailable(mock_gemma, mock_snow):
    """Verify clean 503 response with setup instructions when Gemma runtime is unavailable."""
    mock_snow.return_value = {"configured": True, "missing_variables": []}
    mock_gemma.return_value = {
        "available": False,
        "message": "No Gemma runtime is currently available. Install Ollama or configure GEMMA_API_KEY.",
    }
    resp = client.post("/api/query", json={"question": "How many orders are there?"})
    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["error"] == "ModelUnavailable"
    assert "Install Ollama" in data["message"]


# ==============================================================================
# Suite 4: Malformed or Prohibited Model Output Caught by Validator
# ==============================================================================

@patch("backend.app.main.check_configuration_status")
@patch("backend.app.main.get_gemma_status")
@patch("backend.app.main.generate_sql_from_question")
def test_query_malformed_model_output_rejected(mock_gen, mock_gemma, mock_snow):
    """Verify that if Gemma hallucinated a DROP statement, the validator blocks it with 422."""
    mock_snow.return_value = {"configured": True, "missing_variables": []}
    mock_gemma.return_value = {"available": True, "runtime": "ollama", "model": "gemma2:2b"}
    mock_gen.return_value = ("DROP TABLE ORDERS;", "Ollama (gemma2:2b)")

    resp = client.post("/api/query", json={"question": "Clear all order records"})
    assert resp.status_code == 422
    data = resp.json()
    assert data["success"] is False
    assert data["error"] == "SQLValidationError"
    assert "Disallowed statement type" in data["message"]


# ==============================================================================
# Suite 5: Successful Query Execution & Result Sets
# ==============================================================================

@patch("backend.app.main.check_configuration_status")
@patch("backend.app.main.get_gemma_status")
@patch("backend.app.main.fetch_schema_metadata")
@patch("backend.app.main.generate_sql_from_question")
@patch("backend.app.main.execute_validated_query")
def test_query_success_non_empty_results(mock_exec, mock_gen, mock_schema, mock_gemma, mock_snow):
    """Verify end-to-end flow with non-empty results."""
    mock_snow.return_value = {"configured": True, "missing_variables": []}
    mock_gemma.return_value = {"available": True, "runtime": "ollama", "model": "gemma2:2b"}
    mock_schema.return_value = DEFAULT_FALLBACK_SCHEMA
    mock_gen.return_value = (
        "SELECT O_ORDERSTATUS, COUNT(*) AS TOTAL_ORDERS FROM ORDERS GROUP BY 1",
        "Ollama (gemma2:2b)",
    )
    mock_exec.return_value = (
        ["O_ORDERSTATUS", "TOTAL_ORDERS"],
        [{"O_ORDERSTATUS": "F", "TOTAL_ORDERS": 730883}, {"O_ORDERSTATUS": "O", "TOTAL_ORDERS": 729668}],
        2,
    )

    resp = client.post("/api/query", json={"question": "What is the order count by status?"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["count"] == 2
    assert len(data["rows"]) == 2
    assert data["columns"] == ["O_ORDERSTATUS", "TOTAL_ORDERS"]
    assert data["execution_status"] == "SUCCESS"


@patch("backend.app.main.check_configuration_status")
@patch("backend.app.main.get_gemma_status")
@patch("backend.app.main.fetch_schema_metadata")
@patch("backend.app.main.generate_sql_from_question")
@patch("backend.app.main.execute_validated_query")
def test_query_success_empty_results(mock_exec, mock_gen, mock_schema, mock_gemma, mock_snow):
    """Verify end-to-end flow with empty query results."""
    mock_snow.return_value = {"configured": True, "missing_variables": []}
    mock_gemma.return_value = {"available": True, "runtime": "hosted_google_ai", "model": "gemma-2-2b-it"}
    mock_schema.return_value = DEFAULT_FALLBACK_SCHEMA
    mock_gen.return_value = (
        "SELECT * FROM ORDERS WHERE O_ORDERSTATUS = 'UNKNOWN'",
        "Google AI Studio (gemma-2-2b-it)",
    )
    mock_exec.return_value = (["O_ORDERKEY", "O_ORDERSTATUS"], [], 0)

    resp = client.post("/api/query", json={"question": "Show unknown orders"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["count"] == 0
    assert data["rows"] == []


@patch("backend.app.main.check_configuration_status")
@patch("backend.app.main.get_gemma_status")
@patch("backend.app.main.fetch_schema_metadata")
@patch("backend.app.main.generate_sql_from_question")
@patch("backend.app.main.execute_validated_query")
def test_query_execution_failure(mock_exec, mock_gen, mock_schema, mock_gemma, mock_snow):
    """Verify that Snowflake database execution errors return a clean HTTP 502 with safe messaging."""
    mock_snow.return_value = {"configured": True, "missing_variables": []}
    mock_gemma.return_value = {"available": True, "runtime": "ollama", "model": "gemma2:2b"}
    mock_schema.return_value = DEFAULT_FALLBACK_SCHEMA
    mock_gen.return_value = ("SELECT * FROM ORDERS", "Ollama (gemma2:2b)")
    mock_exec.side_effect = RuntimeError("Snowflake query execution timed out after 30s")

    resp = client.post("/api/query", json={"question": "Show all orders"})
    assert resp.status_code == 502
    data = resp.json()
    assert data["success"] is False
    assert data["error"] == "SnowflakeExecutionError"
    assert "timed out" in data["message"]


# ==============================================================================
# Suite 6: Health, Root, Snowflake Status & Error Classification Tests
# ==============================================================================

def test_health_endpoint_healthy_without_external_services():
    """Verify that GET /health returns 200 OK without requiring Snowflake or Gemma."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data


def test_root_endpoint_metadata():
    """Verify that GET / returns service metadata and online status."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["project"] == "DataMind — Talk to Your Data"
    assert data["status"] == "online"
    assert "integrations" in data
    assert "endpoints" in data


def test_snowflake_status_unconfigured():
    """Verify that GET /api/snowflake/status reports incomplete config cleanly."""
    resp = client.get("/api/snowflake/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "configured" in data
    assert "message" in data


def test_snowflake_status_test_connection_unconfigured():
    """Verify that GET /api/snowflake/status?test=true returns failure when unconfigured."""
    resp = client.get("/api/snowflake/status?test=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is False
    assert data["success"] is False
    assert "missing_variables" in data


def test_orders_status_counts_unconfigured():
    """Verify that GET /api/orders/status-counts returns 503 when Snowflake is unconfigured."""
    with patch("backend.app.snowflake_service.check_configuration_status") as mock_cfg:
        mock_cfg.return_value = {
            "configured": False,
            "missing_variables": ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_PASSWORD"],
        }
        resp = client.get("/api/orders/status-counts")
        assert resp.status_code == 503
        data = resp.json()
        assert data["success"] is False
        assert data["error"] == "ConfigurationMissing"


def test_error_classification_and_password_sanitization():
    """Verify that classify_and_sanitize_error wipes passwords and classifies error types."""
    from backend.app.snowflake_service import classify_and_sanitize_error

    # 1. Password scrub test
    err_with_secret = Exception("Connection failed: password='super_secret_pw_123' at host")
    cat, clean = classify_and_sanitize_error(err_with_secret)
    assert "super_secret_pw_123" not in clean
    assert "password='********'" in clean

    # 2. Authentication error classification
    auth_err = Exception("250001: Incorrect username or password was specified.")
    cat, clean = classify_and_sanitize_error(auth_err)
    assert cat == "AuthenticationError"
    assert "authentication failed" in clean.lower()

    # 3. Timeout / Network error classification
    net_err = Exception("Failed to connect to DB: connection timed out after 15s")
    cat, clean = classify_and_sanitize_error(net_err)
    assert cat == "NetworkError"
    assert "network" in clean.lower()


def test_schema_metadata_endpoint():
    """Verify that GET /api/schema returns table and column metadata."""
    resp = client.get("/api/schema")
    assert resp.status_code == 200
    data = resp.json()
    assert "tables" in data
    assert "schema" in data
    assert len(data["tables"]) > 0
    assert "ORDERS" in data["tables"]

