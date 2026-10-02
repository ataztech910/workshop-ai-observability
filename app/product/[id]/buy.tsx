'use client'

import { useEffect, useState } from 'react'

// Shows the stock (from /api/inventory) and buys through /api/checkout.
export function Buy({ productId }: { productId: string }) {
  const [stock, setStock] = useState<string>('checking stock…')
  const [result, setResult] = useState<string>('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/inventory/${productId}`)
      .then(async (res) => setStock(res.ok ? `${(await res.json()).inStock} in stock` : 'stock unavailable'))
      .catch(() => setStock('stock unavailable'))
  }, [productId])

  async function buy() {
    setBusy(true)
    const started = performance.now()
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId }) })
    setResult(res.ok ? `Paid in ${Math.round(performance.now() - started)} ms` : 'Payment failed')
    setBusy(false)
  }

  return (
    <div className="buy">
      <p>{stock}</p>
      <button onClick={buy} disabled={busy}>
        {busy ? 'Paying…' : 'Buy'}
      </button>
      <p>{result}</p>
    </div>
  )
}
