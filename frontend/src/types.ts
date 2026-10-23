export type AppTheme = 'dark' | 'light'

export interface QueryDemoResult {
  id: string
  title?: string
  question: string
  sql: string
  columns: string[]
  rows: Record<string, string | number>[]
  chartData: { label: string; value: number }[]
  explanation: string
  isRealSnowflakeData?: boolean
  dataSource?: 'Snowflake (Live)' | 'Gemma + Snowflake (Live)' | 'TPC-H Orders Dataset' | 'Demo Preview'
  runtime?: string
  executionStatus?: string
  count?: number
}

export interface BackendHealthResponse {
  status: string
  service: string
  version: string
  stage: string
}

export interface SnowflakeStatusResponse {
  configured: boolean
  connected?: boolean
  account?: string | null
  warehouse?: string | null
  database?: string | null
  schema?: string | null
  role?: string | null
  version?: string | null
  message?: string
  missing_variables?: string[]
  success?: boolean
}

export interface GemmaStatusResponse {
  available: boolean
  runtime: 'ollama' | 'hosted_google_ai' | 'none'
  model: string
  has_api_key?: boolean
  ollama_online?: boolean
  ollama_endpoint?: string
  message: string
  stage?: string
}

export interface OrderStatusRecord {
  order_status: string
  total_orders: number
}

export interface OrdersCountApiResponse {
  success: boolean
  source?: string
  query?: string
  data?: OrderStatusRecord[]
  count?: number
  error?: string
  message?: string
  stage?: string
}

export interface DatasetSuggestion {
  id: string
  title: string
  description: string
  question: string
  category: string
  badge: string
  icon?: string
}

export interface DatasetSuggestionsResponse {
  success: boolean
  dataset: string
  table: string
  columns: string[]
  suggestions: DatasetSuggestion[]
  error?: string
  message?: string
}

export interface NlQueryApiResponse {
  success: boolean
  id?: string
  title?: string
  question?: string
  sql?: string
  columns?: string[]
  rows?: Record<string, any>[]
  chart_data?: { label: string; value: number }[]
  count?: number
  execution_status?: string
  runtime?: string
  data_source?: string
  explanation?: string
  error?: string
  message?: string
  generated_sql?: string
  stage?: string
  supported_queries?: string[]
}
