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
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { STATUS_QUERY_KEY, type StatusData } from '@/lib/status-query'

import { ApiKeyAddresses } from '../api-key-addresses'

let client: QueryClient

beforeEach(() => {
  localStorage.clear()
  client = new QueryClient({
    defaultOptions: { queries: { enabled: false, retry: false } },
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  localStorage.clear()
})

function renderAddresses(status: StatusData) {
  client.setQueryData(STATUS_QUERY_KEY, status)
  return render(
    <QueryClientProvider client={client}>
      <ApiKeyAddresses />
    </QueryClientProvider>
  )
}

it('shows every configured address directly and copies only the chosen visible URL', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  renderAddresses({
    server_address: 'https://console.example.com',
    api_info_enabled: true,
    api_info: [
      {
        route: 'Global',
        description: 'Worldwide access',
        url: 'https://api.example.com/v1',
        color: 'blue',
      },
      {
        route: 'Asia',
        description: 'Regional access',
        url: 'https://asia.example.com/gateway/v1/',
        color: 'green',
      },
    ],
  })

  const list = screen.getByRole('list', { name: 'API Addresses' })
  expect(list).toHaveClass('flex-col', 'items-start')
  const rows = within(list).getAllByRole('listitem')
  expect(rows).toHaveLength(2)
  expect(rows[0].querySelector('span[aria-hidden="true"]')).toHaveClass(
    'size-2',
    '[clip-path:circle(closest-side)]'
  )
  expect(rows[0]).toHaveTextContent('Global')
  expect(within(rows[0]).getByText('https://api.example.com/v1')).toBeVisible()
  expect(rows[1]).toHaveTextContent('Asia')
  expect(
    within(rows[1]).getByText('https://asia.example.com/gateway/v1/')
  ).toBeVisible()
  expect(writeText).not.toHaveBeenCalled()

  const copy = within(rows[1]).getByRole('button', {
    name: 'Copy API URL: https://asia.example.com/gateway/v1/',
  })
  await user.hover(copy)
  const copyHint = await screen.findByText('Copy API URL')
  expect(copyHint.closest('[data-slot="tooltip-content"]')).toHaveClass(
    'bg-(--tooltip-surface)',
    '[--tooltip-surface:#41464c]'
  )
  await user.click(copy)
  expect(writeText).toHaveBeenCalledWith('https://asia.example.com/gateway/v1/')
  expect(
    await within(rows[1]).findByRole('button', { name: 'Copied' })
  ).toBeVisible()
  expect(
    within(rows[0]).getByRole('button', {
      name: 'Copy API URL: https://api.example.com/v1',
    })
  ).toBeVisible()
})

it.each(['hover', 'focus'])(
  'shows only the selected URL description on %s',
  async (interaction) => {
    const user = userEvent.setup()
    const url = 'https://api.example.com/v1'
    const description = 'Use this route for regional access.'
    const blankUrl = 'https://api.example.org/v1'
    renderAddresses({
      api_info: [
        { route: 'Regional', url, color: 'blue', description },
        { route: 'Global', url: blankUrl, color: 'green', description: '  ' },
      ],
    })

    const address = screen.getByText(url)
    expect(screen.queryByText(description)).not.toBeInTheDocument()
    expect(screen.getByText(blankUrl)).not.toHaveAttribute('tabindex')

    if (interaction === 'hover') {
      await user.hover(address)
      expect(address).toHaveClass('cursor-text', 'select-text')
    } else {
      await user.tab()
      expect(address).toHaveFocus()
    }

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent(description)
    expect(tooltip).toHaveClass(
      'bg-(--tooltip-surface)',
      '[--tooltip-surface:#41464c]'
    )
    expect(address).toHaveAccessibleDescription(description)
  }
)

it('opens external speed testing for the selected address without an inline result', async () => {
  const user = userEvent.setup()
  const url = 'https://regional.example.com/v1'
  const otherUrl = 'https://api.example.com/v1'
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const fetchLatency = vi.spyOn(globalThis, 'fetch')

  renderAddresses({
    api_info: [
      { route: 'Regional', url, color: 'blue', description: '' },
      { route: 'Global', url: otherUrl, color: 'green', description: '' },
    ],
  })
  const list = screen.getByRole('list', { name: 'API Addresses' })
  const [row] = within(list).getAllByRole('listitem')
  const testButton = within(row).getByRole('button', {
    name: `External Speed Test: ${url}`,
  })

  await user.click(testButton)
  expect(open).toHaveBeenCalledExactlyOnceWith(
    'https://www.tcptest.cn/http/https%3A%2F%2Fregional.example.com%2Fv1',
    '_blank',
    'noopener,noreferrer'
  )
  expect(fetchLatency).not.toHaveBeenCalled()
  expect(within(row).queryByRole('status')).not.toBeInTheDocument()
})

it.each([
  {
    status: {
      api_info: [],
      server_address: 'https://gateway.example.com/proxy/',
    },
    label: 'Default API address',
    url: 'https://gateway.example.com/proxy/',
  },
  {
    status: { api_info: [] },
    label: 'Current domain',
    url: window.location.origin,
  },
  {
    status: {
      api_info_enabled: false,
      api_info: [
        {
          route: 'Hidden',
          description: 'Disabled address',
          url: 'https://hidden.example.com',
          color: 'blue',
        },
      ],
      server_address: 'https://gateway.example.com',
    },
    label: 'Default API address',
    url: 'https://gateway.example.com',
  },
])(
  'shows and copies the fallback $label when no configured addresses are available',
  async ({ status, label, url }) => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    renderAddresses(status)

    const list = screen.getByRole('list', { name: 'API Addresses' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText(label)).toBeVisible()
    expect(within(list).getByText(url)).toBeVisible()
    const copy = within(list).getByRole('button', {
      name: `Copy API URL: ${url}`,
    })
    await user.tab()
    expect(copy).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(writeText).toHaveBeenCalledWith(url)
    await user.tab()
    expect(
      within(list).getByRole('button', { name: `External Speed Test: ${url}` })
    ).toHaveFocus()
  }
)

it('wraps long addresses within the available width and updates when configuration changes', async () => {
  const user = userEvent.setup()
  const url =
    'https://regional-api-gateway.example.com/organization/production/openai-compatible/v1/'
  renderAddresses({
    api_info: [
      {
        route: 'Regional gateway',
        description: 'Regional production gateway',
        url,
        color: 'blue',
      },
    ],
  })
  const list = screen.getByRole('list', { name: 'API Addresses' })
  expect(list).toHaveClass('max-h-48', 'overflow-y-auto', '*:shrink-0')
  expect(within(list).getByRole('listitem')).toHaveClass('max-w-full')
  const address = within(list).getByText(url)
  expect(address).toHaveClass('break-all', 'select-text')
  expect(address.parentElement).toHaveClass('flex-wrap')
  expect(address).not.toHaveClass('truncate')

  act(() => {
    client.setQueryData(STATUS_QUERY_KEY, {
      api_info: [
        {
          route: 'Replacement',
          description: 'Updated gateway',
          url: 'https://new.example.com',
          color: 'blue',
        },
      ],
    })
  })
  expect(await within(list).findByText('https://new.example.com')).toBeVisible()
  expect(within(list).queryByText(url)).not.toBeInTheDocument()
  await user.click(
    within(list).getByRole('button', {
      name: 'Copy API URL: https://new.example.com',
    })
  )
  expect(await navigator.clipboard.readText()).toBe('https://new.example.com')
})
