"""
DataMind Snowflake Database Service
ZeroDay OSS Hacktoberfest 2026 - Stage 2

This module manages the connection lifecycle and query execution for Snowflake.
Stage 2 Rules:
  - Read connection configuration from environment variables.
  - Open connection ONLY when explicitly requested (no startup connection).
  - Cleanly close cursors and connections in try/finally blocks.
  - Never expose credentials (passwords, tokens) in responses or error messages.
  - Execute only fixed, read-only queries.
  - Strictly NO Gemma or LLM natural-language SQL generation.
"""

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dotenv import load_dotenv

# Ensure .env is loaded from the project root or backend folder
_root_dir = Path(__file__).resolve().parent.parent.parent
_env_path = _root_dir / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
else:
    load_dotenv()


def get_snowflake_config() -> Dict[str, Optional[str]]:
    """
    Retrieve Snowflake configuration values from the environment.
    Note: Password is never included in publicly serializable dictionaries.
    """
    return {
        "account": os.getenv("SNOWFLAKE_ACCOUNT", "").strip() or None,
        "user": os.getenv("SNOWFLAKE_USER", "").strip() or None,
        "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE", "").strip() or None,
        "database": os.getenv("SNOWFLAKE_DATABASE", "").strip() or None,
        "schema": os.getenv("SNOWFLAKE_SCHEMA", "").strip() or None,
        "role": os.getenv("SNOWFLAKE_ROLE", "").strip() or None,
    }


def get_snowflake_password() -> Optional[str]:
    """Retrieve raw password internally for connection establishment only."""
    pw = os.getenv("SNOWFLAKE_PASSWORD", "").strip()
    return pw if pw else None


def check_configuration_status() -> Dict[str, Any]:
    """
    Check if required environment variables are set without exposing secrets.
    """
    cfg = get_snowflake_config()
    pw = get_snowflake_password()

    required_keys = ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_PASSWORD"]
    missing: List[str] = []

    if not cfg["account"]:
        missing.append("SNOWFLAKE_ACCOUNT")
    if not cfg["user"]:
        missing.append("SNOWFLAKE_USER")
    if not pw:
        missing.append("SNOWFLAKE_PASSWORD")

    is_configured = len(missing) == 0

    return {
        "configured": is_configured,
        "account": cfg["account"],
        "user": cfg["user"],
        "warehouse": cfg["warehouse"],
        "database": cfg["database"],
        "schema": cfg["schema"],
        "role": cfg["role"],
        "missing_variables": missing,
        "stage": "Stage 2 (Snowflake Integration)",
    }


def classify_and_sanitize_error(error: Exception) -> Tuple[str, str]:
    """
    Categorize error and remove potential credential fragments, host passwords,
    or sensitive paths from error messages before returning to frontend.

    Distinguishes:
      - Missing configuration
      - Authentication failures
      - Missing objects (database, schema, warehouse, table)
      - Permission / role failures
      - Network / connection timeouts
      - Query syntax / execution errors

    Returns:
        (category, sanitized_message)
    """
    raw_msg = str(error)

    # Strip potential passwords or sensitive tokens if present
    pw = get_snowflake_password()
    if pw and pw in raw_msg:
        raw_msg = raw_msg.replace(pw, "********")

    raw_msg = re.sub(r"password\s*=\s*['\"][^'\"]+['\"]", "password='********'", raw_msg, flags=re.IGNORECASE)
    raw_msg = re.sub(r"token\s*=\s*['\"][^'\"]+['\"]", "token='********'", raw_msg, flags=re.IGNORECASE)
    raw_msg = re.sub(r"key\s*=\s*['\"][^'\"]+['\"]", "key='********'", raw_msg, flags=re.IGNORECASE)

    lowered = raw_msg.lower()

    if "missing required environment variables" in lowered or "not configured" in lowered:
        return "ConfigurationMissing", raw_msg

    if any(k in lowered for k in ["incorrect username or password", "250001", "390100", "authentication failed", "invalid credentials", "jwt token"]):
        return "AuthenticationError", f"Snowflake authentication failed: Verify SNOWFLAKE_USER, SNOWFLAKE_PASSWORD, and SNOWFLAKE_ACCOUNT in .env. ({raw_msg})"

    if any(k in lowered for k in ["does not exist", "not authorized to access", "object not found", "warehouse not found"]):
        return "ObjectNotFoundOrUnauthorized", f"Snowflake object error: Check that the configured database, schema, or warehouse exists. ({raw_msg})"

    if any(k in lowered for k in ["permission denied", "insufficient privileges", "role not authorized"]):
        return "PermissionDenied", f"Snowflake authorization error: The configured role or user lacks sufficient privileges. ({raw_msg})"

    if any(k in lowered for k in ["timed out", "timeout", "network", "failed to connect", "getaddrinfo failed", "could not resolve host", "connection reset"]):
        return "NetworkError", f"Snowflake network connectivity error: Unable to reach Snowflake endpoint. ({raw_msg})"

    return "SnowflakeError", raw_msg


