// Your own OTLP/HTTP receiver — the first thing every telemetry backend does. Node built-ins only.
//   npm run receiver                 listens on 127.0.0.1:4318, the standard OTLP/HTTP port: POST /v1/traces, JSON
//   npm run receiver -- --solution   the finished receiver and printing (tools/solutions/)
//
// Your part, two steps:
//   1. Below, uncomment the lines marked ▶ one by one (Cmd+/ or Ctrl+/ on the line), and read why each is there.
//      Until you do, the receiver answers every batch with "501 — uncomment the ▶ lines".
//   2. Finish tools/print-spans.mjs.
// You do not need to restart: the receiver reloads when you save.
//
// Every batch is appended as one line to .telemetry/spans.ndjson — the file the case scripts read later.
// Port 4318 is the standard OTLP/HTTP port: OpenTelemetry senders try it first.
import { appendFileSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { gunzipSync } from 'node:zlib'
import { checkMission } from './mission.mjs'

function start(printSpans) {
  const PORT = 4318
  const DIR = new URL('../.telemetry/', import.meta.url) // in the repo root, wherever you start it from
  const FILE = new URL('spans.ndjson', DIR)
  mkdirSync(DIR, { recursive: true })

  // Ready-made helpers — the plumbing, not the point:
  // the body as an object (senders may gzip it to save bandwidth), and one batch per line in the file.
  const decode = (body, headers) => JSON.parse((headers['content-encoding'] === 'gzip' ? gunzipSync(body) : body).toString('utf8'))
  const save = (batch) => appendFileSync(FILE, JSON.stringify(batch) + '\n')

  createServer((req, res) => {
    // "Are you alive?" — the shop's start scripts ask this before they start, so the app does not send into the void.
    if (req.method === 'GET' && req.url === '/health') return res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}')
    if (req.method !== 'POST' || !req.url?.startsWith('/v1/traces')) return res.writeHead(404).end()
    // OTLP has two encodings: JSON (text — this receiver reads it) and protobuf (binary and smaller, common in
    // production). We send JSON — tools/span.json; anything else gets 415 "Unsupported Media Type".
    if (!String(req.headers['content-type']).includes('json')) return res.writeHead(415).end('this receiver reads OTLP/JSON only')

    const chunks = []
    req.on('data', (chunk) => {
      // chunks.push(chunk) // ▶
      //   Why: a request body does not arrive in one piece — HTTP delivers it in chunks as the network brings them.
      //   Keep every chunk; drop one and the JSON is cut in the middle.
    })
    req.on('error', () => res.destroy()) // the sender went away mid-request: nothing to answer
    req.on('end', () => {
      if (chunks.length === 0) return res.writeHead(501).end('501 — no body kept: uncomment the first ▶ line (chunks.push)\n')
      let batch
      try {
        // batch = decode(Buffer.concat(chunks), req.headers) // ▶
        //   Why: only now is the body complete — glue the chunks together and read the JSON. This object is the
        //   OTLP batch: resourceSpans → scopeSpans → spans.
      } catch {
        // A broken body is the sender's problem: 400 tells it not to send this batch again.
        return res.writeHead(400).end('body is not JSON (or not valid gzip)')
      }
      if (!batch) return res.writeHead(501).end('501 — uncomment the ▶ lines in tools/receiver.mjs\n')

      // Whatever goes wrong here — the disk, your print-spans.mjs — the receiver keeps going.
      try {
        // save(batch) // ▶
        //   Why: telemetry is only worth something if it is kept — this is the whole "storage" of our backend.
        //   It comes before printing: a bug in your printing must not cost you the data.
        // printSpans(batch) // ▶
        //   Why: the part a human looks at — one line per span (tools/print-spans.mjs, step 2).
      } catch (error) {
        console.error(error)
      }
      // Ready-made: the checklist for "Your first span" (tools/mission.mjs). On its own, so a crash in the printing —
      // say, a timestamp you broke in span.json — does not hide the hint that says which field is wrong.
      try {
        checkMission(batch)
      } catch (error) {
        console.error(error)
      }

      // return res.writeHead(200, { 'content-type': 'application/json' }).end('{}') // ▶
      //   Why: the sender waits for this answer. In OTLP, success is an empty response `{}` with status 200;
      //   anything else and the sender counts the batch as failed — it retries only on 429 or 502–504,
      //   every other answer and the batch is dropped for good.
      res.writeHead(501).end('501 — the receiver read the batch but does not answer yet: uncomment the last ▶ line\n')
    })
  })
    .on('error', (error) => {
      const taken = error.code === 'EADDRINUSE'
      console.error(taken ? `port ${PORT} is taken — stop whatever listens there (maybe a receiver in another terminal)` : error.message)
      process.exit(1)
    })
    .listen(PORT, '127.0.0.1', () => console.log(`receiver  http://127.0.0.1:${PORT}/v1/traces → .telemetry/spans.ndjson`))
}

if (process.argv.includes('--solution')) await import('./solutions/receiver.mjs')
else start((await import('./print-spans.mjs')).printSpans)
