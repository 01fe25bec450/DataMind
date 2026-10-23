import type {
  BackendHealthResponse,
  SnowflakeStatusResponse,
  OrdersCountApiResponse,
  GemmaStatusResponse,
  NlQueryApiResponse,
  DatasetSuggestionsResponse,
} from './types'

// Centralized API Base URL (defaults to http://127.0.0.1:8000 for local development)
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://127.0.0.1:8000'

interface SafeFetchResult<T> {
  ok: boolean
  status: number
  data?: T
  error?: string
  message: string
}

/**
 * Safely executes a fetch request with timeouts, response validation,
 * and robust error handling.
 *
 * Prevents "Unexpected end of JSON input" by:
 *   1. Checking content-type before attempting JSON parsing.
 *   2. Inspecting raw response text for emptiness before calling JSON.parse.
 *   3. Gracefully extracting structured error messages from 4xx/5xx responses.
 */
async function safeFetchJson<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs = 15000
): Promise<SafeFetchResult<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    })

    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.toLowerCase().includes('application/json')
    const rawText = await res.text()

    let parsedJson: any = null
    if (isJson && rawText.trim().length > 0) {
      try {
        parsedJson = JSON.parse(rawText)
      } catch {
        return {
          ok: false,
          status: res.status,
          error: 'InvalidJson',
          message: `Server returned malformed JSON response (HTTP ${res.status}).`,
        }
      }
    }

    if (res.ok) {
      if (parsedJson !== null) {
        return {
          ok: true,
          status: res.status,
          data: parsedJson as T,
          message: parsedJson?.message || 'Success',
        }
      } else {
        return {
          ok: false,
          status: res.status,
          error: 'EmptyResponse',
          message: `Server returned an empty or non-JSON response (HTTP ${res.status}).`,
        }
      }
    } else {
      // Non-2xx HTTP status (4xx or 5xx)
      let cleanText: string | null = null
      if (rawText.trim().length > 0 && rawText.length < 300) {
        if (rawText.trim().startsWith('<')) {
          const stripped = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          cleanText = stripped ? `HTTP ${res.status}: ${stripped}` : null
        } else {
          cleanText = rawText.trim()
        }
      }

      const detailMsg =
        parsedJson?.message ||
        parsedJson?.detail ||
        parsedJson?.error ||
        cleanText ||
        `Server returned error HTTP ${res.status} (${res.statusText || 'Error'}).`

      return {
        ok: false,
        status: res.status,
        data: parsedJson as T,
        error: parsedJson?.error || `HttpError_${res.status}`,
        message: detailMsg,
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        status: 0,
        error: 'TimeoutError',
        message: `Request timed out after ${timeoutMs / 1000} seconds contacting ${url}.`,
      }
    }

    const errorDetails = err instanceof Error ? err.message : 'Network error'
    return {
      ok: false,
      status: 0,
      error: 'NetworkError',
      message: `Backend server is offline or unreachable at ${API_BASE_URL} (${errorDetails}). Please ensure the FastAPI backend is running.`,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchBackendHealth(): Promise<BackendHealthResponse | null> {
  const result = await safeFetchJson<BackendHealthResponse>('/health', {}, 6000)
  if (result.ok && result.data && result.data.status === 'healthy') {
    return result.data
  }
  return null
}

export async function fetchSnowflakeStatus(
  testConnection = false
): Promise<SnowflakeStatusResponse> {
  const endpoint = `/api/snowflake/status${testConnection ? '?test=true' : ''}`
  const result = await safeFetchJson<SnowflakeStatusResponse>(endpoint, {}, 15000)

  if (result.data) {
    return result.data
  }

  return {
    configured: false,
    connected: false,
    success: false,
    message: result.message,
  }
}

export async function fetchGemmaStatus(): Promise<GemmaStatusResponse> {
  const result = await safeFetchJson<GemmaStatusResponse>('/api/gemma/status', {}, 8000)

  if (result.data) {
    return result.data
  }

  return {
    available: false,
    runtime: 'none',
    model: 'none',
    message: result.message,
  }
}

export async function fetchOrderStatusCounts(): Promise<OrdersCountApiResponse> {
  const result = await safeFetchJson<OrdersCountApiResponse>('/api/orders/status-counts', {}, 20000)

  if (result.data) {
    return result.data
  }

  return {
    success: false,
    error: result.error || 'NetworkError',
    message: result.message,
  }
}

export async function submitNaturalLanguageQuery(
  question: string
): Promise<NlQueryApiResponse> {
  const result = await safeFetchJson<NlQueryApiResponse>(
    '/api/query',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    },
    45000
  )

  if (result.data) {
    return result.data
  }

  return {
    success: false,
    error: result.error || 'NetworkError',
    message: result.message,
  }
}

export async function fetchDatasetSuggestions(): Promise<DatasetSuggestionsResponse> {
  const result = await safeFetchJson<DatasetSuggestionsResponse>('/api/dataset/suggestions', {}, 8000)

  if (result.ok && result.data) {
    return result.data
  }

  // Graceful fallback to default suggestions if backend is offline
  return {
    success: true,
    dataset: 'TPC-H Orders Dataset',
    table: 'ORDERS',
    columns: ['O_ORDERKEY', 'O_CUSTKEY', 'O_ORDERSTATUS', 'O_TOTALPRICE', 'O_ORDERDATE'],
    suggestions: [
      {
        id: 'order-status-counts',
        title: 'Show order status counts',
        description: 'Distribution of orders by fulfillment status (Fulfilled, Open, Pending)',
        question: 'Show order status counts',
        category: 'Status Distribution',
        badge: 'Aggregation',
      },
      {
        id: 'total-orders',
        title: 'Show total orders',
        description: 'Total volume of all customer purchase orders in the dataset',
        question: 'Show total orders',
        category: 'Volume Metric',
        badge: 'Summary',
      },
      {
        id: 'total-order-value',
        title: 'Show total order value',
        description: 'Total revenue and monetary volume grouped by fulfillment status',
        question: 'Show total order value',
        category: 'Financial Revenue',
        badge: 'Monetary Sum',
      },
      {
        id: 'highest-value-orders',
        title: 'Show the highest-value orders',
        description: 'Top 10 highest individual purchase orders ranked by total price',
        question: 'Show the highest-value orders',
        category: 'Order Ranking',
        badge: 'Top 10',
      },
      {
        id: 'orders-by-date',
        title: 'Show orders by date',
        description: 'Annual order volume and sales trend across historical order dates (1992-1998)',
        question: 'Show orders by date',
        category: 'Time Series',
        badge: 'Historical Trend',
      },
    ],
  }
}

export async function executeDatasetQuery(
  question: string
): Promise<NlQueryApiResponse> {
  const result = await safeFetchJson<NlQueryApiResponse>(
    '/api/dataset/query',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    },
    20000
  )

  if (result.data) {
    return result.data
  }

  return {
    success: false,
    error: result.error || 'NetworkError',
    message: result.message,
  }
}

