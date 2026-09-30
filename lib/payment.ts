'use observe'

import { jitter } from './sleep'

// BUG 1 — slow payment, introduced in v2: the provider call is now retried "for resilience",
// without a timeout, so every checkout waits for up to 2.5 s. v1 did a single call.
const VERSION = process.env.SHOP_VERSION ?? 'v2'

export async function chargePayment(amountCents: number): Promise<{ transactionId: string; amountCents: number }> {
  if (VERSION === 'v1') await jitter(150, 300)
  else await jitter(1400, 2500)
  return { transactionId: crypto.randomUUID(), amountCents }
}
