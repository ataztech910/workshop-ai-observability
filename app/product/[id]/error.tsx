'use client'

export default function ProductError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main>
      <h1>Something went wrong</h1>
      <button onClick={() => retry()}>Try again</button>
    </main>
  )
}
