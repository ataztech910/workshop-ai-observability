// The finished tools/print-spans.mjs.
const value = (v = {}) => v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue
const attr = (attributes = [], key) => value(attributes.find((a) => a.key === key)?.value)

export function printSpans(batch) {
  for (const { resource, scopeSpans = [] } of batch.resourceSpans ?? []) {
    const service = attr(resource?.attributes, 'service.name')
    for (const { spans = [] } of scopeSpans) {
      for (const span of spans) {
        const ms = Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6
        const status = span.status?.code === 2 ? 'ERROR' : 'ok'
        console.log(`${service}  ${span.name}  ${ms.toFixed(1)} ms  ${status}`)
      }
    }
  }
}
