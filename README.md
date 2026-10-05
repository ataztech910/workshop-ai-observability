# Porto Shop — AI-Native Observability workshop app

A small Next.js 16 shop with problems. In the workshop you connect it to OpenTelemetry with
[next-observe](https://www.npmjs.com/package/next-observe) and let the telemetry and AI agents find them. The observer —
[next-observer](https://www.npmjs.com/package/next-observer), with a trace UI and agents that investigate on request or
on their own — runs through `npx` and is never a dependency of the app.

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
works without a network: the observer, `npx next-observer init` in block 2, and catching up to any block.

## Workshop blocks

You start with a plain Next.js app — no telemetry at all.

| Block | You do | Fell behind? |
|---|---|---|
| 2 — Connect | `npx next-observer init`, then `npm run observe` → traces from the server and the browser | `git stash -u && git checkout -B workshop block-2-init && npm install` |
| 3 — Instrumentation | `'use observe'` in `lib/`, a span of your own | `git stash -u && git checkout -B workshop block-3-instrumentation && npm install` |
| 4 — AI agents | your own agent in `observe.agents.ts` | `git stash -u && git checkout -B workshop block-4-agents && npm install` |

`git stash -u` keeps your own changes (`git stash pop` brings them back); `git checkout -B workshop <tag>` puts the
block's state on your own branch `workshop`; `npm install` because a block may add a dependency. Back to the very
start: `git checkout -B workshop block-2-start`.

## Two "deployments" (from block 2 on)

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
