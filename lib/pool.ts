// The "connection" to the fake database. Queries are written to it one after another without waiting for the
// previous answer (pipelining), and each answer is given to the oldest query still waiting — the way a real driver
// does it. That is correct as long as answers come back in the order the queries were sent.
//
// As v3 the shop talks to the database through a pooler in transaction mode: every query may run on a different
// backend, so answers come back as they finish, not in order. Under concurrency a query then gets somebody else's row.
// Nothing fails and nothing is slow — a real incident, rebuilt here in thirty lines.
import { PRODUCTS, type Product } from '@/data/products'
import { jitter } from './sleep'

const TRANSACTION_POOLER = process.env.SHOP_VERSION === 'v3'

const waiting: ((row: Product | undefined) => void)[] = []
let lastAnswer: Promise<unknown> = Promise.resolve()

export function queryProduct(id: string): Promise<Product | undefined> {
  return new Promise((resolve) => {
    waiting.push(resolve)
    const run = jitter(15, 21).then(() => PRODUCTS.find((p) => p.id === id))
    // A direct connection answers in order: this answer is delivered only after the one before it.
    const answer = TRANSACTION_POOLER ? run : Promise.all([run, lastAnswer]).then(([row]) => row)
    lastAnswer = answer
    void answer.then((row) => waiting.shift()?.(row))
  })
}
