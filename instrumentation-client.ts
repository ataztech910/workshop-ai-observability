// The browser half of the APM agent. Next.js loads this file by name in every page, before the app.
// Uncomment the ▶ line (Cmd+/ or Ctrl+/), after `npm install next-observe`.

// import 'next-observe/client' // ▶
//   Why: half of the shop's bugs never reach the server — a click that throws, a page stuck on "Loading…". This
//   starts OpenTelemetry in the visitor's browser: page loads, fetches and uncaught errors become spans too.

export {}
