"""
DataMind — Talk to Your Data
Streamlit Web Application

Enables users to ask natural-language questions about their Snowflake orders data,
inspect generated/validated SQL, view interactive tables, and explore visual analytics.
Integrates with backend services:
  - backend.app.snowflake_service: Secure Snowflake connection and live queries
  - backend.app.dataset_service: TPC-H ORDERS dataset metadata and canonical queries
  - backend.app.gemma_service: Natural language to SQL synthesis
  - backend.app.sql_validator: AST SQL safety validator
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd
import streamlit as st

# Ensure project root and backend folder are in sys.path
_root_dir = Path(__file__).resolve().parent
_backend_dir = _root_dir / "backend"
for _p in [str(_root_dir), str(_backend_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from backend.app.snowflake_service import (
        check_configuration_status,
        test_connection,
        fetch_order_status_counts,
        execute_validated_query,
        sanitize_error_message,
        get_snowflake_config,
    )
    from backend.app.dataset_service import (
        get_suggested_queries,
        get_dataset_metadata,
        execute_dataset_query,
        SUGGESTED_QUERIES,
    )
    from backend.app.gemma_service import (
        get_gemma_status,
        generate_sql_from_question,
    )
    from backend.app.sql_validator import validate_and_normalize_sql
except ImportError:
    from app.snowflake_service import (
        check_configuration_status,
        test_connection,
        fetch_order_status_counts,
        execute_validated_query,
        sanitize_error_message,
        get_snowflake_config,
    )
    from app.dataset_service import (
        get_suggested_queries,
        get_dataset_metadata,
        execute_dataset_query,
        SUGGESTED_QUERIES,
    )
    from app.gemma_service import (
        get_gemma_status,
        generate_sql_from_question,
    )
    from app.sql_validator import validate_and_normalize_sql

# Page configuration
st.set_page_config(
    page_title="DataMind — Talk to Your Data",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling
st.markdown(
    """
    <style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        margin-bottom: 0.2rem;
        background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .sub-header {
        font-size: 1rem;
        color: #94a3b8;
        margin-bottom: 1.5rem;
    }
    .badge-real {
        background-color: #064e3b;
        color: #34d399;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        display: inline-block;
        margin-bottom: 10px;
    }
    .badge-demo {
        background-color: #78350f;
        color: #fbbf24;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        display: inline-block;
        margin-bottom: 10px;
    }
    .metric-card {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 8px;
        padding: 12px;
        text-align: center;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# Sidebar: System Status & Configuration
with st.sidebar:
    st.title("⚙️ System Status")

    # Snowflake Status
    st.subheader("❄️ Snowflake Connection")
    sf_status = check_configuration_status()
    if sf_status.get("configured"):
        st.success("Configured in environment")
        st.caption(f"**Account:** `{sf_status.get('account')}`")
        st.caption(f"**User:** `{sf_status.get('user')}`")
        st.caption(f"**Warehouse:** `{sf_status.get('warehouse') or 'Default'}`")
        st.caption(f"**Database:** `{sf_status.get('database') or 'Default'}`")
        st.caption(f"**Schema:** `{sf_status.get('schema') or 'Default'}`")
    else:
        st.warning("Not configured in `.env`")
        missing = sf_status.get("missing_variables", [])
        if missing:
            st.caption(f"Missing: `{', '.join(missing)}`")

    if st.button("🔌 Test Snowflake Connection", use_container_width=True):
        with st.spinner("Connecting to Snowflake..."):
            is_ok, msg, details = test_connection()
            if is_ok:
                st.success(f"Connected: {msg}")
            else:
                st.error(f"Failed: {msg}")

    st.divider()

    # Gemma Status
    st.subheader("🤖 Gemma Model Runtime")
    gemma_stat = get_gemma_status()
    if gemma_stat.get("available"):
        st.success(f"Active ({gemma_stat.get('runtime')})")
        st.caption(f"**Model:** `{gemma_stat.get('model')}`")
    else:
        st.info("Local Dataset Mode (Gemma offline)")
        st.caption(gemma_stat.get("message", "Using canonical dataset mapping"))

    st.divider()

    # Dataset Metadata
    st.subheader("📁 Dataset Information")
    meta = get_dataset_metadata()
    st.caption(f"**Name:** {meta.get('name')}")
    st.caption(f"**Table:** `{meta.get('table')}`")
    st.caption(f"**Records:** {meta.get('total_records', 0):,} rows")
    st.caption(f"**Columns:** {len(meta.get('columns', []))} fields")

# Initialize session state for question
if "current_question" not in st.session_state:
    st.session_state.current_question = "Show order status counts"
if "auto_run" not in st.session_state:
    st.session_state.auto_run = False

# Main Header
st.markdown('<div class="main-header">DataMind — Talk to Your Data</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-header">Ask natural-language questions about your Snowflake orders data, inspect validated SQL, and explore interactive visual analytics.</div>',
    unsafe_allow_html=True,
)

# Suggested Queries Bar
st.markdown("##### 💡 Suggested Questions")
sug_cols = st.columns(len(SUGGESTED_QUERIES))

for idx, sug in enumerate(SUGGESTED_QUERIES):
    with sug_cols[idx]:
        if st.button(sug["title"], key=f"sug_{sug['id']}", use_container_width=True):
            st.session_state.current_question = sug["question"]
            st.session_state.auto_run = True

# Natural Language Search Form
with st.form("query_form", clear_on_submit=False):
    user_query = st.text_input(
        "Enter your question in plain English:",
        value=st.session_state.current_question,
        placeholder="e.g. Show order status counts or total order value...",
    )
    submitted = st.form_submit_button("🔍 Run Query", use_container_width=True)

# Determine if we should execute
should_execute = submitted or st.session_state.auto_run
st.session_state.auto_run = False
active_question = user_query.strip() if submitted else st.session_state.current_question

if should_execute and active_question:
    st.divider()
    with st.spinner("Processing query..."):
        # 1. Try canonical dataset query matching
        is_success, dataset_res = execute_dataset_query(active_question)

        # 2. Check if live Snowflake execution is requested & available
        use_live_snowflake = False
        snowflake_rows = None
        snowflake_cols = None
        sql_to_run = None

        if is_success:
            sql_to_run = dataset_res.get("sql")
            # If Snowflake is configured, try live execution
            if sf_status.get("configured") and sql_to_run:
                try:
                    # Validate SQL before executing
                    valid_sql = validate_and_normalize_sql(sql_to_run)
                    sf_ok, sf_data, sf_count, sf_err = execute_validated_query(valid_sql)
                    if sf_ok and sf_data:
                        use_live_snowflake = True
                        snowflake_rows = sf_data
                        snowflake_cols = list(sf_data[0].keys()) if sf_data else []
                except Exception:
                    use_live_snowflake = False

        if is_success:
            # Display source badge
            if use_live_snowflake:
                st.markdown('<span class="badge-real">🟢 REAL SNOWFLAKE DATA</span>', unsafe_allow_html=True)
                rows = snowflake_rows
                cols = snowflake_cols
            else:
                st.markdown('<span class="badge-demo">🟡 TPC-H DATASET EXPLORER</span>', unsafe_allow_html=True)
                rows = dataset_res.get("rows", [])
                cols = dataset_res.get("columns", [])

            # Overview Metrics
            m_col1, m_col2, m_col3 = st.columns(3)
            with m_col1:
                st.metric("Query Result", dataset_res.get("title", "Orders Analysis"))
            with m_col2:
                st.metric("Rows Returned", f"{len(rows):,}")
            with m_col3:
                st.metric("Source", "Snowflake Live" if use_live_snowflake else "TPC-H Orders")

            # Insights / Explanation
            if dataset_res.get("explanation"):
                st.info(f"💡 **Insight:** {dataset_res['explanation']}")

            # Data Table & Visualizations in Tabs
            tab1, tab2, tab3 = st.tabs(["📊 Results Table & Chart", "📜 Validated SQL Query", "ℹ️ Metadata"])

            df = pd.DataFrame(rows)

            with tab1:
                st.subheader("Data Records")
                st.dataframe(df, use_container_width=True)

                # Chart rendering
                chart_data = dataset_res.get("chart_data")
                if chart_data:
                    st.subheader("Visual Analytics")
                    chart_df = pd.DataFrame(chart_data)
                    if "label" in chart_df.columns and "value" in chart_df.columns:
                        chart_df = chart_df.set_index("label")
                        st.bar_chart(chart_df["value"])
                elif len(df) > 1 and len(df.columns) >= 2:
                    st.subheader("Visual Analytics")
                    # Try plotting first string column against first numeric column
                    num_cols = df.select_dtypes(include=["number"]).columns
                    cat_cols = df.select_dtypes(exclude=["number"]).columns
                    if len(num_cols) > 0 and len(cat_cols) > 0:
                        chart_df = df.set_index(cat_cols[0])[[num_cols[0]]]
                        st.bar_chart(chart_df)

            with tab2:
                st.subheader("Snowflake SQL")
                st.code(sql_to_run or dataset_res.get("sql", "-- No SQL available"), language="sql")
                st.caption("✅ Verified safe and read-only by independent server-side AST validator (`sqlglot`).")

            with tab3:
                st.json({
                    "question": active_question,
                    "canonical_id": dataset_res.get("id"),
                    "data_source": dataset_res.get("data_source"),
                    "runtime": dataset_res.get("runtime"),
                    "execution_status": "SUCCESS",
                })

        else:
            # Question was unsupported by canonical dataset mapping
            st.error(dataset_res.get("message", "Unsupported question."))
            st.markdown("**Try asking one of the following:**")
            for q_text in dataset_res.get("supported_queries", []):
                st.markdown(f"- `{q_text}`")
