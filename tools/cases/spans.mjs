// Reads .telemetry/spans.ndjson (one OTLP/JSON batch per line, written by tools/receiver.mjs) and turns the nested
// batches into a flat list of plain spans — the only thing every case script needs.
import { readFileSync } from 'node:fs'

const FILE = new URL('../../.telemetry/spans.ndjson', import.meta.url) // in the repo root
const value = (v = {}) => v.stringValue ?? (v.intValue === undefined ? undefined : Number(v.intValue)) ?? v.doubleValue ?? v.boolValue
const toObject = (attributes = []) => Object.fromEntries(attributes.map((a) => [a.key, value(a.value)]))

/** `quiet`: no file yet → an empty list instead of exiting (for npm run mission, which explains it itself). */
export function loadSpans({ quiet = false } = {}) {
  let text
  try {
    text = readFileSync(FILE, 'utf8')
  } catch (error) {
    if (quiet && error.code === 'ENOENT') return []
    console.error(error.code === 'ENOENT' ? 'no .telemetry/spans.ndjson yet — start npm run receiver and use the shop first' : error.message)
    process.exit(1)
  }
  const spans = []
  let broken = 0 // lines or spans we cannot read: e.g. the receiver is writing that line right now
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      for (const { resource, scopeSpans = [] } of JSON.parse(line).resourceSpans ?? []) {
        const r = toObject(resource?.attributes)
        for (const { spans: list = [] } of scopeSpans) {
          for (const s of list) {
            try {
              spans.push({
                service: r['service.name'],
                version: r['service.version'],
                name: s.name,
                kind: s.kind, // 2 = SERVER (a request the app received), 3 = CLIENT (a request it sent)
                traceId: s.traceId,
                spanId: s.spanId,
                parentSpanId: s.parentSpanId || undefined,
                durationMs: Number(BigInt(s.endTimeUnixNano) - BigInt(s.startTimeUnixNano)) / 1e6,
                error: s.status?.code === 2,
                attributes: toObject(s.attributes),
                events: (s.events ?? []).map((e) => ({ name: e.name, attributes: toObject(e.attributes) })),
              })
            } catch {
              broken++
            }
          }
        }
      }
    } catch {
      broken++
    }
  }
  if (broken && !quiet) console.error(`(skipped ${broken} unreadable lines or spans)`)
  return spans
}

/** The value below which p percent of the values fall: p95 = 95% of requests were faster than this. */
export function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}
