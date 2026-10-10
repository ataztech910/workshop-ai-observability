'use client'

import { useEffect, useState } from 'react'
import type { Review } from '@/data/reviews'

// Loaded in the browser (from /api/reviews), so the page itself does not wait for them.
export function Reviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null)

  useEffect(() => {
    fetch(`/api/reviews/${productId}`)
      .then((res) => res.json())
      .then(setReviews)
  }, [productId])

  if (!reviews) return <p className="muted">Loading reviews…</p>
  return (
    <ul className="reviews">
      {reviews.map((r) => (
        <li key={r.author}>
          “{r.text}” — {r.author}
        </li>
      ))}
    </ul>
  )
}
