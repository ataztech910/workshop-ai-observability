'use client'

import { useState } from 'react'
import { SPECS } from '@/data/specs'

// Material and weight, shown on request.
export function Details({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <button className="btn btn-outline" onClick={() => setOpen(true)}>
        Show details
      </button>
    )
  const specs = SPECS[productId]
  return (
    <p className="muted">
      {specs.material}, {specs.weightGrams} g
    </p>
  )
}
