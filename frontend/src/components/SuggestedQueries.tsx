import React from 'react'
import type { DatasetSuggestion } from '../types'

interface SuggestedQueriesProps {
  suggestions: DatasetSuggestion[]
  onSelectQuery: (question: string) => void
  isLoading?: boolean
  activeQuestion?: string
}

export const SuggestedQueries: React.FC<SuggestedQueriesProps> = ({
  suggestions,
  onSelectQuery,
  isLoading = false,
  activeQuestion = '',
}) => {
  return (
    <section className="suggested-queries-section" aria-label="Suggested Queries">
      <div className="section-header-row">
        <div className="section-title-group">
          <span className="section-eyebrow">SUPPORTED DATASET QUERIES</span>
          <h3 className="section-title">Explore Suggested Questions</h3>
        </div>
        <span className="section-hint">
          Click any card to run the query immediately against the TPC-H ORDERS dataset
        </span>
      </div>

      <div className="suggested-cards-grid">
        {suggestions.map((item) => {
          const isActive = activeQuestion.trim().toLowerCase() === item.question.trim().toLowerCase()
          return (
            <button
              key={item.id}
              type="button"
              className={`suggested-card ${isActive ? 'card-selected' : ''}`}
              onClick={() => onSelectQuery(item.question)}
              disabled={isLoading}
              title={`Run query: ${item.question}`}
              aria-label={`Execute suggested query: ${item.title}`}
            >
              <div className="card-top-row">
                <span className="card-badge">{item.badge}</span>
                <span className="card-run-indicator">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="card-arrow-icon"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>

              <div className="card-body">
                <h4 className="card-title">{item.title}</h4>
                <p className="card-desc">{item.description}</p>
              </div>

              <div className="card-footer">
                <span className="card-action-text">Run Query &rarr;</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
