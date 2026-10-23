import React, { useState } from 'react'
import type { QueryDemoResult } from '../types'
import { DEFAULT_SUGGESTIONS } from '../demoData'

interface ResultsViewProps {
  result: QueryDemoResult | null
  submittedQuery: string
  onReset: () => void
  isLoading?: boolean
  error?: string | null
  onClearError?: () => void
  onSelectSuggestion?: (question: string) => void
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  submittedQuery,
  onReset,
  isLoading = false,
  error = null,
  onClearError,
  onSelectSuggestion,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'table' | 'chart' | 'sql'>('all')
  const [copied, setCopied] = useState(false)

  const handleCopySql = () => {
    if (result?.sql) {
      navigator.clipboard.writeText(result.sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 1. Loading State
  if (isLoading) {
    return (
      <section className="results-container empty-state-container" aria-live="polite">
        <div className="empty-state-card loading-card">
          <div className="empty-icon-ring loading-ring">
            <span className="loading-spinner-large" />
          </div>
          <h3 className="empty-title">Processing Query...</h3>
          <p className="empty-text">
            Executing query against the TPC-H ORDERS dataset. Analyzing records, aggregating
            columns, and preparing table and chart visualizations.
          </p>
        </div>
      </section>
    )
  }

  // 2. Error State
  if (error) {
    const isUnsupported =
      error.includes('not currently mapped') ||
      error.includes('UnsupportedQuestion') ||
      error.includes('suggested query')

    return (
      <section className="results-container error-state-container" aria-live="assertive">
        <div className="error-state-card">
          <div className="error-icon-ring">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="error-icon">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div className="error-badge">
            {isUnsupported ? 'UNSUPPORTED QUESTION' : 'QUERY ERROR'}
          </div>

          <h3 className="error-title">
            {isUnsupported ? 'Question Not Supported by Dataset' : 'Query Execution Error'}
          </h3>

          <p className="error-message">{error}</p>

          {/* If unsupported question, display clickable suggestions */}
          {isUnsupported && (
            <div className="unsupported-suggestions-box">
              <div className="remediation-title">
                Supported Questions for TPC-H Orders Dataset:
              </div>
              <div className="unsupported-chips-grid">
                {DEFAULT_SUGGESTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="unsupported-chip-btn"
                    onClick={() => onSelectSuggestion && onSelectSuggestion(item.question)}
                  >
                    <span className="chip-bullet">&rarr;</span>
                    <span className="chip-text">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="error-actions-row">
            {onClearError && (
              <button type="button" className="error-dismiss-btn" onClick={onClearError}>
                Clear Error
              </button>
            )}
            {onSelectSuggestion && (
              <button
                type="button"
                className="error-action-btn"
                onClick={() => onSelectSuggestion('Show order status counts')}
              >
                Run Example: Order Status Counts
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  // 3. Empty State when no query has been submitted yet
  if (!result) {
    return (
      <section className="results-container empty-state-container">
        <div className="empty-state-card">
          <div className="empty-icon-ring">
            <svg
              className="empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>

          <h3 className="empty-title">Ready to Query Dataset</h3>
          <p className="empty-text">
            Select one of the suggested query cards above or type a question into the search bar.
            DataMind will execute the query on the TPC-H ORDERS dataset and render an interactive
            data table, visual analytics chart, and the underlying SQL query.
          </p>

          <div className="empty-stage-notice">
            <div className="notice-badge">DATASET READY</div>
            <p className="notice-text">
              1,500,000 orders available. You can query status distributions, total revenue volume,
              top-ranking orders, and historical date trends immediately.
            </p>
          </div>
        </div>
      </section>
    )
  }

  // 4. Results View
  const hasChartData = Boolean(result.chartData && result.chartData.length > 0)
  const maxVal = hasChartData
    ? Math.max(...result.chartData.map((d) => d.value), 1)
    : 1

  return (
    <section className="results-container" aria-label="Query Results">
      {/* Active Results Summary Banner */}
      <div className="results-banner">
        <div className="banner-left">
          <span className="status-tag tag-real">
            {result.dataSource || 'TPC-H Orders Dataset'}
          </span>
          <span className="banner-title">
            &ldquo;{result.title || result.question || submittedQuery}&rdquo;
          </span>
        </div>
        <div className="banner-right">
          <div className="banner-stats">
            <span className="stat-pill">
              <strong>{result.rows.length}</strong> row{result.rows.length === 1 ? '' : 's'}
            </span>
            <span className="stat-pill status-success-pill">
              STATUS: {result.executionStatus || 'SUCCESS'}
            </span>
          </div>
          <button type="button" className="reset-query-btn" onClick={onReset} title="Clear results">
            Reset View
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="results-tabs-bar">
        <div className="tabs-list">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Views
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            Results Table <span className="tab-count">({result.rows.length})</span>
          </button>
          {hasChartData && (
            <button
              type="button"
              className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
              onClick={() => setActiveTab('chart')}
            >
              Visual Chart
            </button>
          )}
          <button
            type="button"
            className={`tab-btn ${activeTab === 'sql' ? 'active' : ''}`}
            onClick={() => setActiveTab('sql')}
          >
            SQL Query
          </button>
        </div>

        <div className="tab-context-badge">
          <span className="mock-db-label">Source:</span>
          <span className="mock-db-name source-real">
            {result.dataSource || 'TPC-H Orders Dataset'}
          </span>
        </div>
      </div>

      {/* Main Results Grid */}
      <div className="results-grid">
        {/* Section 1: Results Table */}
        {(activeTab === 'all' || activeTab === 'table') && (
          <div className="result-card table-preview-card">
            <div className="card-header">
              <div className="card-title-group">
                <svg
                  className="card-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18" />
                </svg>
                <h4 className="card-title">Dataset Query Results</h4>
                <span className="demo-pill pill-real">
                  {result.dataSource || 'TPC-H Orders'}
                </span>
              </div>
              <div className="row-count-badge">
                {result.rows.length} row{result.rows.length === 1 ? '' : 's'} returned
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                    {result.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.length === 0 ? (
                    <tr>
                      <td colSpan={result.columns.length + 1} className="table-cell-empty">
                        No records returned from this query.
                      </td>
                    </tr>
                  ) : (
                    result.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="table-cell-index">{rIdx + 1}</td>
                        {result.columns.map((col) => (
                          <td key={col} className="table-cell">
                            {row[col] !== undefined && row[col] !== null
                              ? String(row[col])
                              : '—'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card-footer-note">
              <span>Explanation:</span> {result.explanation}
            </div>
          </div>
        )}

        {/* Section 2: Visual Chart (Only rendered when suitable chart data exists) */}
        {hasChartData && (activeTab === 'all' || activeTab === 'chart') && (
          <div className="result-card chart-preview-card">
            <div className="card-header">
              <div className="card-title-group">
                <svg
                  className="card-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="12" width="4" height="9" rx="1" />
                  <rect x="10" y="7" width="4" height="14" rx="1" />
                  <rect x="17" y="3" width="4" height="18" rx="1" />
                </svg>
                <h4 className="card-title">Visual Analytics</h4>
                <span className="demo-pill pill-cyan">BAR CHART</span>
              </div>
              <div className="chart-legend-text">
                Relative quantitative comparison
              </div>
            </div>

            <div className="chart-body">
              <div className="custom-bar-chart">
                {result.chartData.map((item, idx) => {
                  const pct = Math.max(Math.round((item.value / maxVal) * 100), 4)
                  return (
                    <div key={idx} className="bar-column" title={`${item.label}: ${item.value.toLocaleString()}`}>
                      <div className="bar-value-top">{item.value.toLocaleString()}</div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            height: `${pct}%`,
                            animationDelay: `${idx * 60}ms`,
                          }}
                        />
                      </div>
                      <div className="bar-label">{item.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: SQL Code Block */}
        {(activeTab === 'all' || activeTab === 'sql') && (
          <div className="result-card sql-preview-card">
            <div className="card-header">
              <div className="card-title-group">
                <svg
                  className="card-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                <h4 className="card-title">Underlying SQL Statement</h4>
                <span className="demo-pill pill-purple">SNOWFLAKE SQL</span>
              </div>
              <button
                type="button"
                className="copy-sql-btn"
                onClick={handleCopySql}
                title="Copy SQL statement to clipboard"
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="copy-icon">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="copy-icon">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="sql-code-block">
              <code>{result.sql}</code>
            </pre>
          </div>
        )}
      </div>
    </section>
  )
}
