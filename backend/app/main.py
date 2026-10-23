"""
DataMind Backend API
ZeroDay OSS Hacktoberfest 2026 - Stage 3: Gemma NL-to-SQL + Snowflake Execution

Endpoints:
  - GET /: Project metadata, status, and active integrations
  - GET /health: Operational health check
  - GET /api/snowflake/status: Check Snowflake configuration or test connection (?test=true)
  - GET /api/gemma/status: Check Gemma model availability (Ollama / Google AI Studio)
  - GET /api/schema: Retrieve allowed schema metadata (tables & column definitions)
  - GET /api/orders/status-counts: Stage 2 fixed read-only query
  - POST /api/query: Gemma-powered natural-language-to-SQL with AST validation & Snowflake execution

Security Rules:
  - Input validation: Non-empty question, max 500 characters.
  - Server-side independent SQL validation using sqlglot (Snowflake dialect).
  - Enforce single statement, read-only SELECT (with allowed CTEs).
  - Prohibit all data-changing operations (INSERT, UPDATE, DELETE, DROP, ALTER, etc.).
  - Enforce maximum row limits (default: 100 rows).
  - Never expose credentials, API keys, or raw stack traces.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Ensure both project root and backend folder are in sys.path
_current_dir = Path(__file__).resolve().parent
_backend_dir = _current_dir.parent
_root_dir = _backend_dir.parent

for _p in [str(_root_dir), str(_backend_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from backend.app.snowflake_service import (
        check_configuration_status,
        test_connection,
        fetch_order_status_counts,
        fetch_schema_metadata,
        execute_validated_query,
        sanitize_error_message,
    )
    from backend.app.gemma_service import (
        get_gemma_status,
        generate_sql_from_question,
    )
    from backend.app.sql_validator import validate_and_normalize_sql
    from backend.app.dataset_service import (
        get_suggested_queries,
        get_dataset_metadata,
        execute_dataset_query,
    )
except ImportError:
    from app.snowflake_service import (
        check_configuration_status,
        test_connection,
        fetch_order_status_counts,
        fetch_schema_metadata,
        execute_validated_query,
        sanitize_error_message,
    )
    from app.gemma_service import (
        get_gemma_status,
        generate_sql_from_question,
    )
    from app.sql_validator import validate_and_normalize_sql
    from app.dataset_service import (
        get_suggested_queries,
        get_dataset_metadata,
        execute_dataset_query,
    )

app = FastAPI(
    title="DataMind API",
    description="Backend API for DataMind — Talk to Your Data (Stage 3: Gemma NL-to-SQL + Snowflake)",
    version="0.3.0",
)

# Configure CORS for local React/Vite development
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class NaturalLanguageQueryRequest(BaseModel):
    """Request payload for natural language to SQL queries."""
    question: str = Field(
        ...,
        description="The natural language question to translate into Snowflake SQL.",
        min_length=1,
        max_length=500,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all exception handler to ensure all errors return safe, structured JSON.
    Never exposes internal credentials, tokens, or raw stack traces.
    """
    safe_message = sanitize_error_message(exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": safe_message if safe_message else "An unexpected error occurred.",
            "path": request.url.path,
        },
    )


@app.get("/", tags=["General"])
async def root() -> Dict[str, Any]:
    """
    Root endpoint returning project metadata and Stage 3 status.
    """
    snow_status = check_configuration_status()
    gemma_status = get_gemma_status()

    return {
        "project": "DataMind — Talk to Your Data",
        "description": "ZeroDay OSS Hacktoberfest 2026",
        "stage": "Stage 3 (Gemma NL-to-SQL + Snowflake Execution)",
        "status": "online",
        "integrations": {
            "snowflake": {
                "configured": snow_status["configured"],
                "account": snow_status["account"],
                "database": snow_status["database"],
                "schema": snow_status["schema"],
                "warehouse": snow_status["warehouse"],
            },
            "gemma": {
                "available": gemma_status["available"],
                "runtime": gemma_status["runtime"],
                "model": gemma_status["model"],
            },
        },
        "endpoints": {
            "root": "/",
            "health": "/health",
            "dataset_suggestions": "/api/dataset/suggestions",
            "dataset_query": "/api/dataset/query (POST)",
            "query": "/api/query (POST)",
            "schema": "/api/schema",
            "snowflake_status": "/api/snowflake/status",
            "gemma_status": "/api/gemma/status",
            "order_status_counts": "/api/orders/status-counts",
            "docs": "/docs",
        },
    }