def sanitize_error_message(error: Exception) -> str:
    """
    Remove any potential credential fragments, host passwords, or sensitive paths
    from error messages before returning to the frontend.
    """
    _, safe_msg = classify_and_sanitize_error(error)
    return safe_msg


def open_connection():
    """
    Safely open a Snowflake database connection using environment configuration.
    Raises ValueError if configuration is missing, or snowflake.connector errors on failure.
    """
    import snowflake.connector

    cfg = get_snowflake_config()
    pw = get_snowflake_password()

    if not cfg["account"] or not cfg["user"] or not pw:
        raise ValueError(
            "Snowflake is not configured. Missing required environment variables: "
            + ", ".join(
                [k for k, v in [("SNOWFLAKE_ACCOUNT", cfg["account"]), ("SNOWFLAKE_USER", cfg["user"]), ("SNOWFLAKE_PASSWORD", pw)] if not v]
            )
        )

    # Build connection parameters (filter None values)
    conn_params = {
        "account": cfg["account"],
        "user": cfg["user"],
        "password": pw,
        "login_timeout": 12,
        "network_timeout": 15,
    }

    if cfg["warehouse"]:
        conn_params["warehouse"] = cfg["warehouse"]
    if cfg["database"]:
        conn_params["database"] = cfg["database"]
    if cfg["schema"]:
        conn_params["schema"] = cfg["schema"]
    if cfg["role"]:
        conn_params["role"] = cfg["role"]

    return snowflake.connector.connect(**conn_params)


def test_connection() -> Dict[str, Any]:
    """
    Test Snowflake connectivity by executing a lightweight read query:
    SELECT CURRENT_VERSION(), CURRENT_WAREHOUSE(), CURRENT_DATABASE(), CURRENT_SCHEMA()
    Closes connection and cursor in try/finally blocks.
    """
    status_info = check_configuration_status()
    if not status_info["configured"]:
        return {
            "success": False,
            "configured": False,
            "message": "Snowflake is not configured. Please set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, and SNOWFLAKE_PASSWORD in your .env file.",
            "missing_variables": status_info["missing_variables"],
        }

    conn = None
    cursor = None
    try:
        conn = open_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT CURRENT_VERSION(), CURRENT_WAREHOUSE(), CURRENT_DATABASE(), CURRENT_SCHEMA()")
        row = cursor.fetchone()

        version = str(row[0]) if row and len(row) > 0 else None
        wh = str(row[1]) if row and len(row) > 1 and row[1] else status_info["warehouse"]
        db = str(row[2]) if row and len(row) > 2 and row[2] else status_info["database"]
        sch = str(row[3]) if row and len(row) > 3 and row[3] else status_info["schema"]

        return {
            "success": True,
            "configured": True,
            "connected": True,
            "message": "Successfully connected to Snowflake.",
            "version": version,
            "warehouse": wh,
            "database": db,
            "schema": sch,
            "account": status_info["account"],
            "user": status_info["user"],
        }
    except Exception as exc:
        safe_msg = sanitize_error_message(exc)
        return {
            "success": False,
            "configured": True,
            "connected": False,
            "message": f"Connection failed: {safe_msg}",
            "account": status_info["account"],
            "user": status_info["user"],
        }
    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:
                pass
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def fetch_order_status_counts() -> Tuple[List[Dict[str, Any]], str]:
    """
    Execute the Stage 2 fixed, read-only query:
    SELECT O_ORDERSTATUS, COUNT(*) AS TOTAL_ORDERS FROM ORDERS GROUP BY O_ORDERSTATUS ORDER BY O_ORDERSTATUS

    Returns:
      (results_list, query_sql)
    """
    fixed_query = "SELECT O_ORDERSTATUS, COUNT(*) AS TOTAL_ORDERS FROM ORDERS GROUP BY O_ORDERSTATUS ORDER BY O_ORDERSTATUS"

    status_info = check_configuration_status()
    if not status_info["configured"]:
        raise ValueError(
            "Snowflake is not configured. Missing required environment variables: "
            + ", ".join(status_info["missing_variables"])
        )

    conn = None
    cursor = None
    try:
        conn = open_connection()
        cursor = conn.cursor()
        cursor.execute(fixed_query)
        rows = cursor.fetchall()

        results: List[Dict[str, Any]] = []
        for r in rows:
            results.append({
                "order_status": str(r[0]),
                "total_orders": int(r[1]) if r[1] is not None else 0,
            })

        return results, fixed_query
    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:
                pass
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


