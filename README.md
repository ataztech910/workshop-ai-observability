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

```bash
npm install       # the app
npm run doctor    # downloads the observer and everything the blocks add, checks the rest, says how to fix what is missing
```

Do this before the workshop — conference Wi-Fi is slow. After `npm run doctor` says "All set", the whole workshop
works without a network: the observer, `npm install next-observe` in block 3, and catching up to any block.

## Workshop blocks

You start with a plain Next.js app — no telemetry at all. First you take telemetry apart piece by piece, by hand; the
observer comes last, as the tool that does all of it for you and lets AI agents work on it.

| Block | You do | Fell behind? |
|---|---|---|
| 0 — Prologue | use the shop and count the bugs you notice | — |
| 2 — OTLP by hand | `npm run receiver` (your own OTLP receiver on port 4318), send `tools/span.json` with `curl`, finish `tools/print-spans.mjs` | `npm run receiver -- --solution` |
| 3 — Instrumentation | `npm install next-observe` and three files: `instrumentation.ts`, `instrumentation-client.ts`, `withObserve()` in `next.config.ts`; a span of your own in checkout; `'use observe'` in `lib/` | `git stash -u && git checkout -B workshop block-3-instrumentation && npm install` |
| 4 — Cases | find six bugs in the raw spans: `npm run case <name>` (run it without a name for the list) | nothing to catch up — the scripts are in `tools/cases/` |
| 5 — The observer | stop the receiver, `npm run observer`; scheduled checks in `observe.checks.ts`, your own AI agent in `observe.agents.ts` | `git stash -u && git checkout -B workshop block-5-observer && npm install` |

`git stash -u` keeps your own changes (`git stash pop` brings them back); `git checkout -B workshop <tag>` puts the
block's state on your own branch `workshop`; `npm install` because a block may add a dependency. Back to the very
start: `git checkout -B workshop block-0-start`.

```bash
# block 2: send a span by hand
curl -X POST localhost:4318/v1/traces -H 'content-type: application/json' -d @tools/span.json
```

## Two "deployments" (blocks 4 and 5)

Keep the receiver (block 4) or the observer (block 5) running on its own, so switching versions keeps the telemetry
history — like a real deploy.

```bash
# terminal 1 — block 4: your receiver
npm run receiver
# terminal 1 — block 5: the observer instead (add OBSERVE_AI=real for a real model; default is a mock model)
npm run observer

# terminal 2 — the shop as version v1
npm run dev:v1

# terminal 3 — traffic
npm run load 40
```

Then "deploy" v2: stop terminal 2 (Ctrl+C), run `npm run dev:v2`, and `npm run load 40` again. In block 4,
`npm run case regression` compares the versions.

In block 5, open http://127.0.0.1:4318/chat and ask, for example:

- *Checkout is slow. What's causing it and which deployment introduced it?*
- *There are 500 errors on product pages. Which operation is failing and why?*
- *The product catalog is slower than expected but no single span stands out. What is wrong?*

Leave the chat open while traffic runs: when the observer detects an anomaly, the AI agents start investigating without
being asked.

From block 5 the observer also asks the shop itself, every 10 seconds, whether five things are still true
(`observe.checks.ts`) — see http://127.0.0.1:4318/checks. Run the shop as v1, then as v2, and watch
"checkout takes under a second": it fails without any traffic, and the AI agents are sent to look.

## Configuration

| Variable | Default | |
|---|---|---|
| `OBSERVE_AI` | `mock` | `real` = Gemini (with `GEMINI_API_KEY` + `GEMINI_MODEL`) or Kitana |
| `OBSERVE_DETECTOR` | on | `off` disables the anomaly detector |
| `BASE_URL` | `http://localhost:3000` | where `npm run load` sends traffic — set it if the shop runs on another port |
| `RPS` | `3` | requests per second for `npm run load` |
