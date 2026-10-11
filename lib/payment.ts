'use observe'

import { jitter } from './sleep'

// Charges the card through the (simulated) payment provider. SHOP_VERSION is the deployed build, set by
// `npm run dev:v1` / `npm run dev:v2` / `npm run dev:v3`. v2 made the charge slow; v3 fixed that.
const VERSION = process.env.SHOP_VERSION ?? 'v2'

export async function chargePayment(amountCents: number): Promise<{ transactionId: string; amountCents: number }> {
  if (VERSION === 'v2') await jitter(1400, 2500)
  else await jitter(150, 300)
  return { transactionId: crypto.randomUUID(), amountCents }
}
