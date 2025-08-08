import { ConvexProvider, ConvexReactClient } from 'convex/react'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL
if (!CONVEX_URL) {
  console.error('missing envar VITE_CONVEX_URL')
}
const convexClient = new ConvexReactClient(CONVEX_URL || '')

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>
}
