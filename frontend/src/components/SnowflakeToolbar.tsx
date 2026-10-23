import React from 'react'
import type { SnowflakeStatusResponse, GemmaStatusResponse } from '../types'

interface SnowflakeToolbarProps {
  snowflakeStatus: SnowflakeStatusResponse | null
  gemmaStatus: GemmaStatusResponse | null
  isTestingConnection: boolean
  isLoadingOrders: boolean
  onTestConnection: () => void
  onLoadOrders: () => void
  connectionFeedback: {
    type: 'success' | 'error' | 'info' | null
    message: string
  } | null
  onDismissFeedback: () => void
}

export const SnowflakeToolbar: React.FC<SnowflakeToolbarProps> = ({
  snowflakeStatus,
  gemmaStatus,
  isTestingConnection,
  isLoadingOrders,
  onTestConnection,
  onLoadOrders,
  connectionFeedback,
  onDismissFeedback,
}) => {
  const isConfigured = snowflakeStatus?.configured ?? false
  const isConnected = snowflakeStatus?.connected ?? false
  const isGemmaAvailable = gemmaStatus?.available ?? false

  return (
    <div className="snowflake-toolbar-card">
      <div className="toolbar-header">
        <div className="toolbar-title-group">
          <div className="snowflake-icon-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="snowflake-svg-icon">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
            </svg>
          </div>
          <div>
            <div className="toolbar-label-row">
              <span className="toolbar-tag">STAGE 3 PIPELINE</span>
              <span className="toolbar-title">Gemma NL-to-SQL + Snowflake Hub</span>
            </div>
            <p className="toolbar-desc">
              Translate plain English queries into validated Snowflake SQL via Google Gemma.
              Independent AST parsing ensures strictly read-only execution.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="toolbar-actions">
          <button
            id="test-snowflake-btn"
            type="button"
            className="btn-toolbar btn-test"
            onClick={onTestConnection}
            disabled={isTestingConnection}
            title="Test connection to Snowflake via backend"
          >
            {isTestingConnection ? (
              <>
                <span className="btn-spinner" />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Test Snowflake</span>
              </>
            )}
          </button>

          <button
            id="load-orders-btn"
            type="button"
            className="btn-toolbar btn-load"
            onClick={onLoadOrders}
            disabled={isLoadingOrders}
            title="Fetch fixed read-only query from Snowflake"
          >
            {isLoadingOrders ? (
              <>
                <span className="btn-spinner" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                <span>Run Fixed Query</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metadata & Status Details */}
      <div className="toolbar-meta-row">
        <div className="meta-item">
          <span className="meta-label">Snowflake:</span>
          <span className={`meta-value ${isConnected ? 'val-connected' : isConfigured ? 'val-configured' : 'val-unconfigured'}`}>
            {isConnected ? 'Verified Live' : isConfigured ? 'Configured (.env)' : 'Not Configured'}
          </span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Gemma Runtime:</span>
          <span className={`meta-value ${isGemmaAvailable ? 'val-connected' : 'val-unconfigured'}`}>
            {isGemmaAvailable ? `${gemmaStatus?.model} (${gemmaStatus?.runtime})` : 'Standby / Configure in .env'}
          </span>
        </div>

        {snowflakeStatus?.warehouse && (
          <div className="meta-item">
            <span className="meta-label">Warehouse:</span>
            <span className="meta-code">{snowflakeStatus.warehouse}</span>
          </div>
        )}

        {snowflakeStatus?.database && (
          <div className="meta-item">
            <span className="meta-label">Database:</span>
            <span className="meta-code">{snowflakeStatus.database}</span>
          </div>
        )}

        {snowflakeStatus?.schema && (
          <div className="meta-item">
            <span className="meta-label">Schema:</span>
            <span className="meta-code">{snowflakeStatus.schema}</span>
          </div>
        )}
      </div>

      {/* Connection Feedback Banner */}
      {connectionFeedback && (
        <div className={`feedback-alert feedback-${connectionFeedback.type}`}>
          <div className="feedback-content">
            <span className="feedback-badge">
              {connectionFeedback.type === 'success' ? 'CONNECTED' : 'STATUS'}
            </span>
            <span className="feedback-text">{connectionFeedback.message}</span>
          </div>
          <button
            type="button"
            className="feedback-dismiss"
            onClick={onDismissFeedback}
            aria-label="Dismiss feedback"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  )
}
