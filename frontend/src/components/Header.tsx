import React from 'react'
import type { SnowflakeStatusResponse, GemmaStatusResponse, AppTheme } from '../types'

interface HeaderProps {
  backendOnline: boolean
  snowflakeStatus: SnowflakeStatusResponse | null
  gemmaStatus: GemmaStatusResponse | null
  theme: AppTheme
  onToggleTheme: () => void
}

export const Header: React.FC<HeaderProps> = ({
  backendOnline,
  snowflakeStatus,
  gemmaStatus,
  theme,
  onToggleTheme,
}) => {
  const isConnected = snowflakeStatus?.connected ?? false
  const isConfigured = snowflakeStatus?.configured ?? false
  const isGemmaAvailable = gemmaStatus?.available ?? false

  return (
    <header className="app-header">
      <div className="header-breadcrumbs">
        <span className="breadcrumb-root">DataMind</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Interactive Data Dashboard</span>
      </div>

      <div className="header-controls">
        {/* Light / Dark Mode Toggle Button */}
        <button
          id="theme-toggle-btn"
          type="button"
          className="theme-toggle-button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label={`Toggle theme: currently ${theme} mode`}
        >
          {theme === 'dark' ? (
            <>
              <svg
                className="theme-icon sun-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span className="theme-label">Light Mode</span>
            </>
          ) : (
            <>
              <svg
                className="theme-icon moon-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span className="theme-label">Dark Mode</span>
            </>
          )}
        </button>

        {/* Status Indicators */}
        <div className="header-status-pills">
          {/* Backend Status Pill */}
          <div
            className={`status-pill ${backendOnline ? 'pill-success' : 'pill-neutral'}`}
            title={
              backendOnline
                ? 'FastAPI backend is active on port 8000'
                : 'FastAPI backend is offline'
            }
          >
            <span
              className={`pill-indicator ${backendOnline ? 'indicator-pulse-green' : 'indicator-amber'}`}
            />
            <span className="pill-text">
              API: {backendOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Dataset Status Pill */}
          <div
            className="status-pill pill-success"
            title="TPC-H ORDERS dataset is active and available for queries"
          >
            <span className="pill-indicator indicator-pulse-green" />
            <span className="pill-text">Dataset: Orders (Active)</span>
          </div>

          {/* Snowflake Status Pill */}
          <div
            className={`status-pill ${isConnected ? 'pill-success' : isConfigured ? 'pill-neutral' : 'pill-disconnected'}`}
            title={
              isConnected
                ? 'Snowflake database is connected'
                : isConfigured
                  ? 'Snowflake configured in .env'
                  : 'Snowflake (Optional/Standby)'
            }
          >
            <span
              className={`pill-indicator ${isConnected ? 'indicator-pulse-green' : isConfigured ? 'indicator-amber' : 'indicator-gray'}`}
            />
            <span className="pill-text">
              Snowflake: {isConnected ? 'Live' : isConfigured ? 'Configured' : 'Standby'}
            </span>
          </div>

          {/* AI / Model Status Pill */}
          <div
            className={`status-pill ${isGemmaAvailable ? 'pill-success' : 'pill-neutral'}`}
            title={
              isGemmaAvailable
                ? 'Gemma AI Model active'
                : 'AI model is on standby (Stage 3)'
            }
          >
            <span
              className={`pill-indicator ${isGemmaAvailable ? 'indicator-pulse-green' : 'indicator-amber'}`}
            />
            <span className="pill-text">
              AI: {isGemmaAvailable ? 'Active' : 'Standby'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
