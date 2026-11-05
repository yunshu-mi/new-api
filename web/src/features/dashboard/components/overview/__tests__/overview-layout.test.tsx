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
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { STATUS_STORAGE_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { OverviewDashboard } from '../overview-dashboard'

let client: QueryClient
let statusPayload: Record<string, unknown>
const getAnimationsDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'getAnimations'
)

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
})

afterAll(() => {
  if (getAnimationsDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      'getAnimations',
      getAnimationsDescriptor
    )
    return
  }
  Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
})

beforeEach(() => {
  window.localStorage.removeItem(STATUS_STORAGE_KEY)
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
      case '/api/uptime/status':
        return { data: { success: true, data: [] } }
      default:
        throw new Error(`Unexpected dashboard request: ${url}`)
    }
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  window.localStorage.removeItem(STATUS_STORAGE_KEY)
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

  it('shows announcements but omits API Info even when both are enabled', async () => {
    statusPayload = {
      ...statusPayload,
      api_info_enabled: true,
      api_info: [
        {
          route: 'Primary API',
          url: 'https://api.example.com',
          description: '',
          color: 'blue',
        },
      ],
      announcements_enabled: true,
    }
    await renderOverview()

    expect(
      await screen.findByRole('heading', { name: 'Usage at a glance' })
    ).toBeVisible()
    expect(await screen.findByText('System Announcements')).toBeVisible()
    expect(screen.queryByText('API Info')).not.toBeInTheDocument()
  })

  it('stretches the three panels to their grid row height when uptime is empty', async () => {
    statusPayload = {
      ...statusPayload,
      announcements_enabled: true,
      announcements: [{ id: 1, content: 'Service update' }],
      faq_enabled: true,
      faq: [
        { id: 1, question: 'How do I get started?', answer: 'Create a key.' },
      ],
      uptime_kuma_enabled: true,
    }
    await renderOverview()

    const panels = await Promise.all([
      screen.findByRole('button', { name: /Service update/ }),
      screen.findByRole('button', { name: 'How do I get started?' }),
      screen.findByText('No monitoring data'),
    ])

    for (const content of panels) {
      expect(content.closest('.bg-card')).toHaveClass('h-full')
    }
    expect(screen.getByText('Service availability')).toBeVisible()
    expect(
      screen.getByText(
        'Please contact an administrator to configure Uptime in system settings'
      )
    ).toBeVisible()
    expect(
      screen.getByText('Grouped monitor status from Uptime Kuma')
    ).toBeVisible()
  })

  it.each([false, true])(
    'shows all five announcement types in the header when announcements are present=%s',
    async (hasAnnouncements) => {
      statusPayload = {
        ...statusPayload,
        announcements_enabled: true,
        announcements: hasAnnouncements
          ? [{ id: 1, content: 'Service update', type: 'success' }]
          : [],
      }
      await renderOverview()

      const legend = await screen.findByRole('list', { name: 'Type' })
      expect(within(legend).getAllByRole('listitem')).toHaveLength(5)
      for (const [label, color] of [
        ['Default', 'bg-[#8b9aa7]'],
        ['In Progress', 'bg-[#3b82f6]'],
        ['Success', 'bg-[#10b981]'],
        ['Warning', 'bg-[#f59e0b]'],
        ['Incident', 'bg-[#ef4444]'],
      ]) {
        const badge = within(legend).getByTitle(label)
        expect(badge).toHaveTextContent(label)
        expect(badge.querySelector('[aria-hidden=true]')).toHaveClass(color)
      }
      expect(legend.closest('.border-b')).toHaveTextContent(
        'System Announcements'
      )
      expect(legend.closest('.border-b')).toHaveClass('items-center')
    }
  )

  it('shows the announcement title and falls back to the content preview', async () => {
    statusPayload = {
      ...statusPayload,
      announcements_enabled: true,
      announcements: [
        { id: 1, content: 'Maintenance details', extra: ' Scheduled outage ' },
        { id: 2, content: 'Service update' },
        { id: 3, content: 'Another update', extra: '   ' },
      ],
    }
    await renderOverview()

    const titledAnnouncement = await screen.findByRole('button', {
      name: /Scheduled outage/,
    })
    expect(titledAnnouncement).not.toHaveTextContent('Maintenance details')
    expect(screen.getByRole('button', { name: /Service update/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /Another update/ })).toBeVisible()

    await userEvent.click(titledAnnouncement)
    const dialog = screen.getByRole('dialog', { name: 'Scheduled outage' })
    expect(within(dialog).getByText('Maintenance details')).toBeVisible()
  })

  it.each([1, 2])(
    'connects only adjacent entries when the list has %i announcements',
    async (count) => {
      const announcements = [
        { id: 1, content: 'Service update' },
        { id: 2, content: 'Scheduled maintenance' },
      ].slice(0, count)
      statusPayload = {
        ...statusPayload,
        announcements_enabled: true,
        announcements,
      }
      await renderOverview()

      for (const [index, announcement] of announcements.entries()) {
        const row = await screen.findByRole('button', {
          name: new RegExp(announcement.content),
        })
        const connector = within(row).queryByRole('separator', { hidden: true })

        if (index === count - 1) {
          expect(connector).not.toBeInTheDocument()
        } else {
          expect(connector).toHaveAttribute('aria-orientation', 'vertical')
          expect(connector).toHaveAttribute('aria-hidden', 'true')
          expect(connector).toHaveClass(
            'data-vertical:w-[0.5px]',
            'bg-muted-foreground/50',
            'start-[calc(var(--spacing)*4_-_0.25px)]',
            'sm:start-[calc(var(--spacing)*6_-_0.25px)]'
          )
        }
      }
    }
  )
})
