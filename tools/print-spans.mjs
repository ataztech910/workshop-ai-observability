// Your part: print one line per span of an OTLP/JSON batch.
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
// Goal, one line per span:
//   porto-shop  GET /api/products  42 ms  ok
//
// Bonus, once the shop sends spans (it sends a lot):
//   - skip the noise: spans whose scope is 'next.js' or '@opentelemetry/instrumentation-document-load', unless they
//     are a request (kind 2) or an error (status.code 2);
//   - indent a span that has a parentSpanId, so a tree looks like a tree.
// If the terminal floods while you type in the shop's search box, that is not your code — it is one of the shop's
// bugs, and you will meet it again in part 4.
// You do not need to restart the receiver: it reloads when you save this file.
export function printSpans(batch) {
  // TODO: walk resourceSpans → scopeSpans → spans; print the service name, span name, duration in ms and status.
  console.log(`received ${batch.resourceSpans?.length ?? 0} resourceSpans — now open tools/print-spans.mjs`)
}
