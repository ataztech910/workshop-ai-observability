// The finished tools/cases/rejected.mjs.
export function isRejected(span) {
  return span.kind === 2 && span.attributes['http.route'] === '/api/checkout' && span.attributes['http.status_code'] === 400
}
