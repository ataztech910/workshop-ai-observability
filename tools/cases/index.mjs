// npm run case <name> [args] — the block 4 case scripts. Each one is a short file in this folder: read it first.
import { readdirSync } from 'node:fs'

const cases = readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.mjs') && !['index.mjs', 'spans.mjs'].includes(f)).map((f) => f.slice(0, -4))
const name = process.argv[2]
if (!cases.includes(name)) {
  console.log(`usage: npm run case <name>\n\n  ${cases.join('\n  ')}`)
  process.exit(name ? 1 : 0)
}
process.argv.splice(2, 1) // the case sees its own arguments as process.argv[2…]
await import(`./${name}.mjs`)
