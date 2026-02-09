const test = require('node:test')
const assert = require('node:assert/strict')
const { explainRateLimit } = require('../dist/cjs/index.cjs')

test('parses headers case-insensitively and resolves epoch seconds', () => {
  const now = 1707379160000
  const result = explainRateLimit(
    {
      'X-RateLimit-Limit': '100',
      'x-ratelimit-remaining': '3',
      'X-RateLimit-Reset': '1707379200'
    },
    { now, audience: 'user', style: 'verbose' }
  )

  assert.equal(result.limit, 100)
  assert.equal(result.remaining, 3)
  assert.equal(result.resetsInSeconds, 40)
  assert.equal(result.isLimited, false)
  assert.equal(result.severity, 'warning')
  assert.match(result.message, /3 requests left/i)
})

test('retry-after overrides reset', () => {
  const now = 1707379100000
  const result = explainRateLimit(
    {
      'Retry-After': '120',
      'X-RateLimit-Reset': '1707379200'
    },
    { now, audience: 'user', style: 'short' }
  )

  assert.equal(result.retryAfterSeconds, 120)
  assert.equal(result.resetsInSeconds, 120)
  assert.equal(result.isLimited, true)
})

test('detects epoch milliseconds', () => {
  const now = 1707379100000
  const result = explainRateLimit(
    {
      'X-RateLimit-Reset': '1707379200000'
    },
    { now, audience: 'developer' }
  )

  assert.equal(result.resetsInSeconds, 100)
})

test('severity levels match remaining ratio', () => {
  const warning = explainRateLimit(
    { 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '10' },
    { audience: 'developer' }
  )
  const info = explainRateLimit(
    { 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '11' },
    { audience: 'developer' }
  )
  const error = explainRateLimit(
    { 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '0' },
    { audience: 'developer' }
  )

  assert.equal(warning.severity, 'warning')
  assert.equal(info.severity, 'info')
  assert.equal(error.severity, 'error')
})
