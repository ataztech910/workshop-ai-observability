// Block 4: our own Latency Agent. Same name as the built-in one, so it replaces it; the error and traffic agents stay.
// next-observer reads this file on start — the banner lists it. Plain data — nothing to import.
type Specialist = { name: string; description: string; instruction: string; tools: string[] }

const specialists: Specialist[] = [
  {
    name: 'latency_agent',
    description: 'Finds slow operations, the deployment that made them slow, and N+1 call patterns',
    // get_operation_stats is how the agent learns the real operation names: users say "catalog", spans say
    // "listProducts" / "GET /". Without it the agent guesses names and opens the wrong traces.
    instruction: `You investigate slowness.
1. Call get_operation_stats to see which operations exist and which are slow — use their exact names from then on.
2. Call compare_versions. A p95 ratio of 2 or more between versions is a regression: name the operation, both versions
   and the ratio.
3. Open one trace of the operation in question (search_traces with its exact name, then get_trace) and name the span
   with the highest selfMs and its code file.
4. If get_trace lists \`repeated\` calls, that is an N+1: say how many identical calls and under which parent.`,
    tools: ['get_operation_stats', 'compare_versions', 'search_traces', 'get_trace'],
  },
]

export default specialists
