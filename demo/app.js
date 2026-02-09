import { explainRateLimit } from "../dist/esm/index.js"

const headersInput = document.getElementById("headersInput")
const audienceSelect = document.getElementById("audienceSelect")
const styleSelect = document.getElementById("styleSelect")
const nowInput = document.getElementById("nowInput")
const nowButton = document.getElementById("nowButton")
const messageOutput = document.getElementById("messageOutput")
const severityBadge = document.getElementById("severityBadge")
const jsonOutput = document.getElementById("jsonOutput")
const copyButton = document.getElementById("copyButton")

const exampleHeaders = `X-RateLimit-Limit: 100
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1707379200`

headersInput.value = exampleHeaders

function parseHeaders(text) {
  const headers = {}
  const lines = text.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const index = trimmed.indexOf(":")
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()
    if (key) headers[key] = value
  }

  return headers
}

function readNowOverride() {
  const raw = nowInput.value.trim()
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function updateOutput() {
  const headers = parseHeaders(headersInput.value)
  const nowOverride = readNowOverride()

  const result = explainRateLimit(headers, {
    now: nowOverride,
    audience: audienceSelect.value,
    style: styleSelect.value
  })

  messageOutput.textContent = result.message
  severityBadge.textContent = result.severity
  severityBadge.className = `badge ${result.severity === "info" ? "" : result.severity}`

  const json = JSON.stringify(
    result,
    (key, value) => (value instanceof Date ? value.toISOString() : value),
    2
  )
  jsonOutput.textContent = json
}

headersInput.addEventListener("input", updateOutput)
audienceSelect.addEventListener("change", updateOutput)
styleSelect.addEventListener("change", updateOutput)
nowInput.addEventListener("input", updateOutput)

nowButton.addEventListener("click", () => {
  nowInput.value = String(Date.now())
  updateOutput()
})

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(jsonOutput.textContent)
    copyButton.textContent = "Copied"
    setTimeout(() => {
      copyButton.textContent = "Copy JSON"
    }, 1200)
  } catch (error) {
    copyButton.textContent = "Copy failed"
    setTimeout(() => {
      copyButton.textContent = "Copy JSON"
    }, 1200)
  }
})

updateOutput()
