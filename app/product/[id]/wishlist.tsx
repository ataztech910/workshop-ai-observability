'use client'

import { useState } from 'react'

// Remembers the product in the browser, for the next visit.
export function Wishlist({ productId }: { productId: string }) {
  const [saved, setSaved] = useState(false)

  function save() {
    let list = JSON.parse(localStorage.getItem('wishlist') as string) as string[]
    // Mission 11 · the fix: uncomment the ▶ line (Cmd+/).
    // list ??= [] // ▶
    //   Why: on the first visit nothing is saved yet — getItem returns null, JSON.parse(null) is null, and null.push
    //   throws: "Cannot read properties of null (reading 'push')" in Errors. Start from an empty list instead.
    list.push(productId)
    localStorage.setItem('wishlist', JSON.stringify(list))
    setSaved(true)
  }

  return (
    <button className="btn btn-outline" onClick={save}>
      {saved ? '♥ Saved' : '♡ Save for later'}
    </button>
  )
}
