import { getProductById } from '@/lib/db'
import { chargePayment } from '@/lib/payment'
// Mission 5 · A span of your own: uncomment the ▶ lines (Cmd+/ or Ctrl+/), then `npm run mission 5`.
// import { trace } from '@opentelemetry/api' // ▶
//   Why: the OpenTelemetry API — the part your own code talks to. It came with next-observe, nothing to install.

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { productId?: unknown; quantity?: unknown } | null
  const quantity = body?.quantity ?? 1

  // A stand-in that does nothing, so the shop works before you uncomment the next line.
  let span: { setAttribute(key: string, value: string | number): unknown; end(): void } = { setAttribute: () => {}, end: () => {} }
  // span = trace.getTracer('porto-shop').startSpan('placeOrder') // ▶
  //   Why: the automatic spans know HTTP — "POST /api/checkout, 400". They do not know there is such a thing as an
  //   order. A span of your own names the business step; it lands inside the request's span, in the same trace.
  try {
    // span.setAttribute('order.quantity', Number(quantity)) // ▶
    //   Why: the facts of this order, as attributes — what was asked for. Later you can search and group by them.
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 10) {
      // span.setAttribute('order.rejected', `quantity ${quantity}, allowed 1–10`) // ▶
      //   Why: THE reason. The 400 says that the order failed; only your code knows why. Put it where the
      //   telemetry is, and nobody has to guess at 3 am.
      return Response.json({ error: 'quantity must be an integer from 1 to 10' }, { status: 400 })
    }
    const product = typeof body?.productId === 'string' ? await getProductById(body.productId) : undefined
    if (!product) return Response.json({ error: 'unknown product' }, { status: 400 })
    const payment = await chargePayment(product.priceCents * (quantity as number))
    return Response.json({ ok: true, ...payment })
  } finally {
    // A span is sent only when it ends — on every way out of the function, the early returns too.
    span.end()
  }
}
