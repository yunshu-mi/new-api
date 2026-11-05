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
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
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

import { useOverviewSummary } from '@/features/dashboard/hooks/use-overview-summary'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { api } from '@/lib/api'
import { formatQuota } from '@/lib/format'
import { ROLE } from '@/lib/roles'
import { STATUS_STORAGE_KEY } from '@/lib/status-query'
import { toStartOfDay } from '@/lib/time'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { OverviewDashboard } from '../overview-dashboard'

let client: QueryClient
let statusPayload: Record<string, unknown>
let usagePayload: QuotaDataItem[]
let keyCount: number
let rates: { rpm: number; tpm: number }
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
  usagePayload = []
  keyCount = 0
  rates = { rpm: 0, tpm: 0 }
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url.startsWith('/api/log/self/stat?')) {
      return { data: { success: true, data: { quota: 0, ...rates } } }
    }
    switch (url) {
      case '/api/status':
        return { data: { data: statusPayload } }
      case '/api/data/self':
        return { data: { success: true, data: usagePayload } }
      case '/api/token/?p=1&size=1':
        return { data: { success: true, data: { items: [], total: keyCount } } }
      case '/api/user/self':
        return {
          data: { success: true, data: useAuthStore.getState().auth.user },
        }
      case '/api/uptime/status':
        return { data: { success: true, data: [] } }
      default:
        throw new Error(`Unexpected dashboard request: ${url}`)
    }
  })
})

