import type { QueryDemoResult, DatasetSuggestion } from './types'

export const DEFAULT_SUGGESTIONS: DatasetSuggestion[] = [
  {
    id: 'order-status-counts',
    title: 'Show order status counts',
    description: 'Distribution of orders by fulfillment status (Fulfilled, Open, Pending)',
    question: 'Show order status counts',
    category: 'Status Distribution',
    badge: 'Aggregation',
    icon: 'pie-chart',
  },
  {
    id: 'total-orders',
    title: 'Show total orders',
    description: 'Total volume of all customer purchase orders in the dataset',
    question: 'Show total orders',
    category: 'Volume Metric',
    badge: 'Summary',
    icon: 'hashtag',
  },
  {
    id: 'total-order-value',
    title: 'Show total order value',
    description: 'Total revenue and monetary volume grouped by fulfillment status',
    question: 'Show total order value',
    category: 'Financial Revenue',
    badge: 'Monetary Sum',
    icon: 'dollar-sign',
  },
  {
    id: 'highest-value-orders',
    title: 'Show the highest-value orders',
    description: 'Top 10 highest individual purchase orders ranked by total price',
    question: 'Show the highest-value orders',
    category: 'Order Ranking',
    badge: 'Top 10',
    icon: 'trending-up',
  },
  {
    id: 'orders-by-date',
    title: 'Show orders by date',
    description: 'Annual order volume and sales trend across historical order dates (1992-1998)',
    question: 'Show orders by date',
    category: 'Time Series',
    badge: 'Historical Trend',
    icon: 'calendar',
  },
]

export const EXAMPLE_QUESTIONS: string[] = DEFAULT_SUGGESTIONS.map((s) => s.question)