@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint confirming backend service operational status.
    """
    return {
        "status": "healthy",
        "service": "DataMind Backend API",
        "version": "0.3.0",
        "stage": "Stage 3",
    }


@app.get("/api/snowflake/status", tags=["Snowflake"])
async def get_snowflake_status(
    test: bool = Query(
        False,
        description="If true, attempts a live test connection to Snowflake.",
    )
) -> Dict[str, Any]:
    """
    Returns Snowflake configuration status.
    If ?test=true is passed, performs a safe connection test without exposing secrets.
    """
    if test:
        return test_connection()

    status_info = check_configuration_status()
    return {
        "configured": status_info["configured"],
        "account": status_info["account"],
        "warehouse": status_info["warehouse"],
        "database": status_info["database"],
        "schema": status_info["schema"],
        "role": status_info["role"],
        "missing_variables": status_info["missing_variables"],
        "message": (
            "Snowflake configuration is present."
            if status_info["configured"]
            else "Snowflake configuration is incomplete. Define SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, and SNOWFLAKE_PASSWORD in .env."
        ),
    }


@app.get("/api/gemma/status", tags=["Gemma"])
async def get_model_status() -> Dict[str, Any]:
    """
    Returns availability status of the Gemma AI model (Ollama or Google AI Studio).
    Never exposes API keys or internal endpoints.
    """
    return get_gemma_status()


@app.get("/api/schema", tags=["Schema"])
async def get_schema_metadata() -> Dict[str, Any]:
    """
    Returns allowed schema metadata (table and column definitions) for the configured database/schema.
    """
    schema = fetch_schema_metadata()
    return {
        "tables": list(schema.keys()),
        "schema": schema,
        "table_count": len(schema),
    }


@app.get("/api/orders/status-counts", tags=["Snowflake"])
async def get_order_status_counts() -> Dict[str, Any]:
    """
    Executes the fixed read-only query against Snowflake ORDERS table.
    """
    try:
        rows, query = fetch_order_status_counts()
        return {
            "success": True,
            "source": "Snowflake",
            "query": query,
            "data": rows,
            "count": len(rows),
            "stage": "Stage 2 (Fixed Verification Query)",
        }
    except ValueError as val_err:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "error": "ConfigurationMissing",
                "message": str(val_err),
            },
        )
    except Exception as exc:
        safe_msg = sanitize_error_message(exc)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "success": False,
                "error": "SnowflakeQueryError",
                "message": safe_msg,
            },
        )


@app.get("/api/dataset/suggestions", tags=["Dataset"])
async def get_suggestions_endpoint() -> Dict[str, Any]:
    """
    Returns suggested queries and metadata for the existing TPC-H ORDERS dataset.
    Derived directly from dataset schema and supported queries.
    """
    meta = get_dataset_metadata()
    suggestions = get_suggested_queries()
    return {
        "success": True,
        "dataset": meta["name"],
        "table": meta["table"],
        "columns": [col["name"] for col in meta["columns"]],
        "suggestions": suggestions,
    }


@app.post("/api/dataset/query", tags=["Dataset"])
async def query_dataset_endpoint(req: NaturalLanguageQueryRequest) -> JSONResponse:
    """
    Executes a query against the existing dataset using transparent intent mapping.
    Works immediately without requiring active Snowflake or Gemma configuration.
    """
    clean_question = req.question.strip()
    if not clean_question:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": "EmptyQuestion",
                "message": "Question cannot be empty. Please enter a question or click a suggested query.",
            },
        )

    success, result_payload = execute_dataset_query(clean_question)
    if success:
        return JSONResponse(status_code=status.HTTP_200_OK, content=result_payload)
    else:
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=result_payload)


@app.post("/api/query", tags=["Query"])
async def handle_nl_query(req: NaturalLanguageQueryRequest) -> Dict[str, Any]:
    """
    Gemma-powered natural-language-to-SQL endpoint.

    Execution Pipeline:
      1. Validate question (non-empty, max 500 chars).
      2. Verify Snowflake configuration.
      3. Verify Gemma runtime availability (Ollama or Google AI Studio).
      4. Retrieve allowed schema metadata.
      5. Synthesize read-only SQL statement via Gemma.
      6. Perform independent AST-based SQL validation using sqlglot (Snowflake dialect).
      7. Execute validated query on Snowflake with row limit (max 100).
      8. Return structured JSON with SQL, columns, rows, and execution status.
    """
    clean_question = req.question.strip()
    if not clean_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty.",
        )
    if len(clean_question) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question exceeds maximum allowed length of 500 characters.",
        )

    # 1. Check Snowflake configuration
    snow_status = check_configuration_status()
    if not snow_status["configured"]:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "error": "SnowflakeNotConfigured",
                "message": (
                    "Snowflake database is not configured. Missing environment variables: "
                    + ", ".join(snow_status["missing_variables"])
                    + ". Define them in your root .env file."
                ),
            },
        )

    # 2. Check Gemma model availability
    gemma_status = get_gemma_status()
    if not gemma_status["available"]:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "error": "ModelUnavailable",
                "message": gemma_status["message"],
            },
        )

    # 3. Retrieve allowed schema metadata
    schema = fetch_schema_metadata()
    allowed_tables = list(schema.keys())

    # 4. Generate SQL with Gemma
    try:
        raw_sql, runtime_name = generate_sql_from_question(clean_question, schema)
    except Exception as exc:
        safe_msg = sanitize_error_message(exc)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "success": False,
                "error": "ModelGenerationError",
                "message": f"Gemma model synthesis failed: {safe_msg}",
            },
        )

    if not raw_sql or not raw_sql.strip():
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "success": False,
                "error": "EmptyModelOutput",
                "message": "Gemma model did not return any SQL code.",
            },
        )

    # 5. Independent Server-Side AST SQL Validation
    is_valid, val_msg, normalized_sql = validate_and_normalize_sql(
        raw_sql=raw_sql,
        allowed_tables=allowed_tables,
        max_row_limit=100,
    )

    if not is_valid or not normalized_sql:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": "SQLValidationError",
                "message": f"Generated SQL failed safety validation: {val_msg}",
                "generated_sql": raw_sql,
                "runtime": runtime_name,
            },
        )

    # 6. Execute Validated SQL on Snowflake
    try:
        columns, rows, count = execute_validated_query(normalized_sql, row_limit=100)
        return {
            "success": True,
            "question": clean_question,
            "sql": normalized_sql,
            "columns": columns,
            "rows": rows,
            "count": count,
            "execution_status": "SUCCESS",
            "runtime": runtime_name,
            "stage": "Stage 3",
        }
    except Exception as exc:
        safe_msg = sanitize_error_message(exc)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "success": False,
                "error": "SnowflakeExecutionError",
                "message": f"Snowflake execution failed: {safe_msg}",
                "validated_sql": normalized_sql,
                "runtime": runtime_name,
            },
        )
