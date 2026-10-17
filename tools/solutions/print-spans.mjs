// The finished tools/print-spans.mjs.
const value = (v = {}) => v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue
const attr = (attributes = [], key) => value(attributes.find((a) => a.key === key)?.value)
// Next.js and the browser's page loader send many spans of their own on every request — not what we look for.
const NOISE = new Set(['next.js', '@opentelemetry/instrumentation-document-load'])

export function printSpans(batch) {
  for (const { resource, scopeSpans = [] } of batch.resourceSpans ?? []) {
    const service = attr(resource?.attributes, 'service.name')
    for (const { scope, spans = [] } of scopeSpans) {
      for (const span of spans) {
        const error = span.status?.code === 2
        if (NOISE.has(scope?.name) && span.kind !== 2 && !error) continue
        const ms = Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6
        const indent = span.parentSpanId ? '  └ ' : ''
        console.log(`${service}  ${indent}${span.name}  ${ms.toFixed(1)} ms  ${error ? 'ERROR' : 'ok'}`)
      }
    }
  }
}
