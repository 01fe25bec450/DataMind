import React, { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { SnowflakeToolbar } from './components/SnowflakeToolbar'
import { QuestionInput } from './components/QuestionInput'
import { SuggestedQueries } from './components/SuggestedQueries'
import { ResultsView } from './components/ResultsView'
import type {
  QueryDemoResult,
  SnowflakeStatusResponse,
  GemmaStatusResponse,
  DatasetSuggestion,
  AppTheme,
} from './types'
import { DEFAULT_SUGGESTIONS, matchClientIntent } from './demoData'
import {
  fetchBackendHealth,
  fetchSnowflakeStatus,
  fetchGemmaStatus,
  fetchOrderStatusCounts,
  fetchDatasetSuggestions,
  executeDatasetQuery,
} from './api'

function extractChartData(
  columns: string[],
  rows: Record<string, any>[]
): { label: string; value: number }[] {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) return []

  const firstRow = rows[0]
  let numCol: string | null = null
  let labelCol: string | null = null

  // Find first numeric column
  for (const col of columns) {
    const val = firstRow[col]
    if (typeof val === 'number') {
      numCol = col
      break
    } else if (typeof val === 'string' && !isNaN(Number(val.replace(/[$,]/g, '')))) {
      numCol = col
      break
    }
  }

  // Find first non-numeric column as label
  for (const col of columns) {
    if (col !== numCol) {
      labelCol = col
      break
    }
  }

  if (!numCol) return []

  return rows.slice(0, 15).map((row, idx) => {
    const rawVal = row[numCol!]
    const numericVal =
      typeof rawVal === 'number'
        ? rawVal
        : Number(String(rawVal).replace(/[$,]/g, '')) || 0
    const rawLabel = labelCol ? String(row[labelCol] ?? `Item ${idx + 1}`) : `Row ${idx + 1}`
    return {
      label: rawLabel,
      value: Math.round(numericVal * 100) / 100,
    }
  })
}

