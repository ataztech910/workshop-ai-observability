import { jitter } from './sleep'

// Charges the card through the (simulated) payment provider. SHOP_VERSION is the deployed build, set by
// `npm run dev:v1` / `npm run dev:v2`.
const VERSION = process.env.SHOP_VERSION ?? 'v2'

export async function chargePayment(amountCents: number): Promise<{ transactionId: string; amountCents: number }> {
  if (VERSION === 'v1') await jitter(150, 300)
  else await jitter(1400, 2500)
  return { transactionId: crypto.randomUUID(), amountCents }
}
