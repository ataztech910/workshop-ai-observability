'use client'

import { useState } from 'react'

// Remembers the product in the browser, for the next visit.
export function Wishlist({ productId }: { productId: string }) {
  const [saved, setSaved] = useState(false)

  function save() {
    const list = JSON.parse(localStorage.getItem('wishlist') as string) as string[]
    list.push(productId)
    localStorage.setItem('wishlist', JSON.stringify(list))
    setSaved(true)
  }

  return <button onClick={save}>{saved ? '♥ Saved' : '♡ Save for later'}</button>
}