export const App: React.FC = () => {
  // Theme state persisted in localStorage with system preference fallback
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('datamind-theme') as AppTheme | null
    if (saved === 'dark' || saved === 'light') return saved
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
    return 'dark'
  })

  const [question, setQuestion] = useState<string>('')
  const [submittedQuery, setSubmittedQuery] = useState<string>('')
  const [result, setResult] = useState<QueryDemoResult | null>(null)
  const [backendOnline, setBackendOnline] = useState<boolean>(false)
  const [snowflakeStatus, setSnowflakeStatus] = useState<SnowflakeStatusResponse | null>(null)
  const [gemmaStatus, setGemmaStatus] = useState<GemmaStatusResponse | null>(null)
  const [suggestions, setSuggestions] = useState<DatasetSuggestion[]>(DEFAULT_SUGGESTIONS)
  const [isTestingSnowflake, setIsTestingSnowflake] = useState<boolean>(false)
  const [isLoadingQuery, setIsLoadingQuery] = useState<boolean>(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [connectionFeedback, setConnectionFeedback] = useState<{
    type: 'success' | 'error' | 'info' | null
    message: string
  } | null>(null)

  // Synchronize document theme attribute and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('datamind-theme', theme)
  }, [theme])

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Refresh status of backend, Snowflake, Gemma, and load dataset suggestions
  const refreshStatus = useCallback(async () => {
    const health = await fetchBackendHealth()
    setBackendOnline(health?.status === 'healthy')

    if (health?.status === 'healthy') {
      const [snowData, gemmaData, suggData] = await Promise.all([
        fetchSnowflakeStatus(false),
        fetchGemmaStatus(),
        fetchDatasetSuggestions(),
      ])
      setSnowflakeStatus(snowData)
      setGemmaStatus(gemmaData)
      if (suggData.suggestions && suggData.suggestions.length > 0) {
        setSuggestions(suggData.suggestions)
      }
    } else {
      setSnowflakeStatus(null)
      setGemmaStatus(null)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
    const interval = setInterval(refreshStatus, 10000)
    return () => clearInterval(interval)
  }, [refreshStatus])

  // Test Snowflake connection button handler
  const handleTestSnowflake = async () => {
    setIsTestingSnowflake(true)
    setConnectionFeedback(null)

    const res = await fetchSnowflakeStatus(true)
    setSnowflakeStatus(res)
    setIsTestingSnowflake(false)

    if (res.connected) {
      setConnectionFeedback({
        type: 'success',
        message: `Successfully connected to Snowflake (v${res.version || 'Active'})! Account: ${res.account || 'Configured'}, Warehouse: ${res.warehouse || 'Default'}, Database: ${res.database || 'Default'}.`,
      })
    } else {
      setConnectionFeedback({
        type: 'error',
        message:
          res.message ||
          'Snowflake connection test failed. Ensure your credentials in .env are correct.',
      })
    }
  }

  // Load fixed order status counts
  const handleLoadOrders = async () => {
    setIsLoadingOrders(true)
    setQueryError(null)

    const response = await fetchOrderStatusCounts()
    setIsLoadingOrders(false)

    if (response.success && response.data) {
      const rows = response.data.map((item) => ({
        ORDER_STATUS: item.order_status,
        TOTAL_ORDERS: item.total_orders.toLocaleString(),
      }))

      const chartData = response.data.map((item) => ({
        label: `Status ${item.order_status}`,
        value: item.total_orders,
      }))

      const realResult: QueryDemoResult = {
        id: 'snowflake-fixed-orders',
        title: 'ORDER_STATUS Counts (ORDERS table)',
        question: 'Fixed Query: ORDER_STATUS Counts (ORDERS table)',
        sql:
          response.query ||
          'SELECT O_ORDERSTATUS, COUNT(*) AS TOTAL_ORDERS FROM ORDERS GROUP BY O_ORDERSTATUS ORDER BY O_ORDERSTATUS;',
        columns: ['ORDER_STATUS', 'TOTAL_ORDERS'],
        rows,
        chartData,
        explanation:
          'REAL SNOWFLAKE DATA: Fixed read-only query executed directly against Snowflake.',
        isRealSnowflakeData: true,
        dataSource: 'Snowflake (Live)',
        executionStatus: 'SUCCESS',
        count: rows.length,
      }

      setResult(realResult)
      setSubmittedQuery('Order Status Counts from Snowflake')
      setQuestion('Show order status counts')
    } else {
      // If Snowflake is unconfigured, seamlessly execute against the local dataset
      handleSearchQuery('Show order status counts')
    }
  }

  // Search & suggested-query execution handler
  const handleSearchQuery = async (queryToRun?: string) => {
    const q = (queryToRun || question).trim()
    if (!q) return

    setQueryError(null)
    setSubmittedQuery(q)
    setQuestion(q)
    setIsLoadingQuery(true)

    // Execute via backend dataset endpoint
    const response = await executeDatasetQuery(q)
    setIsLoadingQuery(false)

    if (response.success && response.rows && response.columns) {
      const chartData =
        response.chart_data && response.chart_data.length > 0
          ? response.chart_data
          : extractChartData(response.columns, response.rows)

      const queryResult: QueryDemoResult = {
        id: response.id || `query-${Date.now()}`,
        title: response.title,
        question: q,
        sql: response.sql || '-- No SQL returned',
        columns: response.columns,
        rows: response.rows,
        chartData,
        explanation: response.explanation || 'Query executed on TPC-H ORDERS dataset.',
        isRealSnowflakeData: false,
        dataSource: (response.data_source as any) || 'TPC-H Orders Dataset',
        runtime: response.runtime || 'Dataset Intent Mapping',
        executionStatus: response.execution_status || 'SUCCESS',
        count: response.count ?? response.rows.length,
      }

      setResult(queryResult)
    } else {
      // Check client intent fallback if backend was unreachable
      const clientMatched = matchClientIntent(q)
      if (clientMatched) {
        setResult(clientMatched)
        setQueryError(null)
      } else {
        setQueryError(
          response.message ||
            `The question '${q}' is not currently mapped to the dataset. Please select one of the suggested query buttons.`
        )
      }
    }
  }

  const handleClear = () => {
    setQuestion('')
    setSubmittedQuery('')
    setResult(null)
    setQueryError(null)
  }

  return (
    <div className="datamind-layout">
      {/* Navigation Sidebar */}
      <Sidebar
        backendOnline={backendOnline}
        snowflakeStatus={snowflakeStatus}
        gemmaStatus={gemmaStatus}
      />

      {/* Main Content Area */}
      <main className="main-viewport">
        {/* Top Dashboard Header with Light/Dark Theme Toggle */}
        <Header
          backendOnline={backendOnline}
          snowflakeStatus={snowflakeStatus}
          gemmaStatus={gemmaStatus}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <div className="content-container">
          {/* Natural Language Question Input & Search Bar */}
          <QuestionInput
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleSearchQuery}
            onClear={handleClear}
            isLoading={isLoadingQuery || isLoadingOrders}
          />

          {/* Clickable Suggested-Query Cards Grid */}
          <SuggestedQueries
            suggestions={suggestions}
            onSelectQuery={handleSearchQuery}
            isLoading={isLoadingQuery || isLoadingOrders}
            activeQuestion={submittedQuery || question}
          />

          {/* Results, Table, Chart & Empty/Error States */}
          <ResultsView
            result={result}
            submittedQuery={submittedQuery}
            onReset={handleClear}
            isLoading={isLoadingQuery || isLoadingOrders}
            error={queryError}
            onClearError={() => setQueryError(null)}
            onSelectSuggestion={handleSearchQuery}
          />

          {/* Optional Stage 2 Snowflake Connection Toolbar */}
          <SnowflakeToolbar
            snowflakeStatus={snowflakeStatus}
            gemmaStatus={gemmaStatus}
            isTestingConnection={isTestingSnowflake}
            isLoadingOrders={isLoadingOrders}
            onTestConnection={handleTestSnowflake}
            onLoadOrders={handleLoadOrders}
            connectionFeedback={connectionFeedback}
            onDismissFeedback={() => setConnectionFeedback(null)}
          />
        </div>
      </main>
    </div>
  )
}

export default App