export const DEMO_PREVIEWS: Record<string, QueryDemoResult> = {
  'Show order status counts': {
    id: 'order-status-counts',
    title: 'Order Status Counts',
    question: 'Show order status counts',
    sql: `SELECT\n  O_ORDERSTATUS AS ORDER_STATUS,\n  COUNT(*) AS TOTAL_ORDERS\nFROM\n  ORDERS\nGROUP BY\n  O_ORDERSTATUS\nORDER BY\n  TOTAL_ORDERS DESC;`,
    columns: ['ORDER_STATUS', 'TOTAL_ORDERS'],
    rows: [
      { ORDER_STATUS: 'F (Fulfilled)', TOTAL_ORDERS: '730,883' },
      { ORDER_STATUS: 'O (Open)', TOTAL_ORDERS: '729,668' },
      { ORDER_STATUS: 'P (Pending)', TOTAL_ORDERS: '39,449' },
    ],
    chartData: [
      { label: 'Fulfilled (F)', value: 730883 },
      { label: 'Open (O)', value: 729668 },
      { label: 'Pending (P)', value: 39449 },
    ],
    explanation: 'Aggregation of all 1,500,000 orders grouped by fulfillment status: 48.7% Fulfilled (F), 48.6% Open (O), and 2.6% Pending (P).',
    dataSource: 'TPC-H Orders Dataset',
    executionStatus: 'SUCCESS',
    count: 3,
  },

  'Show total orders': {
    id: 'total-orders',
    title: 'Total Orders Count',
    question: 'Show total orders',
    sql: `SELECT\n  COUNT(*) AS TOTAL_ORDERS\nFROM\n  ORDERS;`,
    columns: ['TOTAL_ORDERS'],
    rows: [
      { TOTAL_ORDERS: '1,500,000' },
    ],
    chartData: [
      { label: 'Total Orders', value: 1500000 },
    ],
    explanation: 'Total volume of customer purchase orders recorded in the TPC-H ORDERS table (1.5 million rows).',
    dataSource: 'TPC-H Orders Dataset',
    executionStatus: 'SUCCESS',
    count: 1,
  },

  'How many orders are there?': {
    id: 'total-orders',
    title: 'Total Orders Count',
    question: 'How many orders are there?',
    sql: `SELECT\n  COUNT(*) AS TOTAL_ORDERS\nFROM\n  ORDERS;`,
    columns: ['TOTAL_ORDERS'],
    rows: [
      { TOTAL_ORDERS: '1,500,000' },
    ],
    chartData: [
      { label: 'Total Orders', value: 1500000 },
    ],
    explanation: 'Total volume of customer purchase orders recorded in the TPC-H ORDERS table (1.5 million rows).',
    dataSource: 'TPC-H Orders Dataset',
    executionStatus: 'SUCCESS',
    count: 1,
  },

  'Show total order value': {
    id: 'total-order-value',
    title: 'Total Order Value by Status',
    question: 'Show total order value',
    sql: `SELECT\n  O_ORDERSTATUS AS ORDER_STATUS,\n  ROUND(SUM(O_TOTALPRICE), 2) AS TOTAL_ORDER_VALUE,\n  COUNT(O_ORDERKEY) AS ORDER_COUNT\nFROM\n  ORDERS\nGROUP BY\n  O_ORDERSTATUS\nORDER BY\n  TOTAL_ORDER_VALUE DESC;`,
    columns: ['ORDER_STATUS', 'TOTAL_ORDER_VALUE ($)', 'ORDER_COUNT'],
    rows: [
      { ORDER_STATUS: 'F (Fulfilled)', 'TOTAL_ORDER_VALUE ($)': '$1,198,421,380.50', ORDER_COUNT: '730,883' },
      { ORDER_STATUS: 'O (Open)', 'TOTAL_ORDER_VALUE ($)': '$1,197,382,900.20', ORDER_COUNT: '729,668' },
      { ORDER_STATUS: 'P (Pending)', 'TOTAL_ORDER_VALUE ($)': '$63,732,840.10', ORDER_COUNT: '39,449' },
    ],
    chartData: [
      { label: 'Fulfilled ($1.198B)', value: 1198.42 },
      { label: 'Open ($1.197B)', value: 1197.38 },
      { label: 'Pending ($63.7M)', value: 63.73 },
    ],
    explanation: 'Total monetary volume generated across all order statuses. Cumulative revenue totals $2,459,537,120.80 USD (chart values in millions USD).',
    dataSource: 'TPC-H Orders Dataset',
    executionStatus: 'SUCCESS',
    count: 3,
  },

  'What is the total order value by order status?': {
    id: 'total-order-value',
    title: 'Total Order Value by Status',
    question: 'What is the total order value by order status?',
    sql: `SELECT\n  O_ORDERSTATUS AS ORDER_STATUS,\n  ROUND(SUM(O_TOTALPRICE), 2) AS TOTAL_ORDER_VALUE,\n  COUNT(O_ORDERKEY) AS ORDER_COUNT\nFROM\n  ORDERS\nGROUP BY\n  O_ORDERSTATUS\nORDER BY\n  TOTAL_ORDER_VALUE DESC;`,
    columns: ['ORDER_STATUS', 'TOTAL_ORDER_VALUE ($)', 'ORDER_COUNT'],
    rows: [
      { ORDER_STATUS: 'F (Fulfilled)', 'TOTAL_ORDER_VALUE ($)': '$1,198,421,380.50', ORDER_COUNT: '730,883' },
      { ORDER_STATUS: 'O (Open)', 'TOTAL_ORDER_VALUE ($)': '$1,197,382,900.20', ORDER_COUNT: '729,668' },
      { ORDER_STATUS: 'P (Pending)', 'TOTAL_ORDER_VALUE ($)': '$63,732,840.10', ORDER_COUNT: '39,449' },
    ],
    chartData: [
      { label: 'Fulfilled ($1.198B)', value: 1198.42 },
      { label: 'Open ($1.197B)', value: 1197.38 },
      { label: 'Pending ($63.7M)', value: 63.73 },
    ],
    explanation: 'Total monetary volume generated across all order statuses. Cumulative revenue totals $2,459,537,120.80 USD (chart values in millions USD).',
    dataSource: 'TPC-H Orders Dataset',
    executionStatus: 'SUCCESS',
    count: 3,
  },

  'Show the highest-value orders': {
    id: 'highest-value-orders',
    title: 'Top 10 Highest-Value Orders',
    question: 'Show the highest-value orders',
    sql: `SELECT\n  O_ORDERKEY AS ORDER_ID,\n  O_CUSTKEY AS CUSTOMER_ID,\n  O_ORDERDATE AS ORDER_DATE,\n  ROUND(O_TOTALPRICE, 2) AS TOTAL_PRICE,\n  O_ORDERSTATUS AS STATUS\nFROM\n  ORDERS\nORDER BY\n  O_TOTALPRICE DESC\nLIMIT 10;`,
    columns: ['ORDER_ID', 'CUSTOMER_ID', 'ORDER_DATE', 'TOTAL_PRICE ($)', 'STATUS'],
    rows: [
      { ORDER_ID: '32', CUSTOMER_ID: '130057', ORDER_DATE: '1995-07-16', 'TOTAL_PRICE ($)': '$496,181.70', STATUS: 'O (Open)' },
      { ORDER_ID: '47', CUSTOMER_ID: '78245', ORDER_DATE: '1994-09-23', 'TOTAL_PRICE ($)': '$483,256.34', STATUS: 'F (Fulfilled)' },
      { ORDER_ID: '64', CUSTOMER_ID: '53210', ORDER_DATE: '1996-03-01', 'TOTAL_PRICE ($)': '$472,911.05', STATUS: 'F (Fulfilled)' },
      { ORDER_ID: '96', CUSTOMER_ID: '112004', ORDER_DATE: '1995-12-11', 'TOTAL_PRICE ($)': '$461,020.12', STATUS: 'O (Open)' },
      { ORDER_ID: '128', CUSTOMER_ID: '94112', ORDER_DATE: '1997-04-29', 'TOTAL_PRICE ($)': '$453,892.40', STATUS: 'F (Fulfilled)' },
      { ORDER_ID: '156', CUSTOMER_ID: '32098', ORDER_DATE: '1993-08-14', 'TOTAL_PRICE ($)': '$449,102.88', STATUS: 'F (Fulfilled)' },
      { ORDER_ID: '182', CUSTOMER_ID: '61284', ORDER_DATE: '1996-10-05', 'TOTAL_PRICE ($)': '$438,720.55', STATUS: 'O (Open)' },
      { ORDER_ID: '204', CUSTOMER_ID: '149021', ORDER_DATE: '1995-02-18', 'TOTAL_PRICE ($)': '$427,954.10', STATUS: 'F (Fulfilled)' },
      { ORDER_ID: '235', CUSTOMER_ID: '89432', ORDER_DATE: '1994-11-09', 'TOTAL_PRICE ($)': '$419,840.22', STATUS: 'F (Fulfilled)' },
      { ORDER_ID: '271', CUSTOMER_ID: '45109', ORDER_DATE: '1997-01-22', 'TOTAL_PRICE ($)': '$412,300.90', STATUS: 'O (Open)' },
    ],
    chartData: [
      { label: 'Order #32', value: 496.18 },
      { label: 'Order #47', value: 483.26 },
      { label: 'Order #64', value: 472.91 },
      { label: 'Order #96', value: 461.02 },
      { label: 'Order #128', value: 453.89 },
      { label: 'Order #156', value: 449.10 },
      { label: 'Order #182', value: 438.72 },
      { label: 'Order #204', value: 427.95 },
      { label: 'Order #235', value: 419.84 },
      { label: 'Order #271', value: 412.30 },
    ],
    explanation: 'Top 10 highest individual purchase orders ranked by total price (amounts in thousands USD on chart).',
    dataSource: 'TPC-H Orders Dataset',
    executionStatus: 'SUCCESS',
    count: 10,
  },

  'Show orders by date': {
    id: 'orders-by-date',
    title: 'Orders Trend by Year',
    question: 'Show orders by date',
    sql: `SELECT\n  SUBSTRING(O_ORDERDATE, 1, 4) AS ORDER_YEAR,\n  COUNT(*) AS TOTAL_ORDERS,\n  ROUND(SUM(O_TOTALPRICE) / 1000000, 2) AS TOTAL_VALUE_MILLIONS\nFROM\n  ORDERS\nGROUP BY\n  1\nORDER BY\n  1;`,
    columns: ['ORDER_YEAR', 'TOTAL_ORDERS', 'TOTAL_VALUE_MILLIONS ($M)'],
    rows: [
      { ORDER_YEAR: '1992', TOTAL_ORDERS: '215,420', 'TOTAL_VALUE_MILLIONS ($M)': '$352.84M' },
      { ORDER_YEAR: '1993', TOTAL_ORDERS: '214,890', 'TOTAL_VALUE_MILLIONS ($M)': '$351.92M' },
      { ORDER_YEAR: '1994', TOTAL_ORDERS: '215,110', 'TOTAL_VALUE_MILLIONS ($M)': '$352.41M' },
      { ORDER_YEAR: '1995', TOTAL_ORDERS: '215,040', 'TOTAL_VALUE_MILLIONS ($M)': '$352.28M' },
      { ORDER_YEAR: '1996', TOTAL_ORDERS: '214,980', 'TOTAL_VALUE_MILLIONS ($M)': '$352.19M' },
      { ORDER_YEAR: '1997', TOTAL_ORDERS: '215,250', 'TOTAL_VALUE_MILLIONS ($M)': '$352.65M' },
      { ORDER_YEAR: '1998', TOTAL_ORDERS: '109,310', 'TOTAL_VALUE_MILLIONS ($M)': '$179.24M' },
    ],
    chartData: [
      { label: '1992', value: 215420 },
      { label: '1993', value: 214890 },
      { label: '1994', value: 215110 },
      { label: '1995', value: 215040 },
      { label: '1996', value: 214980 },
      { label: '1997', value: 215250 },
      { label: '1998', value: 109310 },
    ],
    explanation: 'Annual order distribution across historical order dates (1992-1998). Reflects steady commercial activity across years with partial year recorded for 1998.',
    dataSource: 'TPC-H Orders Dataset',
    executionStatus: 'SUCCESS',
    count: 7,
  },
}

export function matchClientIntent(question: string): QueryDemoResult | null {
  const q = question.trim().toLowerCase()
  if (!q) return null

  // Direct match
  for (const [key, val] of Object.entries(DEMO_PREVIEWS)) {
    if (key.toLowerCase() === q) return val
  }

  // Keywords
  if (q.includes('status count') || q.includes('status counts') || (q.includes('order status') && !q.includes('value') && !q.includes('price'))) {
    return DEMO_PREVIEWS['Show order status counts']
  }
  if (q.includes('total order value') || q.includes('order value') || q.includes('revenue') || q.includes('sales')) {
    return DEMO_PREVIEWS['Show total order value']
  }
  if (q.includes('highest') || q.includes('top order') || q.includes('largest order') || q.includes('biggest order')) {
    return DEMO_PREVIEWS['Show the highest-value orders']
  }
  if (q.includes('total order') || q.includes('how many order') || q.includes('order count') || q.includes('number of order')) {
    return DEMO_PREVIEWS['Show total orders']
  }
  if (q.includes('date') || q.includes('year') || q.includes('trend') || q.includes('over time')) {
    return DEMO_PREVIEWS['Show orders by date']
  }

  return null
}
