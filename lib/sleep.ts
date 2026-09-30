export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A random delay between min and max ms — real services are never perfectly steady. */
export const jitter = (min: number, max: number) => sleep(min + Math.random() * (max - min))
