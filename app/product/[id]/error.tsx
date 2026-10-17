'use client'

export default function ProductError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="oops">
      <div aria-hidden className="planet" />
      <h1>Something went wrong</h1>
      <p>A small asteroid bumped into our shelves. Nothing is broken — let&apos;s have another go.</p>
      <button className="btn btn-primary" onClick={() => retry()}>
        Try again
      </button>
    </main>
  )
}
