// The server half of the APM agent. Next.js looks for this file by name and calls register() once, when the
// server starts. Uncomment the ▶ line (Cmd+/ or Ctrl+/), after `npm install next-observe`.

// export { register } from 'next-observe/server' // ▶
//   Why: register() starts OpenTelemetry inside the server. From then on every request the shop answers, every
//   fetch it makes and every page it renders becomes a span — sent as OTLP/JSON to 127.0.0.1:4318, your receiver.
//   The same JSON you wrote by hand in span.json, only nobody types it.

export {}
