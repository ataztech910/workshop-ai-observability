// The finished receiver, for `npm run receiver -- --solution`: tools/receiver.mjs with every ▶ line uncommented,
// printing with the finished tools/solutions/print-spans.mjs. The comments under each line say why it is there.
import { appendFileSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { gunzipSync } from 'node:zlib'

function start(printSpans) {
  const PORT = 4318
  const DIR = new URL('../../.telemetry/', import.meta.url) // in the repo root, wherever you start it from
  const FILE = new URL('spans.ndjson', DIR)
  mkdirSync(DIR, { recursive: true })

  // Ready-made helpers — the plumbing, not the point:
  // the body as an object (senders may gzip it to save bandwidth), and one batch per line in the file.
  const decode = (body, headers) => JSON.parse((headers['content-encoding'] === 'gzip' ? gunzipSync(body) : body).toString('utf8'))
  const save = (batch) => appendFileSync(FILE, JSON.stringify(batch) + '\n')

  createServer((req, res) => {
    // Like the observer: `npm run dev:v1` / `dev:v2` check that something is listening before they start the shop.
    if (req.method === 'GET' && req.url === '/health') return res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}')
    if (req.method !== 'POST' || !req.url?.startsWith('/v1/traces')) return res.writeHead(404).end()
    // OTLP also comes as protobuf (application/x-protobuf); next-observe sends JSON, and JSON is what we can read.
    if (!String(req.headers['content-type']).includes('json')) return res.writeHead(415).end('this receiver reads OTLP/JSON only')

    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(chunk)
      //   Why: a request body does not arrive in one piece — HTTP delivers it in chunks as the network brings them.
      //   Keep every chunk; drop one and the JSON is cut in the middle.
    })
    req.on('error', () => res.destroy()) // the sender went away mid-request: nothing to answer
    req.on('end', () => {
      let batch
      try {
        batch = decode(Buffer.concat(chunks), req.headers)
        //   Why: only now is the body complete — glue the chunks together and read the JSON. This object is the
        //   OTLP batch: resourceSpans → scopeSpans → spans.
      } catch {
        // A broken body is the sender's problem: 400 tells it not to send this batch again.
        return res.writeHead(400).end('body is not JSON (or not valid gzip)')
      }

      // Whatever goes wrong here — the disk, your print-spans.mjs — the receiver keeps going.
      try {
        save(batch)
        //   Why: telemetry is only worth something if it is kept — this is the whole "storage" of our backend.
        //   It comes before printing: a bug in your printing must not cost you the data.
        printSpans(batch)
        //   Why: the part a human looks at — one line per span (tools/print-spans.mjs, step 2).
      } catch (error) {
        console.error(error)
      }

      return res.writeHead(200, { 'content-type': 'application/json' }).end('{}')
      //   Why: the sender waits for this answer. In OTLP, success is an empty response `{}` with status 200;
      //   anything else and the app's APM agent counts the batch as failed — it retries only on 429 or 502–504,
      //   every other answer and the batch is dropped for good.
    })
  })
    .on('error', (error) => {
      const taken = error.code === 'EADDRINUSE'
      console.error(taken ? `port ${PORT} is taken — stop the observer (or whatever listens there): the app sends to ${PORT}` : error.message)
      process.exit(1)
    })
    .listen(PORT, '127.0.0.1', () => console.log(`receiver  http://127.0.0.1:${PORT}/v1/traces → .telemetry/spans.ndjson`))
}

start((await import('./print-spans.mjs')).printSpans)