# Standard fallback schema for demonstration/mocking if Snowflake is offline
DEFAULT_FALLBACK_SCHEMA: Dict[str, List[str]] = {
    "ORDERS": [
        "O_ORDERKEY (NUMBER)",
        "O_CUSTKEY (NUMBER)",
        "O_ORDERSTATUS (VARCHAR)",
        "O_TOTALPRICE (NUMBER)",
        "O_ORDERDATE (DATE)",
        "O_ORDERPRIORITY (VARCHAR)",
        "O_CLERK (VARCHAR)",
        "O_SHIPPRIORITY (NUMBER)",
        "O_COMMENT (VARCHAR)",
    ],
    "CUSTOMER": [
        "C_CUSTKEY (NUMBER)",
        "C_NAME (VARCHAR)",
        "C_ADDRESS (VARCHAR)",
        "C_NATIONKEY (NUMBER)",
        "C_PHONE (VARCHAR)",
        "C_ACCTBAL (NUMBER)",
        "C_MKTSEGMENT (VARCHAR)",
        "C_COMMENT (VARCHAR)",
    ],
    "LINEITEM": [
        "L_ORDERKEY (NUMBER)",
        "L_PARTKEY (NUMBER)",
        "L_SUPPKEY (NUMBER)",
        "L_LINENUMBER (NUMBER)",
        "L_QUANTITY (NUMBER)",
        "L_EXTENDEDPRICE (NUMBER)",
        "L_DISCOUNT (NUMBER)",
        "L_TAX (NUMBER)",
        "L_RETURNFLAG (VARCHAR)",
        "L_LINESTATUS (VARCHAR)",
        "L_SHIPDATE (DATE)",
    ],
}


def fetch_schema_metadata(max_tables: int = 15) -> Dict[str, List[str]]:
    """
    Safely retrieve table and column metadata for the configured database and schema.
    Queries only INFORMATION_SCHEMA.COLUMNS; never downloads entire tables.
    Falls back to standard TPCH schema if Snowflake credentials are not configured.
    """
    status_info = check_configuration_status()
    if not status_info["configured"]:
        return DEFAULT_FALLBACK_SCHEMA

    conn = None
    cursor = None
    try:
        conn = open_connection()
        cursor = conn.cursor()

        schema_name = status_info["schema"]
        query = """
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = COALESCE(NULLIF(%s, ''), CURRENT_SCHEMA())
            ORDER BY TABLE_NAME, ORDINAL_POSITION
            LIMIT 300
        """
        cursor.execute(query, (schema_name or "",))
        rows = cursor.fetchall()

        if not rows:
            # If INFORMATION_SCHEMA returned empty (e.g. uppercase schema mismatch)
            # Try with upper schema name
            if schema_name:
                cursor.execute(query, (schema_name.upper(),))
                rows = cursor.fetchall()

        if not rows:
            return DEFAULT_FALLBACK_SCHEMA

        metadata: Dict[str, List[str]] = {}
        for row in rows:
            t_name = str(row[0]).upper()
            c_name = str(row[1]).upper()
            d_type = str(row[2]).upper() if len(row) > 2 and row[2] else "TEXT"

            if t_name not in metadata:
                if len(metadata) >= max_tables:
                    continue
                metadata[t_name] = []

            metadata[t_name].append(f"{c_name} ({d_type})")

        return metadata if metadata else DEFAULT_FALLBACK_SCHEMA

    except Exception:
        # If live retrieval fails, return default safe schema
        return DEFAULT_FALLBACK_SCHEMA
    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:
                pass
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def execute_validated_query(
    sql: str,
    row_limit: int = 100,
) -> Tuple[List[str], List[Dict[str, Any]], int]:
    """
    Execute a validated, read-only SQL query on Snowflake.
    Closes cursors and connections safely in try/finally blocks.

    Args:
        sql: The validated, normalized SQL query.
        row_limit: Maximum number of rows to return (default 100).

    Returns:
        (columns_list, rows_list, row_count)
    """
    status_info = check_configuration_status()
    if not status_info["configured"]:
        raise ValueError(
            "Snowflake is not configured. Missing required environment variables: "
            + ", ".join(status_info["missing_variables"])
        )

    conn = None
    cursor = None
    try:
        conn = open_connection()
        cursor = conn.cursor()
        cursor.execute(sql)

        # Extract column names
        columns: List[str] = []
        if cursor.description:
            columns = [str(col[0]).upper() for col in cursor.description]

        # Fetch up to row_limit
        raw_rows = cursor.fetchmany(row_limit)

        formatted_rows: List[Dict[str, Any]] = []
        for r in raw_rows:
            row_dict: Dict[str, Any] = {}
            for idx, col_name in enumerate(columns):
                val = r[idx] if idx < len(r) else None
                # Format Decimals / Dates / special types cleanly for JSON serialization
                if val is not None and not isinstance(val, (int, float, bool, str)):
                    val = str(val)
                row_dict[col_name] = val
            formatted_rows.append(row_dict)

        return columns, formatted_rows, len(formatted_rows)
    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:
                pass
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

