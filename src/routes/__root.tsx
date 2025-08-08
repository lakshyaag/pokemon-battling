import { Outlet, createRootRoute } from '@tanstack/react-router'

import Header from '../components/Header'

import ConvexProvider from '../integrations/convex/provider.tsx'

export const Route = createRootRoute({
  component: () => (
    <>
      <ConvexProvider>
        <Header />
        <Outlet />
      </ConvexProvider>
    </>
  ),
})
