import { SpanStatusCode, trace } from '@opentelemetry/api'
import { getProductById } from '@/lib/db'
import { chargePayment } from '@/lib/payment'

// A span of our own around the whole order, with the business facts as attributes: the waterfall shows what the order
// was, not just which functions ran — and why an order was turned down, which the HTTP 400 alone does not say.
const tracer = trace.getTracer('porto-shop')

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { productId?: unknown; quantity?: unknown } | null
  const quantity = body?.quantity ?? 1
  return tracer.startActiveSpan('placeOrder', async (span) => {
    try {
      span.setAttribute('order.quantity', String(quantity))
      if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 10) {
        span.setAttribute('order.rejected', (quantity as number) > 10 ? `quantity ${quantity} > limit 10` : `quantity ${quantity} is not 1–10`)
        return Response.json({ error: 'quantity must be an integer from 1 to 10' }, { status: 400 })
      }
      const product = typeof body?.productId === 'string' ? await getProductById(body.productId) : undefined
      if (!product) return Response.json({ error: 'unknown product' }, { status: 400 })
      const totalCents = product.priceCents * (quantity as number)
      span.setAttributes({ 'product.id': product.id, 'order.total_cents': totalCents })
      const payment = await chargePayment(totalCents)
      return Response.json({ ok: true, ...payment })
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw error
    } finally {
      span.end()
    }
  })
}
