'use client'

import { useEffect, useState } from 'react'
import type { Review } from '@/data/reviews'

// Loaded in the browser (from /api/reviews), so the page itself does not wait for them.
export function Reviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null)

  useEffect(() => {
    fetch(`/api/reviews/${productId}`)
      .then((res) => {
        // Mission 11 · the fix: uncomment the ▶ line (Cmd+/).
        // if (res.status === 204) return [] // ▶
        //   Why: 204 means "no content" — product 2 has no reviews, so there is no body to read. res.json() on an empty
        //   body throws, and the page waits for ever on "Loading reviews…". No content = no reviews.
        return res.json()
      })
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
