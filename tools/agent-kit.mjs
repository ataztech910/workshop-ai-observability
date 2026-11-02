// Ready-made plumbing for tools/agent.mjs — the model and the printout, not the point. Nothing to change here.
//
// The model, like the observer's:
//   npm run agent "…"              a mock model: no key, no network — the same loop, deterministic
//   npm run agent -- --real "…"    a real one: Gemini when GEMINI_API_KEY and GEMINI_MODEL are set (ADK talks to Gemini
//                                  itself), otherwise Kitana — your logged-in claude or codex CLI, no API key needed
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { BaseLlm } from '@google/adk'

const paint = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)
// The repo root, wherever you run it from — the same place npm run mission looks.
const root = new URL('../', import.meta.url)

/**
 * A stand-in for a model. Like a real one, it reads its instruction: it asks for a tool only when the instruction names
 * it, one tool per turn; when nothing is left to ask, it answers with what the tools returned. That is the agent loop
 * with the thinking left out — which is exactly what to look at.
 */
class MockModel extends BaseLlm {
  constructor() {
    super({ model: 'mock' })
  }
  async *generateContentAsync(request) {
    const turnStart = request.contents.findLastIndex((c) => c.role === 'user' && c.parts?.some((p) => p.text))
    const parts = request.contents.slice(Math.max(turnStart, 0)).flatMap((c) => c.parts ?? [])
    const called = new Set(parts.map((p) => p.functionCall?.name).filter(Boolean))
    const instruction = String(request.config?.systemInstruction ?? '')
    const tools = Object.values(request.toolsDict ?? {})
    for (const tool of tools) {
      if (called.has(tool.name) || !instruction.includes(tool.name)) continue
      yield { content: { role: 'model', parts: [{ functionCall: { name: tool.name, args: {} } }] }, turnComplete: true }
      return
    }
    const results = parts.filter((p) => p.functionResponse).map((p) => `${p.functionResponse.name} returned ${JSON.stringify(p.functionResponse.response)}`)
    const unused = tools.filter((t) => !called.has(t.name)).map((t) => t.name)
    const text = results.length
      ? `[mock] ${results.join(' | ')}`
      : unused.length
        ? `[mock] I have ${unused.join(', ')}, but nothing in my instruction says when to use it — so I did not look, and I will not guess.`
        : '[mock] I have no tools — all I could do is guess, so I will not.'
    yield { content: { role: 'model', parts: [{ text }] }, turnComplete: true }
  }
  async connect() {
    throw new Error('the mock model has no live connection')
  }
}

export async function modelFor(argv, env = process.env) {
  const dotenv = new URL('.env', root)
  if (existsSync(dotenv)) process.loadEnvFile(dotenv)
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
  run.events++
  // The answer is the text of a turn that asks for no tool; a model's preamble next to a call, or its thoughts, is not.
  const asks = (event.content?.parts ?? []).some((p) => p.functionCall)
  for (const part of event.content?.parts ?? []) {
    if (part.thought) continue
    if (part.functionCall) {
      run.calls.push(part.functionCall.name)
      console.log(`${paint(36, 'model asks')}   ${part.functionCall.name}(${JSON.stringify(part.functionCall.args ?? {})})`)
    }
    if (part.functionResponse) {
      const response = JSON.stringify(part.functionResponse.response ?? {})
      console.log(`${paint(33, 'code ran it')}  → ${response.length > 160 ? `${response.slice(0, 159)}…` : response}`)
    }
    if (part.text && !asks) {
      run.answer = part.text
      console.log(`${paint(32, 'model answers')} ${part.text}`)
    } else if (part.text) console.log(`${paint(2, 'model says')}   ${part.text}`)
  }
  if (event.errorMessage) {
    run.error = event.errorMessage
    console.log(paint(31, `model error: ${event.errorMessage}`))
  }
}

/** What npm run mission checks: the question, the tools the model called, and its answer. */
export function keepRun(run) {
  mkdirSync(new URL('.telemetry/', root), { recursive: true })
  writeFileSync(new URL('.telemetry/agent-run.json', root), JSON.stringify({ ...run, atMs: Date.now() }, null, 2))
}
