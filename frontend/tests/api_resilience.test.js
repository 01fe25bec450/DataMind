import { test } from 'node:test'
import assert from 'node:assert'
import http from 'node:http'

// Implementation identical to safeFetchJson logic in api.ts
async function safeFetchJsonTest(baseUrl, endpoint, timeoutMs = 2000) {
  const url = `${baseUrl}${endpoint}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.toLowerCase().includes('application/json')
    const rawText = await res.text()

    let parsedJson = null
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
          data: parsedJson,
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
      let cleanText = null
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
        data: parsedJson,
        error: parsedJson?.error || `HttpError_${res.status}`,
        message: detailMsg,
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
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
      message: `Backend server is offline or unreachable at ${baseUrl} (${errorDetails}). Please ensure the FastAPI backend is running.`,
    }
  } finally {
    clearTimeout(timer)
  }
}

test('Frontend resilience: handles empty response without "Unexpected end of JSON input"', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(504, { 'Content-Type': 'text/plain' })
    res.end('') // Empty body
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    const result = await safeFetchJsonTest(baseUrl, '/test-empty')
    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.status, 504)
    assert.ok(!result.message.includes('Unexpected end of JSON input'))
    assert.ok(result.message.includes('504'))
  } finally {
    server.close()
  }
})

test('Frontend resilience: handles non-JSON HTML gateway error without crashing', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(502, { 'Content-Type': 'text/html' })
    res.end('<html><body>Bad Gateway</body></html>')
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    const result = await safeFetchJsonTest(baseUrl, '/test-html')
    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.status, 502)
    assert.ok(result.message.includes('502'))
  } finally {
    server.close()
  }
})

test('Frontend resilience: extracts structured JSON error message on HTTP 503', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: false,
      error: 'ConfigurationMissing',
      message: 'Snowflake is not configured. Missing required environment variables.',
    }))
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    const result = await safeFetchJsonTest(baseUrl, '/test-503')
    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.status, 503)
    assert.strictEqual(result.error, 'ConfigurationMissing')
    assert.strictEqual(result.message, 'Snowflake is not configured. Missing required environment variables.')
  } finally {
    server.close()
  }
})

test('Frontend resilience: handles connection refused gracefully', async () => {
  // Use an unassigned port that is closed
  const closedBaseUrl = 'http://127.0.0.1:59999'
  const result = await safeFetchJsonTest(closedBaseUrl, '/offline')
  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.error, 'NetworkError')
  assert.ok(result.message.includes('Backend server is offline or unreachable'))
})
