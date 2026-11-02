// Ready-made plumbing for tools/agent.mjs — the model and the printout, not the point. Nothing to change here.
//
// The model, like the observer's:
//   npm run agent "…"              a mock model: no key, no network — the same loop, deterministic
//   npm run agent -- --real "…"    a real one: Gemini when GEMINI_API_KEY and GEMINI_MODEL are set (ADK talks to Gemini
//                                  itself), otherwise Kitana — your logged-in claude or codex CLI, no API key needed
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { BaseLlm } from '@google/adk'

const paint = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)

/**
 * A stand-in for a model. Each turn it asks for the next tool it has not called yet; when none are left, it answers
 * with what the tools returned. That is the agent loop with the thinking left out — which is exactly what to look at.
 */
class MockModel extends BaseLlm {
  constructor() {
    super({ model: 'mock' })
  }
  async *generateContentAsync(request) {
    const turnStart = request.contents.findLastIndex((c) => c.role === 'user' && c.parts?.some((p) => p.text))
    const parts = request.contents.slice(Math.max(turnStart, 0)).flatMap((c) => c.parts ?? [])
    const called = new Set(parts.map((p) => p.functionCall?.name).filter(Boolean))
    for (const tool of Object.values(request.toolsDict ?? {})) {
      if (called.has(tool.name)) continue
      yield { content: { role: 'model', parts: [{ functionCall: { name: tool.name, args: {} } }] }, turnComplete: true }
      return
    }
    const results = parts.filter((p) => p.functionResponse).map((p) => `${p.functionResponse.name} returned ${JSON.stringify(p.functionResponse.response)}`)
    const text = results.length ? `[mock] ${results.join(' | ')}` : '[mock] I have no tools — all I could do is guess, so I will not.'
    yield { content: { role: 'model', parts: [{ text }] }, turnComplete: true }
  }
  async connect() {
    throw new Error('the mock model has no live connection')
  }
}

export async function modelFor(argv, env = process.env) {
  if (existsSync('.env')) process.loadEnvFile('.env')
  if (!argv.includes('--real')) return { model: new MockModel(), label: 'mock model' }
  if (env.GEMINI_API_KEY) {
    if (!env.GEMINI_MODEL) throw new Error('GEMINI_API_KEY is set but GEMINI_MODEL is not — set the Gemini model name, e.g. in .env')
    return { model: env.GEMINI_MODEL, label: `Gemini (${env.GEMINI_MODEL})` } // ADK resolves gemini-* names and reads the key
  }
  const { KitanaLlm } = await import('@kitana-sdk/adk')
  return { model: new KitanaLlm({ model: env.OBSERVE_KITANA_MODEL ?? 'auto' }), label: 'Kitana (your claude / codex CLI)' }
}

/** One line per step of the loop, so you can watch it: the model asks, the code runs, the result goes back, the answer. */
export function printEvent(event, run) {
  for (const part of event.content?.parts ?? []) {
    if (part.functionCall) {
      run.calls.push(part.functionCall.name)
      console.log(`${paint(36, 'model asks')}   ${part.functionCall.name}(${JSON.stringify(part.functionCall.args ?? {})})`)
    }
    if (part.functionResponse) {
      const response = JSON.stringify(part.functionResponse.response ?? {})
      console.log(`${paint(33, 'code ran it')}  → ${response.length > 160 ? `${response.slice(0, 159)}…` : response}`)
    }
    if (part.text) {
      run.answer = part.text
      console.log(`${paint(32, 'model answers')} ${part.text}`)
    }
  }
  if (event.errorMessage) console.log(paint(31, `model error: ${event.errorMessage}`))
}

/** What npm run mission checks: the question, the tools the model called, and its answer. */
export function keepRun(run) {
  mkdirSync('.telemetry', { recursive: true })
  writeFileSync('.telemetry/agent-run.json', JSON.stringify({ ...run, atMs: Date.now() }, null, 2))
}
