export type RateLimitSeverity = "info" | "warning" | "error"
export type RateLimitAudience = "user" | "developer"
export type RateLimitStyle = "short" | "verbose"

export interface ExplainRateLimitOptions {
  now?: number
  style?: RateLimitStyle
  audience?: RateLimitAudience
}

export interface RateLimitExplanation {
  limit?: number
  remaining?: number
  resetsInSeconds?: number
  resetsAt?: Date
  isLimited: boolean
  message: string
  severity: RateLimitSeverity
  retryAfterSeconds?: number
}

type HeadersLike = { get(name: string): string | null } | Record<string, string | number>

export function explainRateLimit(
  headers: HeadersLike,
  options: ExplainRateLimitOptions = {}
): RateLimitExplanation {
  const limit = parseNumber(getHeader(headers, "x-ratelimit-limit"))
  const remaining = parseNumber(getHeader(headers, "x-ratelimit-remaining"))
  const resetRaw = parseNumber(getHeader(headers, "x-ratelimit-reset"))
  const retryAfterRaw = parseNumber(getHeader(headers, "retry-after"))

  const nowMs = isFiniteNumber(options.now) ? options.now : Date.now()
  const style: RateLimitStyle = options.style ?? "verbose"
  const audience: RateLimitAudience = options.audience ?? "user"

  let retryAfterSeconds: number | undefined
  if (retryAfterRaw !== undefined) {
    retryAfterSeconds = clampSeconds(retryAfterRaw)
  }

  let resetsInSeconds: number | undefined
  let resetsAt: Date | undefined

  if (retryAfterSeconds !== undefined) {
    resetsInSeconds = retryAfterSeconds
    resetsAt = new Date(nowMs + retryAfterSeconds * 1000)
  } else if (resetRaw !== undefined) {
    const resolved = resolveResetSeconds(resetRaw, nowMs)
    if (resolved !== undefined) {
      resetsInSeconds = resolved
      resetsAt = new Date(nowMs + resolved * 1000)
    }
  }

  const isLimited = computeIsLimited(remaining, retryAfterSeconds)
  const severity = computeSeverity(remaining, limit, isLimited)
  const message = buildMessage({
    limit,
    remaining,
    resetsInSeconds,
    isLimited,
    style,
    audience
  })

  return {
    limit,
    remaining,
    resetsInSeconds,
    resetsAt,
    isLimited,
    message,
    severity,
    retryAfterSeconds
  }
}

function getHeader(headers: HeadersLike, name: string): string | undefined {
  if (!headers) return undefined

  const lowerName = name.toLowerCase()

  if (isHeadersLike(headers)) {
    const value = headers.get(name)
    return value === null ? undefined : value
  }

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowerName) {
      const value = (headers as Record<string, string | number>)[key]
      return typeof value === "string" ? value : String(value)
    }
  }

  return undefined
}

function isHeadersLike(headers: HeadersLike): headers is { get(name: string): string | null } {
  return typeof (headers as { get?: unknown }).get === "function"
}

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value !== "string") return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function clampSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.ceil(value))
}

function resolveResetSeconds(resetValue: number, nowMs: number): number | undefined {
  if (!Number.isFinite(resetValue)) return undefined

  const nowSeconds = nowMs / 1000
  let seconds: number

  if (resetValue >= 1e12) {
    seconds = Math.ceil(resetValue / 1000 - nowSeconds)
  } else if (resetValue >= 1e9) {
    seconds = Math.ceil(resetValue - nowSeconds)
  } else {
    seconds = Math.ceil(resetValue)
  }

  if (!Number.isFinite(seconds)) return undefined
  return Math.max(0, seconds)
}

function computeIsLimited(
  remaining: number | undefined,
  retryAfterSeconds: number | undefined
): boolean {
  if (remaining !== undefined) return remaining <= 0
  if (retryAfterSeconds !== undefined) return retryAfterSeconds > 0
  return false
}

function computeSeverity(
  remaining: number | undefined,
  limit: number | undefined,
  isLimited: boolean
): RateLimitSeverity {
  if (remaining !== undefined) {
    if (remaining <= 0) return "error"
    if (limit !== undefined && limit > 0 && remaining / limit <= 0.1) {
      return "warning"
    }
    return "info"
  }

  return isLimited ? "error" : "info"
}

function buildMessage(input: {
  limit?: number
  remaining?: number
  resetsInSeconds?: number
  isLimited: boolean
  style: RateLimitStyle
  audience: RateLimitAudience
}): string {
  const { limit, remaining, resetsInSeconds, isLimited, style, audience } = input

  if (isLimited) {
    const wait = resetsInSeconds !== undefined ? formatDuration(resetsInSeconds, style) : undefined

    if (audience === "user") {
      if (wait) {
        return `Too many requests. Try again in ${wait}.`
      }
      return "Too many requests. Please try again later."
    }

    let message = "Rate limit exceeded."
    if (limit !== undefined) {
      message += style === "short" ? ` Limit ${limit}.` : ` Limit is ${limit} requests.`
    }
    if (wait) {
      message += ` Resets in ${wait}.`
    }
    return message
  }

  if (remaining !== undefined) {
    const count = `${remaining} ${pluralize(remaining, "request")}`

    if (audience === "user") {
      let message = style === "short" ? `${count} left.` : `${count} left.`
      if (resetsInSeconds !== undefined) {
        message += ` Resets in ${formatDuration(resetsInSeconds, style)}.`
      }
      return message
    }

    let message =
      limit !== undefined
        ? `${remaining} ${pluralize(remaining, "request")} remaining of ${limit}.`
        : `${remaining} ${pluralize(remaining, "request")} remaining.`
    if (resetsInSeconds !== undefined) {
      message += ` Resets in ${formatDuration(resetsInSeconds, style)}.`
    }
    return message
  }

  if (resetsInSeconds !== undefined) {
    const wait = formatDuration(resetsInSeconds, style)
    return audience === "user"
      ? `Limits reset in ${wait}.`
      : `Rate limit resets in ${wait}.`
  }

  if (audience === "developer" && limit !== undefined) {
    return style === "short" ? `Rate limit ${limit} requests.` : `Rate limit is ${limit} requests.`
  }

  return audience === "user" ? "Request limits apply." : "Rate limit information unavailable."
}

function pluralize(value: number, word: string): string {
  return value === 1 ? word : `${word}s`
}

function formatDuration(seconds: number, style: RateLimitStyle): string {
  const safeSeconds = Math.max(0, Math.round(seconds))

  if (style === "short") {
    if (safeSeconds < 60) return `${safeSeconds}s`
    if (safeSeconds < 3600) return `${Math.ceil(safeSeconds / 60)}m`
    if (safeSeconds < 86400) return `${Math.ceil(safeSeconds / 3600)}h`
    return `${Math.ceil(safeSeconds / 86400)}d`
  }

  if (safeSeconds < 60) {
    return `${safeSeconds} ${pluralize(safeSeconds, "second")}`
  }
  if (safeSeconds < 3600) {
    const minutes = Math.ceil(safeSeconds / 60)
    return `${minutes} ${pluralize(minutes, "minute")}`
  }
  if (safeSeconds < 86400) {
    const hours = Math.ceil(safeSeconds / 3600)
    return `${hours} ${pluralize(hours, "hour")}`
  }
  const days = Math.ceil(safeSeconds / 86400)
  return `${days} ${pluralize(days, "day")}`
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}
