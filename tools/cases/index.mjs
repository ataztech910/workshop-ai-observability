// npm run case <name> [args] — the case scripts over your raw spans. Each one is a short file in this folder: read it
// first. checkout-400 is the one you finish yourself (tools/cases/rejected.mjs); the others are there to explore.
import { readdirSync } from 'node:fs'

const HELPERS = ['index.mjs', 'spans.mjs', 'rejected.mjs']
const cases = readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.mjs') && !HELPERS.includes(f)).map((f) => f.slice(0, -4))
const name = process.argv[2]
if (!cases.includes(name)) {
  console.log(`usage: npm run case <name>\n\n  ${cases.join('\n  ')}`)
  process.exit(name ? 1 : 0)
}
process.argv.splice(2, 1) // the case sees its own arguments as process.argv[2…]
await import(`./${name}.mjs`)
