// Mission 13 · Build your own droid: the observer's AI agents are an orchestrator and three specialists (latency,
// errors, traffic). This file describes a specialist of your own; one with a built-in's name replaces it. The observer
// reads this file while it runs. Uncomment the ▶ lines (Cmd+/). Plain data — nothing to import.
type Specialist = { name: string; description: string; instruction: string; tools: string[] }

// What the droid may use. It can call nothing else — a droid is only as good as the tools you give it.
const tools: string[] = ['get_operation_stats', 'compare_versions']
// tools.push('search_traces', 'get_trace') // ▶
//   Why: without them the droid sees numbers per operation, never the inside of one request — so it can say "checkout
//   got slower in v2", but not which function the time goes to.

// How it works, step by step. The observer adds "facts from tools only" to every instruction.
const steps = [
  'You investigate slowness.',
  '1. Call get_operation_stats to see which operations exist and which are slow — use their exact names from then on.',
  '2. Call compare_versions. A p95 ratio of 2 or more between versions is a regression: name the operation, both versions and the ratio.',
  // '3. Open one slow trace of that operation (search_traces with its exact name, then get_trace) and name the span with the highest selfMs and its code file.', // ▶
  //   Why: the request is not the answer — the function inside it is (remember mission 10). selfMs is the time a span
  //   spends itself, not in its children: the bottom step of the long bars.
]

const latencyAgent: Specialist = {
  name: 'latency_agent',
  description: 'Finds slow operations, the deployment that made them slow, and the function where the time goes',
  instruction: steps.join('\n'),
  tools,
}

const specialists: Specialist[] = []
// specialists.push(latencyAgent) // ▶
//   Why: until it is in this list the observer does not know it. Its name is the built-in latency_agent's, so yours
//   replaces it — the orchestrator sends every question about slowness to your droid now.

export default specialists
