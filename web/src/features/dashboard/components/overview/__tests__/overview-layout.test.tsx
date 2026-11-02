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
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { OverviewDashboard } from '../overview-dashboard'

let client: QueryClient
let statusPayload: Record<string, unknown>

beforeEach(() => {
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'dashboard-user',
    role: ROLE.USER,
    quota: 1000000,
    used_quota: 1000,
    request_count: 1,
  })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  statusPayload = {
    api_info_enabled: false,
    announcements_enabled: false,
    faq_enabled: false,
    uptime_kuma_enabled: false,
  }
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    switch (url) {
      case '/api/status':
        return { data: { data: statusPayload } }
      case '/api/data/self':
        return { data: { success: true, data: [] } }
      default:
        throw new Error(`Unexpected dashboard request: ${url}`)
    }
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
})

async function renderOverview() {
  const router = createRouter({
    routeTree: createRootRoute({ component: OverviewDashboard }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('overview dashboard layout', () => {
  it('renders usage cards without the setup guide and recommended actions', async () => {
    await renderOverview()

    expect(
      await screen.findByRole('heading', { name: 'Usage at a glance' })
    ).toBeVisible()
    expect(screen.queryByText('Setup guide')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Build on your API gateway in minutes')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Recommended actions')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Keep the platform ready')
    ).not.toBeInTheDocument()
    for (const name of ['API Keys', 'Channels', 'Usage Logs', 'Pricing']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('still renders enabled content panels next to the usage cards', async () => {
    statusPayload = { ...statusPayload, announcements_enabled: true }
    await renderOverview()

    expect(
      await screen.findByRole('heading', { name: 'Usage at a glance' })
    ).toBeVisible()
    expect(await screen.findByText('Announcements')).toBeVisible()
    expect(screen.queryByText('Setup guide')).not.toBeInTheDocument()
  })
})
