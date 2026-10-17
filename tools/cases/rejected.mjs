// Your part in case 2: which spans are rejected checkout requests?
//
// A span here is a plain object: { service, version, name, kind, traceId, spanId, parentSpanId, durationMs, error,
// attributes, events }. kind 2 = SERVER — a request the app received. A server span of a request carries
// attributes['http.route'] (like '/api/checkout') and attributes['http.status_code'] (like 400).
export function isRejected(span) {
  // TODO: return true for a SERVER span of /api/checkout that answered 400.
  return false
}
