/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { PublicHeader } from '../public-header'

const initialConfig = useSystemConfigStore.getState()
const initialAuth = useAuthStore.getState()
let queryClient: QueryClient

afterEach(() => {
  queryClient?.clear()
  useSystemConfigStore.setState(initialConfig)
  useAuthStore.setState(initialAuth)
  localStorage.clear()
  vi.restoreAllMocks()
})

it('keeps the floating header size and top position when scrolling down and back to the top', async () => {
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)
  useAuthStore.getState().auth.setUser(null)
  useSystemConfigStore.getState().setLoading(false)
  queryClient = new QueryClient()
  queryClient.setQueryData(['status'], {
    HeaderNavModules: { home: true, console: false, docs: false, about: false },
  })
  queryClient.setQueryData(['notice'], { success: true, data: '' })
  const route = createRootRoute({
    component: () => (
      <PublicHeader
        showThemeSwitch={false}
        showLanguageSwitcher={false}
        showNotifications={false}
        showAuthButtons={false}
      />
    ),
  })
  const router = createRouter({
    routeTree: route,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )

  const header = await screen.findByRole('banner')
  const nav = within(header).getByRole('navigation')
  const container = nav.parentElement

  for (const scrollY of [0, 300, 0]) {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(scrollY)
    act(() => {
      fireEvent.scroll(window)
    })
    expect(header).toHaveClass('fixed', 'inset-x-0', 'top-0')
    expect(container).toHaveClass('max-w-[52rem]', 'px-3', 'pt-3')
    expect(nav).toHaveClass('h-12', 'rounded-2xl', 'backdrop-blur-2xl')
  }
})
