# Porto Shop — AI-Native Observability workshop app

A small Next.js 16 shop with problems. In the workshop you connect it to OpenTelemetry with
[next-observe](https://www.npmjs.com/package/next-observe) — the APM agent, a library inside the app — and let the
telemetry and AI agents find them. The observer, [next-observer](https://www.npmjs.com/package/next-observer), has the
trace UI, the scheduled checks and the AI agents that investigate on request or on their own. It runs through `npx` and
is never a dependency of the app.

## Prerequisites

- Node.js 22.18+, npm and git (clone the repository — the workshop blocks are git tags)
- For real AI answers (optional — everything also runs with a mock model):
  - a Gemini API key (`GEMINI_API_KEY` + `GEMINI_MODEL`), **or**
  - the Claude Code or Codex CLI logged in — used through Kitana, no API key needed

One command — it clones the shop (when you have no clone yet), installs it, checks your machine and starts the shop:

```bash
curl -fsSL https://raw.githubusercontent.com/ataztech910/workshop-ai-observability/master/start.sh | bash
# in a clone:  ./start.sh          · the day before, without starting the shop:  ./start.sh --check
```

The same by hand (and on Windows without Git Bash):

```bash
npm install       # the app
npm run doctor    # downloads the observer and everything the blocks add, checks the rest, says how to fix what is missing
```

Do this before the workshop — conference Wi-Fi is slow. After `npm run doctor` says "All set", the whole workshop
works without a network: the observer, `npm install next-observe` in part 2, and catching up to any part.

## Workshop parts

You start with a plain Next.js app — no telemetry at all. First you take telemetry apart in small pieces, by hand; then
the observer shows all of it in seconds; then AI agents work on it.

| Part | You do | Fell behind? |
|---|---|---|
| 1 — Theory | use the shop and count the bugs you notice | — |
| 2 — OpenTelemetry by hand | seven missions, each one starts with `npm run mission N` (N = 1…7): it says what to do and ticks off what is done — your own OTLP receiver, a span by hand, a tree, the APM agent (`npm install next-observe` + three files), a span of your own, `'use observe'`, one case by script | `npm run receiver -- --solution` · `git stash -u && git checkout -B workshop block-3-instrumentation && npm install` · `npm run case checkout-400 -- --solution` |
| 3 — The observer | stop the receiver, `npm run observer` — same port, the app does not change | — |
| 4 — What arrives | two "deployments" with customers (below); find the six bugs in the observer; fix one; scheduled checks in `observe.checks.ts` | `git stash -u && git checkout -B workshop block-5-observer && npm install` |
| 5 — AI | your own AI agent in `observe.agents.ts` | same as part 4 |

`git stash -u` keeps your own changes (`git stash pop` brings them back); `git checkout -B workshop <tag>` puts the
state on your own branch `workshop`; `npm install` because a tag may add a dependency. Back to the very start:
`git checkout -B workshop block-0-start`.

```bash
# part 2: send a span by hand
curl -X POST localhost:4318/v1/traces -H 'content-type: application/json' -d @tools/span.json
```

The other case scripts (`npm run case` lists them) find the remaining bugs in the raw spans — there to explore.

## Customers and two "deployments" (part 4)

Keep the observer running on its own, so switching versions keeps the telemetry history — like a real deploy.

```bash
# terminal 1 — the observer (npm run observer:real for a real model; default is a mock model)
npm run observer

# terminal 2 — the shop as version v1
npm run dev:v1

# terminal 3 — customers in a browser (they cause the browser bugs) and server traffic
npm run users 60
npm run load 40
```

Then "deploy" v2: stop terminal 2 (Ctrl+C), run `npm run dev:v2`, and the same traffic again.

`npm run users [seconds]` drives your installed Google Chrome (nothing is downloaded): `USERS=5` for more customers at
once, `HEADED=1` to watch them. `npm run receiver` works in terminal 1 as well, for the case scripts.

In parts 4 and 5, open http://127.0.0.1:4318/chat and ask, for example:

- *Checkout is slow. What's causing it and which deployment introduced it?*
- *There are 500 errors on product pages. Which operation is failing and why?*
- *The product catalog is slower than expected but no single span stands out. What is wrong?*

Leave the chat open while traffic runs: when the observer detects an anomaly, the AI agents start investigating without
being asked.

From part 4 the observer also asks the shop itself, every 10 seconds, whether five things are still true
(`observe.checks.ts`) — see http://127.0.0.1:4318/checks. Run the shop as v1, then as v2, and watch
"checkout takes under a second": it fails without any traffic, and the AI agents are sent to look.

## Configuration

| Variable | Default | |
|---|---|---|
| `OBSERVE_AI` | `mock` | `real` = Gemini (with `GEMINI_API_KEY` + `GEMINI_MODEL`) or Kitana |
| `OBSERVE_DETECTOR` | on | `off` disables the anomaly detector |
| `BASE_URL` | `http://localhost:3000` | where `npm run load` and `npm run users` go — set it if the shop runs on another port |
| `RPS` | `3` | requests per second for `npm run load` |
| `USERS` | `3` | customers at once for `npm run users` (`HEADED=1` to watch them) |
