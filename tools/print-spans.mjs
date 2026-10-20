// Step 2 of your receiver: print one line per span of an OTLP/JSON batch.
//
// A batch looks like this:
//   { resourceSpans: [ { resource: { attributes: [...] },          ← who sent it: service.name, service.version
//                        scopeSpans: [ { scope: { name },          ← which library made the spans
//                                        spans: [ { traceId, spanId, parentSpanId, name, kind,
//                                                   startTimeUnixNano, endTimeUnixNano,   ← nanoseconds, as strings
//                                                   status: { code },                     ← 2 = error
//                                                   attributes: [ { key, value: { stringValue | intValue | … } } ],
//                                                   events: [ { name, attributes } ] } ] } ] } ] }
//
// Uncomment the lines marked ▶ one by one (Cmd+/ or Ctrl+/ on the line) and send the span again after each:
//   ?  GET /checkout  0.0 ms  ok            ← before
//   my-first-service  GET /checkout  250.0 ms  ok
// The last two ▶ lines are for later, once the shop sends spans (it sends a lot).
// If the terminal floods while you type in the shop's search box, that is not your code — it is one of the shop's
// bugs, and you will meet it again in part 4.
// You do not need to restart the receiver: it reloads when you save this file.

// Ready-made helpers. An OTLP attribute is { key, value: { stringValue | intValue | doubleValue | boolValue } }: the
// value says its own type, because the same format has to carry data from every language.
const value = (v = {}) => v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue
const attr = (attributes = [], key) => value(attributes.find((a) => a.key === key)?.value)
// Next.js and the browser's page loader send many spans of their own on every request — not what we look for.
const NOISE = new Set(['next.js', '@opentelemetry/instrumentation-document-load'])

export function printSpans(batch) {
  for (const { resource, scopeSpans = [] } of batch.resourceSpans ?? []) {
    let service = '?'
    // service = attr(resource?.attributes, 'service.name') // ▶
    //   Why: the span itself does not say who sent it — the resource does, once for the whole batch. service.name is
    //   how every backend groups telemetry by app; without it all spans of all apps are one pile.

    for (const { scope, spans = [] } of scopeSpans) {
      for (const span of spans) {
        let ms = 0
        // ms = Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6 // ▶
        //   Why: a span has a start and an end, not a duration. The times are nanoseconds since 1970 — a number too
        //   big for a JS number to keep exactly, so OTLP/JSON sends it as a string; BigInt does the subtraction.

        let error = false
        // error = span.status?.code === 2 // ▶
        //   Why: status is how a span says it failed: 0 unset, 1 ok, 2 error. An HTTP 500 or a thrown exception
        //   ends up here — this is what an "error rate" is counted from.

        // if (NOISE.has(scope?.name) && span.kind !== 2 && !error) continue // ▶ later, when the shop sends spans
        //   Why: scope.name says which library made the span. Next.js alone makes a dozen per page; keep only
        //   requests (kind 2 = SERVER) and errors, or the few spans you care about drown.

        let indent = ''
        // indent = span.parentSpanId ? '  └ ' : '' // ▶ later, when the shop sends spans
        //   Why: parentSpanId is what turns separate spans into a tree — a trace. No parent = the root, the request.

        console.log(`${service}  ${indent}${span.name}  ${ms.toFixed(1)} ms  ${error ? 'ERROR' : 'ok'}`)
      }
    }
  }
}
