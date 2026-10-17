'use client'

import { useEffect, useState } from 'react'

// Shows the stock (from /api/inventory) and buys through /api/checkout.
export function Buy({ productId }: { productId: string }) {
  const [stock, setStock] = useState<string>('checking stock…')
  const [result, setResult] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    fetch(`/api/inventory/${productId}`)
      .then(async (res) => setStock(res.ok ? `${(await res.json()).inStock} in stock` : 'stock unavailable'))
      .catch(() => setStock('stock unavailable'))
  }, [productId])

  async function buy() {
    setBusy(true)
    const started = performance.now()
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, quantity }) })
    setResult(res.ok ? `Paid in ${Math.round(performance.now() - started)} ms` : 'Payment failed')
    setBusy(false)
  }

  return (
    <section className="buy panel">
      <p className={stock.endsWith('in stock') ? 'stock-ok' : 'muted'}>{stock}</p>
      <div className="buy-row">
        <label>
          Quantity
          <select className="field" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} aria-label="Quantity">
            {[1, 2, 3, 5, 10, 20].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" onClick={buy} disabled={busy}>
          {busy ? 'Paying…' : 'Buy'}
        </button>
      </div>
      <p className={`result ${result === 'Payment failed' ? 'failed' : 'paid'}`} aria-live="polite">
        {result}
      </p>
    </section>
  )
}
