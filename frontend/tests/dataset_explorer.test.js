import { test } from 'node:test'
import assert from 'node:assert'
import { DEFAULT_SUGGESTIONS, matchClientIntent } from '../src/demoData.ts'

test('DEFAULT_SUGGESTIONS contains exactly the 5 canonical supported queries', () => {
  assert.strictEqual(DEFAULT_SUGGESTIONS.length, 5)

  const expectedIds = [
    'order-status-counts',
    'total-orders',
    'total-order-value',
    'highest-value-orders',
    'orders-by-date',
  ]

  const actualIds = DEFAULT_SUGGESTIONS.map((s) => s.id)
  assert.deepStrictEqual(actualIds, expectedIds)
})

test('Suggested Query 1: Show order status counts matches and has chart data', () => {
  const result = matchClientIntent('Show order status counts')
  assert.ok(result, 'Expected result for order status counts')
  assert.strictEqual(result.id, 'order-status-counts')
  assert.ok(result.columns.includes('ORDER_STATUS'))
  assert.ok(result.columns.includes('TOTAL_ORDERS'))
  assert.ok(result.rows.length >= 3)
  assert.ok(result.chartData && result.chartData.length >= 3)
  assert.ok(result.sql.includes('O_ORDERSTATUS'))
})

test('Suggested Query 2: Show total orders matches and returns single aggregated count', () => {
  const result = matchClientIntent('Show total orders')
  assert.ok(result, 'Expected result for total orders')
  assert.strictEqual(result.id, 'total-orders')
  assert.ok(result.columns.includes('TOTAL_ORDERS'))
  assert.strictEqual(result.rows.length, 1)
  assert.ok(result.sql.includes('COUNT(*)'))
})

test('Suggested Query 3: Show total order value matches and returns total monetary sum', () => {
  const result = matchClientIntent('Show total order value')
  assert.ok(result, 'Expected result for total order value')
  assert.strictEqual(result.id, 'total-order-value')
  assert.ok(result.columns.some((col) => col.includes('TOTAL_ORDER_VALUE')))
  assert.ok(result.sql.includes('SUM(O_TOTALPRICE)'))
  assert.ok(result.chartData && result.chartData.length >= 3)
})

test('Suggested Query 4: Show the highest-value orders matches and returns sorted ranking', () => {
  const result = matchClientIntent('Show the highest-value orders')
  assert.ok(result, 'Expected result for highest-value orders')
  assert.strictEqual(result.id, 'highest-value-orders')
  assert.ok(result.columns.some((col) => col.includes('ORDER_ID') || col.includes('ORDER_KEY')))
  assert.ok(result.columns.some((col) => col.includes('TOTAL_PRICE')))
  assert.ok(result.rows.length > 0)
  assert.ok(result.sql.includes('ORDER BY') && result.sql.includes('O_TOTALPRICE DESC'))
})

test('Suggested Query 5: Show orders by date matches and returns chronological date groups', () => {
  const result = matchClientIntent('Show orders by date')
  assert.ok(result, 'Expected result for orders by date')
  assert.strictEqual(result.id, 'orders-by-date')
  assert.ok(result.columns.some((col) => col.includes('ORDER_YEAR') || col.includes('ORDER_DATE')))
  assert.ok(result.columns.includes('TOTAL_ORDERS'))
  assert.ok(result.chartData && result.chartData.length > 0)
  assert.ok(result.sql.includes('O_ORDERDATE'))
})

test('Unsupported question returns null from intent matcher', () => {
  const unsupported = [
    'What is the weather today?',
    'Delete all customer accounts',
    'Show employee salaries',
    '',
    '   ',
  ]

  for (const q of unsupported) {
    const matched = matchClientIntent(q)
    assert.strictEqual(matched, null, `Expected null for unsupported query: "${q}"`)
  }
})
