# Examples

All examples use the same API:

```ts
import { explainRateLimit } from "rate-limit-readable"
```

Each example shows the input headers, options, and a representative output. Output times use fixed `now` values for determinism.

**1) Basic epoch seconds (user, verbose)**

```ts
const headers = {
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "3",
  "X-RateLimit-Reset": "1707379200"
}

const result = explainRateLimit(headers, {
  now: 1707379160000,
  audience: "user",
  style: "verbose"
})
```

```json
{
  "limit": 100,
  "remaining": 3,
  "resetsInSeconds": 40,
  "isLimited": false,
  "message": "3 requests left. Resets in 40 seconds.",
  "severity": "warning"
}
```

**2) Short style for compact UX**

```ts
const result = explainRateLimit(
  {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "3",
    "X-RateLimit-Reset": "1707379200"
  },
  { now: 1707379160000, audience: "user", style: "short" }
)
```

```json
{
  "message": "3 requests left. Resets in 40s.",
  "severity": "warning",
  "isLimited": false
}
```

**3) Retry-After overrides reset (user, verbose)**

```ts
const result = explainRateLimit(
  {
    "Retry-After": "120",
    "X-RateLimit-Reset": "1707379200"
  },
  { now: 1707379100000, audience: "user", style: "verbose" }
)
```

```json
{
  "retryAfterSeconds": 120,
  "resetsInSeconds": 120,
  "isLimited": true,
  "message": "Too many requests. Try again in 2 minutes.",
  "severity": "error"
}
```

**4) Limited + developer audience**

```ts
const result = explainRateLimit(
  {
    "X-RateLimit-Limit": "100",
    "Retry-After": "120"
  },
  { now: 1707379100000, audience: "developer", style: "verbose" }
)
```

```json
{
  "message": "Rate limit exceeded. Limit is 100 requests. Resets in 2 minutes.",
  "severity": "error",
  "isLimited": true
}
```

**5) Epoch milliseconds auto-detected**

```ts
const result = explainRateLimit(
  { "X-RateLimit-Reset": "1707379200000" },
  { now: 1707379100000, audience: "developer" }
)
```

```json
{
  "resetsInSeconds": 100,
  "message": "Rate limit resets in 2 minutes.",
  "severity": "info"
}
```

**6) Delta seconds in `X-RateLimit-Reset`**

```ts
const result = explainRateLimit(
  { "X-RateLimit-Reset": "45" },
  { now: 1707379100000, audience: "user" }
)
```

```json
{
  "resetsInSeconds": 45,
  "message": "Limits reset in 45 seconds.",
  "severity": "info"
}
```

**7) Remaining without reset**

```ts
const result = explainRateLimit(
  {
    "X-RateLimit-Limit": "200",
    "X-RateLimit-Remaining": "25"
  },
  { audience: "user" }
)
```

```json
{
  "message": "25 requests left.",
  "severity": "info",
  "isLimited": false
}
```

**8) Reset time in the past (clock skew or stale header)**

```ts
const result = explainRateLimit(
  { "X-RateLimit-Reset": "1707379100" },
  { now: 1707379160000, audience: "developer" }
)
```

```json
{
  "resetsInSeconds": 0,
  "message": "Rate limit resets in 0 seconds.",
  "severity": "info"
}
```

**9) Only limit (developer)**

```ts
const result = explainRateLimit(
  { "X-RateLimit-Limit": "100" },
  { audience: "developer", style: "verbose" }
)
```

```json
{
  "message": "Rate limit is 100 requests.",
  "severity": "info",
  "isLimited": false
}
```

**10) Only limit (user)**

```ts
const result = explainRateLimit(
  { "X-RateLimit-Limit": "100" },
  { audience: "user", style: "verbose" }
)
```

```json
{
  "message": "Request limits apply.",
  "severity": "info",
  "isLimited": false
}
```

**11) Malformed values are ignored**

```ts
const result = explainRateLimit(
  {
    "X-RateLimit-Remaining": "not-a-number",
    "Retry-After": "abc"
  },
  { audience: "user" }
)
```

```json
{
  "message": "Request limits apply.",
  "severity": "info",
  "isLimited": false
}
```

**12) Header map with numeric values**

```ts
const result = explainRateLimit(
  {
    "X-RateLimit-Limit": 500,
    "X-RateLimit-Remaining": 8,
    "X-RateLimit-Reset": 1707379200
  },
  { now: 1707379160000, audience: "developer" }
)
```

```json
{
  "limit": 500,
  "remaining": 8,
  "resetsInSeconds": 40,
  "severity": "warning"
}
```

**13) Using the `Headers` API**

```ts
const headers = new Headers()
headers.set("X-RateLimit-Limit", "60")
headers.set("X-RateLimit-Remaining", "0")
headers.set("Retry-After", "30")

const result = explainRateLimit(headers, {
  now: 1707379100000,
  audience: "user",
  style: "short"
})
```

```json
{
  "message": "Too many requests. Try again in 30s.",
  "severity": "error",
  "isLimited": true
}
```

Notes:
- `Retry-After` always takes priority over `X-RateLimit-Reset`.
- Reset values are auto-detected as epoch milliseconds, epoch seconds, or delta seconds.
- Negative or invalid reset values are clamped to `0` seconds.
