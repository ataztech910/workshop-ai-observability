import type { NextConfig } from 'next'
// import { withObserve } from 'next-observe/config' // ▶
//   Why: the browser cannot send spans to 127.0.0.1:4318 — that is the visitor's own machine, not yours. withObserve
//   gives the shop a route, /__observe, that takes the browser's spans and passes them on to your receiver.

const nextConfig: NextConfig = {}

let config = nextConfig
// config = withObserve(nextConfig) // ▶
//   Why: wraps the shop's config: adds that route, and names the service after package.json so the server's spans
//   and the browser's ("…-browser") come from the same app.

export default config