afterEach(async () => {
  cleanup()
  client.clear()
  vi.useRealTimers()
  await i18next.changeLanguage('en')
  i18next.removeResourceBundle('fr', 'translation')
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
  it('shows the statistics without a duplicate heading, description or wallet shortcut', async () => {
    await renderOverview()

    const summary = await screen.findByRole('region', {
      name: 'Usage at a glance',
    })
    expect(
      within(summary).getByRole('list', { name: 'Usage at a glance' })
    ).toBeVisible()
    expect(
      within(summary).queryByRole('heading', { name: 'Usage at a glance' })
    ).not.toBeInTheDocument()
    expect(
      within(summary).queryByText('Monitor balance, usage, and request volume')
    ).not.toBeInTheDocument()
    expect(
      within(summary).queryByRole('button', { name: 'Wallet' })
    ).not.toBeInTheDocument()
    expect(
      within(summary).queryByRole('link', { name: 'Wallet' })
    ).not.toBeInTheDocument()
  })

  it('starts a new daily range at midnight even when background requests return unchanged data', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 6, 23, 59, 59))
    const start = toStartOfDay(Math.floor(Date.now() / 1000))
    usagePayload = [{ created_at: start, count: 3 }]
    const hook = renderHook(() => useOverviewSummary(), {
      wrapper: (props) => (
        <QueryClientProvider client={client}>
          {props.children}
        </QueryClientProvider>
      ),
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(hook.result.current.totals.totalCount).toBe(3)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    const nextStart = toStartOfDay(Math.floor(Date.now() / 1000))
    expect(nextStart).toBeGreaterThan(start)
    const dailyCalls = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => url === '/api/data/self')
    expect(dailyCalls.at(-1)?.[1]?.params).toMatchObject({
      start_timestamp: nextStart,
    })
    expect(hook.result.current.totals.totalCount).toBe(0)
    hook.unmount()
  })

  it('updates labels and number formatting on language changes while allowing long labels to wrap', async () => {
    keyCount = 12345
    await renderOverview()
    const card = await screen.findByRole('listitem', { name: 'API Keys' })
    await waitFor(() => expect(within(card).getByText('12,345')).toBeVisible())
    const label = 'Nombre total de clés API disponibles pour ce compte'
    i18next.addResourceBundle('fr', 'translation', { 'API Keys': label })

    await act(async () => {
      await i18next.changeLanguage('fr')
    })
    const translatedCard = screen.getByRole('listitem', { name: label })
    expect(within(translatedCard).getByText(label)).toHaveClass('break-words')
    expect(
      within(translatedCard).getByText(
        new Intl.NumberFormat('fr').format(keyCount),
        { normalizer: (value) => value }
      )
    ).toBeVisible()
  })

  it('shows an unavailable balance when the account request fails instead of displaying the login snapshot', async () => {
    const original = vi.mocked(api.get).getMockImplementation()
    if (!original) throw new Error('Missing API fixture')
    vi.mocked(api.get).mockImplementation((...args) => {
      if (args[0] === '/api/user/self') {
        return Promise.reject(new Error('Connection lost'))
      }
      return original(...args)
    })
    await renderOverview()

    await screen.findByRole('button', { name: 'Retry' })
    const card = screen.getByRole('listitem', { name: 'Account balance' })
    expect(within(card).getByText('—')).toBeVisible()
    expect(
      within(card).queryByText(formatQuota(1000000))
    ).not.toBeInTheDocument()
  })

  it('shows eight account metrics in a responsive grid with zero values for empty statistics', async () => {
    await renderOverview()

    const grid = await screen.findByRole('list', { name: 'Usage at a glance' })
    expect(grid).toHaveClass(
      'grid-cols-1',
      'min-[480px]:grid-cols-2',
      'xl:grid-cols-4',
      'gap-4'
    )
    const cards = within(grid).getAllByRole('listitem')
    expect(cards).toHaveLength(8)
    await waitFor(() => expect(within(grid).getByText('0 RPM')).toBeVisible())
    for (const name of ['API Keys', 'Today’s requests', 'Today’s tokens']) {
      expect(
        within(screen.getByRole('listitem', { name })).getByText('0', {
          exact: true,
        })
      ).toBeVisible()
    }
    for (const card of cards) {
      expect(card).toHaveClass('min-w-0', 'rounded-2xl', 'border', 'shadow-xs')
      expect(card.querySelector('[aria-busy]')).toHaveClass('min-h-[118px]')
      expect(card.querySelector('.tabular-nums')).toHaveClass(
        'font-mono',
        'font-bold',
        'text-base',
        'sm:text-2xl'
      )
    }
    expect(screen.queryByText('Average latency')).not.toBeInTheDocument()
  })

  it('binds daily aggregates, lifetime totals and live rates to their own data sources', async () => {
    const start = toStartOfDay(Math.floor(Date.now() / 1000))
    usagePayload = [
      { created_at: start - 3600, count: 99, quota: 999999, token_used: 88888 },
      {
        created_at: start,
        count: 4,
        quota: 50000,
        token_used: 1200,
        cache_read_tokens: 200,
        cache_creation_tokens: 30,
      },
      {
        created_at: start,
        count: 6,
        quota: 25000,
        token_used: 800,
        cache_read_tokens: 100,
        cache_creation_tokens: 20,
      },
      {
        created_at: start + 86400,
        count: 77,
        quota: 999999,
        token_used: 88888,
      },
    ]
    keyCount = 137
    rates = { rpm: 12, tpm: 3456 }
    await renderOverview()

    await waitFor(() =>
      expect(
        screen.getByRole('listitem', { name: 'Today’s requests' })
      ).toHaveTextContent('10')
    )
    for (const [name, value] of [
      ['Account balance', formatQuota(1000000)],
      ['API Keys', '137'],
      ['Today’s consumption', formatQuota(75000)],
      ['Total consumed', formatQuota(1000)],
      ['Total requests made', '1'],
    ]) {
      expect(
        within(screen.getByRole('listitem', { name })).getByText(value, {
          exact: true,
        })
      ).toBeVisible()
    }
    expect(
      screen.getByRole('listitem', { name: 'Today’s tokens' })
    ).toHaveTextContent('2,000')
    expect(
      screen.getByRole('listitem', { name: 'Today’s tokens' })
    ).toHaveTextContent('Cache Read: 300 · Cache Write: 50')
    expect(
      screen.getByRole('listitem', { name: 'Request performance' })
    ).toHaveTextContent('12 RPM')
    expect(
      screen.getByRole('listitem', { name: 'Request performance' })
    ).toHaveTextContent('3,456 TPM · Last 60 seconds')
    const dailyCall = vi
      .mocked(api.get)
      .mock.calls.find(([url]) => url === '/api/data/self')
    expect(dailyCall?.[1]?.params).toMatchObject({
      start_timestamp: start,
      default_time: 'hour',
    })
    expect(dailyCall?.[1]?.params).toHaveProperty(
      'end_timestamp',
      expect.any(Number)
    )
  })

  it('keeps pending statistics in loading state instead of showing a fabricated zero', async () => {
    const original = vi.mocked(api.get).getMockImplementation()
    if (!original) throw new Error('Missing API fixture')
    vi.mocked(api.get).mockImplementation((...args) => {
      if (args[0] === '/api/data/self') return new Promise(() => {})
      return original(...args)
    })
    await renderOverview()

    const card = await screen.findByRole('listitem', {
      name: 'Today’s requests',
    })
    expect(card.querySelector('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true'
    )
    expect(
      within(card).queryByText('0', { exact: true })
    ).not.toBeInTheDocument()
  })

  it('shows unavailable daily statistics after a business failure and retries successfully', async () => {
    const original = vi.mocked(api.get).getMockImplementation()
    if (!original) throw new Error('Missing API fixture')
    let fail = true
    vi.mocked(api.get).mockImplementation((...args) => {
      if (args[0] === '/api/data/self' && fail) {
        return Promise.resolve({
          data: { success: false, message: 'Statistics unavailable' },
        })
      }
      return original(...args)
    })
    await renderOverview()

    const retry = await screen.findByRole('button', { name: 'Retry' })
    const card = screen.getByRole('listitem', { name: 'Today’s requests' })
    expect(within(card).getByText('—')).toBeVisible()
    expect(
      within(card).queryByText('0', { exact: true })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('listitem', { name: 'Account balance' })
    ).not.toHaveTextContent('Failed to load')
    fail = false
    await userEvent.click(retry)
    await waitFor(() =>
      expect(within(card).getByText('0', { exact: true })).toBeVisible()
    )
    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument()
  })

  it('renders usage cards without the setup guide and recommended actions', async () => {
    await renderOverview()

    expect(
      await screen.findByRole('list', { name: 'Usage at a glance' })
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
      await screen.findByRole('list', { name: 'Usage at a glance' })
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
