# Porto Shop — AI-Native Observability workshop app

A small Next.js 16 shop instrumented with [next-observe](https://www.npmjs.com/package/next-observe): traces from the
server, the browser and your own code (`'use observe'`). The observer —
[next-observer](https://www.npmjs.com/package/next-observer), with a trace UI and AI agents that investigate problems on
request or on their own — runs through `npx` and is not a dependency of the app.

The shop has problems. Your job in the workshop is to let the telemetry and the agents find them.

## Prerequisites

- Node.js 22.18+, npm and git (clone the repository — the workshop blocks are git tags)
- For real AI answers (optional — everything also runs with a mock model):
  - a Gemini API key (`GEMINI_API_KEY` + `GEMINI_MODEL`), **or**
  - the Claude Code or Codex CLI logged in — used through Kitana, no API key needed

```bash
npm install                            # the app
npx --yes next-observer@^0.2 --help    # downloads the observer once
npm run doctor                         # checks everything below and says how to fix what is missing
```

Do this before the workshop — conference Wi-Fi is slow.

## Workshop blocks

You start here: the shop already sends **server** traces to the observer. During the workshop you add the rest — your
own code with `'use observe'`, the browser, a span of your own (block 3) and your own agent (block 4).

Fell behind? Each block's result is a git tag:

| Block | Catch up with |
|---|---|
| 3 — Instrumentation | `git stash -u && git checkout block-3-instrumentation && npm install` |
| 4 — AI agents | `git stash -u && git checkout block-4-agents && npm install` |

`git stash -u` keeps your own changes (`git stash pop` brings them back); `npm install` because a block may add a
dependency.

## Quick start — everything in one terminal

```bash
npm run dev
```

- shop: http://localhost:3000 (Next picks another port if 3000 is busy — check the output)
- observer: http://127.0.0.1:4318 — traces, and **Chat** to ask the agents

## The workshop flow — two "deployments"

Keep the observer running on its own, so switching versions keeps the telemetry history — like a real deploy.

```bash
# terminal 1 — observer (add OBSERVE_AI=real for a real model; default is a mock model)
npm run observer

# terminal 2 — the shop as version v1
npm run dev:v1

# terminal 3 — traffic
npm run load 40
```

Then "deploy" v2: stop terminal 2 (Ctrl+C), run `npm run dev:v2`, and `npm run load 40` again.

Open http://127.0.0.1:4318/chat and ask, for example:

- *Checkout is slow. What's causing it and which deployment introduced it?*
- *There are 500 errors on product pages. Which operation is failing and why?*
- *The product catalog is slower than expected but no single span stands out. What is wrong?*

Leave the chat open while traffic runs: when the observer detects an anomaly, the agents start investigating without
being asked.

## Configuration

| Variable | Default | |
|---|---|---|
| `OBSERVE_AI` | `mock` | `real` = Gemini (with `GEMINI_API_KEY` + `GEMINI_MODEL`) or Kitana |
| `OBSERVE_DETECTOR` | on | `off` disables the anomaly detector |
| `BASE_URL` | `http://localhost:3000` | where `npm run load` sends traffic — set it if the shop runs on another port |
| `RPS` | `3` | requests per second for `npm run load` |

## How it is wired

- `next.config.ts` — `withObserve()`: the `'use observe'` transform and the browser → observer proxy
- `instrumentation.ts` / `instrumentation-client.ts` — server and browser telemetry
- `'use observe'` at the top of files in `lib/` — spans for your own functions
