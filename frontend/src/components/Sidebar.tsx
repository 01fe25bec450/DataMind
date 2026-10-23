import React from 'react'
import type { SnowflakeStatusResponse, GemmaStatusResponse } from '../types'

interface SidebarProps {
  backendOnline: boolean
  snowflakeStatus: SnowflakeStatusResponse | null
  gemmaStatus: GemmaStatusResponse | null
}

export const Sidebar: React.FC<SidebarProps> = ({
  backendOnline,
  snowflakeStatus,
  gemmaStatus,
}) => {
  const isConnected = snowflakeStatus?.connected ?? false
  const isConfigured = snowflakeStatus?.configured ?? false
  const isGemmaAvailable = gemmaStatus?.available ?? false

  return (
    <aside className="sidebar">
      {/* Brand Logo Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <svg
            className="brand-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a4 4 0 0 0-4 4v1H7a4 4 0 0 0-4 4v2a4 4 0 0 0 4 4h1v1a4 4 0 0 0 8 0v-1h1a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4h-1V6a4 4 0 0 0-4-4z" />
            <path d="M9 12h6" />
            <path d="M12 9v6" />
          </svg>
        </div>
        <div className="brand-text">
          <h1 className="brand-name">DataMind</h1>
          <span className="brand-edition">OSS Hacktoberfest '26</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-group-label">WORKSPACE</div>
        <button className="nav-item active" type="button">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="nav-label">Talk to Your Data</span>
          <span className="nav-pill active-pill">Active</span>
        </button>

        <button className="nav-item" type="button">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span className="nav-label">Data Sources</span>
          <span className="nav-pill active-pill">Snowflake</span>
        </button>

        <button className="nav-item" type="button">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span className="nav-label">Schema Explorer</span>
          <span className="nav-pill active-pill">Live</span>
        </button>

        <button className="nav-item" type="button">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 14 14" />
          </svg>
          <span className="nav-label">Query History</span>
          <span className="nav-pill">Session</span>
        </button>
      </nav>

      {/* Integration Status Section */}
      <div className="sidebar-integrations">
        <div className="nav-group-label">CONNECTIONS (STAGE 3)</div>

        {/* Backend status */}
        <div className="integration-item">
          <div className="integration-icon-wrap">
            <span className={`status-dot ${backendOnline ? 'online' : 'checking'}`} />
          </div>
          <div className="integration-details">
            <span className="integration-name">FastAPI Backend</span>
            <span className="integration-status">
              {backendOnline ? 'Connected (:8000)' : 'Checking / Off'}
            </span>
          </div>
        </div>

        {/* Snowflake status */}
        <div className={`integration-item ${isConnected ? '' : isConfigured ? '' : 'disabled'}`}>
          <div className="integration-icon-wrap">
            <span
              className={`status-dot ${isConnected ? 'online' : isConfigured ? 'checking' : 'disconnected'}`}
            />
          </div>
          <div className="integration-details">
            <span className="integration-name">Snowflake DB</span>
            <span className="integration-status">
              {isConnected
                ? 'Connected (Live)'
                : isConfigured
                  ? 'Configured (.env)'
                  : 'Not Configured'}
            </span>
          </div>
        </div>

        {/* Gemma status */}
        <div className={`integration-item ${isGemmaAvailable ? '' : 'disabled'}`}>
          <div className="integration-icon-wrap">
            <span className={`status-dot ${isGemmaAvailable ? 'online' : 'checking'}`} />
          </div>
          <div className="integration-details">
            <span className="integration-name">Google Gemma</span>
            <span className="integration-status">
              {isGemmaAvailable
                ? `${gemmaStatus?.model} (${gemmaStatus?.runtime})`
                : 'Standby / Setup Needed'}
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="stage-badge">
          <span className="stage-tag">Stage 3</span>
          <span className="stage-desc">Gemma NL-to-SQL Live</span>
        </div>
      </div>
    </aside>
  )
}
