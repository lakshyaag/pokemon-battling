import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Header from '../components/Header'

import ConvexProvider from '../integrations/convex/provider.tsx'

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <ConvexProvider>
        <Header />
        <Outlet />
        <TanStackRouterDevtools />
        <TanStackQueryLayout />
      </ConvexProvider>
    </>
  ),
})
