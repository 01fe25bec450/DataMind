import React from 'react'

interface QuestionInputProps {
  question: string
  setQuestion: (val: string) => void
  onSubmit: (queryToSubmit?: string) => void
  onClear: () => void
  isLoading?: boolean
}

export const QuestionInput: React.FC<QuestionInputProps> = ({
  question,
  setQuestion,
  onSubmit,
  onClear,
  isLoading = false,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim() && !isLoading) {
      onSubmit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (question.trim() && !isLoading) {
        onSubmit()
      }
    }
  }

  return (
    <section className="query-hero-section">
      <div className="hero-heading-group">
        <div className="hero-eyebrow">
          <span className="eyebrow-badge">DATASET EXPLORER</span>
          <span>ZeroDay OSS Hacktoberfest 2026</span>
        </div>
        <h2 className="hero-title">Talk to Your Data</h2>
        <p className="hero-description">
          Ask questions about your enterprise dataset in plain English or select a suggestion below.
          DataMind translates supported queries into verified SQL against the TPC-H ORDERS dataset
          with instant record views and data visualizations.
        </p>
      </div>

      <form className="query-form" onSubmit={handleSubmit}>
        <div className="input-bar-container">
          <div className="input-icon-slot">
            <svg
              className="search-sparkle-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <input
            id="question-input"
            type="text"
            className="natural-language-input"
            placeholder="Search or ask a question (e.g., Show order status counts, Show total order value)..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoComplete="off"
            aria-label="Question Search Input"
          />

          {question && !isLoading && (
            <button
              type="button"
              className="clear-input-button"
              onClick={onClear}
              title="Clear input"
              aria-label="Clear search input"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          <button
            id="search-btn"
            type="submit"
            className="search-submit-button"
            disabled={!question.trim() || isLoading}
            aria-label="Search dataset"
          >
            {isLoading ? (
              <>
                <span className="btn-spinner" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <svg
                  className="search-btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}
