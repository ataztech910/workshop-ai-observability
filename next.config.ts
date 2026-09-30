import type { NextConfig } from 'next'
import { withObserve } from 'next-observe/config'

const nextConfig: NextConfig = {}

export default withObserve(nextConfig)
