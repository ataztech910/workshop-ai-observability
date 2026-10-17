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
export function printSpans(batch) {
  // TODO: walk resourceSpans → scopeSpans → spans; print the service name, span name, duration in ms and status.
  console.log(`received ${batch.resourceSpans?.length ?? 0} resourceSpans — now open tools/print-spans.mjs`)
}
