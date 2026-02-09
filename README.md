# Rate Limit Header Explainer

Human-friendly explanations for API rate-limit headers.

## Install

```sh
npm install rate-limit-readable
```

## Usage

```ts
import { explainRateLimit } from "rate-limit-readable"

const explanation = explainRateLimit(
  {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "3",
    "X-RateLimit-Reset": "1707379200"
  },
  { audience: "user", style: "verbose" }
)

console.log(explanation.message)
```

## API

```ts
export interface RateLimitExplanation {
  limit?: number
  remaining?: number
  resetsInSeconds?: number
  resetsAt?: Date
  isLimited: boolean
  message: string
  severity: "info" | "warning" | "error"
  retryAfterSeconds?: number
}

explainRateLimit(headers: Headers | Record<string, string>, options?)
```

Options:
- `now`: epoch ms override for tests
- `style`: `"short" | "verbose"`
- `audience`: `"user" | "developer"`

## Development

Build library:

```sh
npm run build
```

Run tests:

```sh
npm test
```

## Demo (Local)

1. Build the library.
2. Serve the repo root with a static server (so `demo/` can import `dist/`).

```sh
npm run build
python -m http.server
```

Open `http://localhost:8000/demo/`.

## Demo Deployment (GitHub Pages)

This repo includes `.github/workflows/deploy-demo.yml` which publishes the demo to GitHub Pages on pushes to `main`.

Steps:
1. Push to GitHub.
2. In the repo settings, set **Pages** → **Source** to **GitHub Actions**.
3. Push to `main` (or manually run the workflow).

The demo will be served at `https://milind-nair.github.io/rate-limit-readable/demo/`.
