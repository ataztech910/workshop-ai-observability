// Mission 8 · Your first agent, by hand. Mission 7 answered "why are orders refused?" with a script you wrote the
// filter for. Now a model answers it — but a model knows nothing about your shop: it can only use the tools you give it.
// An agent is a model + an instruction + tools, in a loop: the model asks for a tool, the code runs it, the result goes
// back to the model, until it can answer. Built with Google's Agent Development Kit (ADK).
//
// Uncomment the ▶ lines (Cmd+/), then:   npm run agent "Why do orders fail?"
//                    a real model:      npm run agent -- --real "Why do orders fail?"
//                    behind?            npm run agent -- --solution   (the same file, every ▶ line uncommented)
import { FunctionTool, InMemorySessionService, LlmAgent, Runner } from '@google/adk'
import { z } from 'zod'
import { keepRun, modelFor, printEvent } from './agent-kit.mjs'
import { loadSpans } from './cases/spans.mjs'
import { isRejected } from './solutions/rejected.mjs'

// Behind? The same agent with every ▶ line uncommented.
if (process.argv.includes('--solution')) {
  await import('./solutions/agent.mjs')
  process.exit(0)
}

// A tool: a name, a description the model reads to decide when to call it, its parameters, and the code that runs.
// This one reads your raw spans (.telemetry/spans.ndjson) and returns the refused checkouts with the reason your
// placeOrder span recorded (mission 5).
const rejectedOrders = new FunctionTool({
  name: 'rejected_orders',
  description: 'Checkout requests the shop refused (HTTP 400), each with the reason the shop recorded (order.rejected).',
  parameters: z.object({}),
  execute: async () => {
    const spans = loadSpans({ quiet: true }).filter((s) => !s.service?.endsWith('-browser'))
    const byTrace = Map.groupBy(spans, (s) => s.traceId)
    const refused = spans.filter(isRejected) // the same filter as mission 7's solution
    const reasons = refused.map((r) => byTrace.get(r.traceId).find((s) => s.attributes['order.rejected'])?.attributes['order.rejected'] ?? 'no reason recorded')
    return { refused: refused.length, reasons: [...new Set(reasons)] }
  },
})

const tools = []
// tools.push(rejectedOrders) // ▶
//   Why: without tools the model can only guess — it has never seen your shop. With this one it can look at the data,
//   and everything it says can be traced back to what the tool returned.

const steps = ['You find out why orders in an online shop fail. Facts only from your tools — never guess.']
// steps.push('Call rejected_orders, then name the reason in one sentence, quoting it exactly as the tool returned it.') // ▶
//   Why: the instruction is how the agent works. The model decides when to call a tool by reading this and the tool's
//   description — a clear step makes it look before it answers.

const { model, label } = await modelFor(process.argv)
const agent = new LlmAgent({ name: 'order_agent', model, instruction: steps.join('\n'), tools })

const question = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ') || 'Why do orders fail?'
const sessions = new InMemorySessionService()
const session = await sessions.createSession({ appName: 'porto-shop', userId: 'you' })
const runner = new Runner({ agent, appName: 'porto-shop', sessionService: sessions })
const run = { question, model: label, tools: tools.map((t) => t.name), calls: [], answer: '', events: 0 }

console.log(`asking ${label}: ${question}\n`)
const newMessage = { role: 'user', parts: [{ text: question }] }
// for await (const event of runner.runAsync({ userId: 'you', sessionId: session.id, newMessage })) printEvent(event, run) // ▶
//   Why: this is the loop. Each event is one step: the model asking for a tool, the result going back, the answer.
//   ADK runs it until the model answers instead of asking.
if (run.events === 0) console.log('nothing ran yet — uncomment the ▶ line with runner.runAsync')
else if (run.error && !run.answer) console.log('the loop ran, the model failed — the error is above (not logged in to the CLI? a wrong GEMINI_MODEL?)')

keepRun(run)
