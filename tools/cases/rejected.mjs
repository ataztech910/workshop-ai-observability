// Mission 7 · One case by hand: which spans are rejected checkout requests? Uncomment the three ▶ lines (Cmd+/),
// then npm run case checkout-400 — and npm run mission 7.
//
// A span here is a plain object: { service, version, name, kind, traceId, spanId, parentSpanId, durationMs, error,
// attributes, events }.
export function isRejected(span) {
  const checks = []
  // checks.push(span.kind === 2) // ▶
  //   Why: kind 2 = SERVER — a request the shop received, not a function or a query inside it. Run the case now:
  //   every request matches. The next two lines narrow it down.
  // checks.push(span.attributes['http.route'] === '/api/checkout') // ▶
  //   Why: the route, not the URL — '/api/checkout' groups all requests to the same handler, whatever the query.
  // checks.push(span.attributes['http.status_code'] === 400) // ▶
  //   Why: 400 = the shop refused the request. Uncomment the lines one by one and run the case after each:
  //   every line narrows the search.
  return checks.length > 0 && checks.every(Boolean)
}
