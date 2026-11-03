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
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CustomerSupport } from '@/components/customer-support'
import { parseCustomerSupportConfig } from '@/lib/customer-support'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

beforeEach(() => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'user', role: 1 })
})

afterEach(() => {
  useAuthStore.getState().auth.reset()
})

function renderSupport(config: unknown) {
  const client = new QueryClient()
  client.setQueryData(STATUS_QUERY_KEY, { customer_support: config })
  render(
    <QueryClientProvider client={client}>
      <CustomerSupport />
    </QueryClientProvider>
  )
  return client
}

describe('customer support', () => {
  it('hides for visitors, appears after login and closes an open dialog on logout', async () => {
    useAuthStore.getState().auth.reset()
    const client = renderSupport({ enabled: true, name: 'Support team' })
    expect(
      screen.queryByRole('button', { name: 'Contact support' })
    ).not.toBeInTheDocument()

    act(() =>
      useAuthStore.getState().auth.setUser({ id: 1, username: 'user', role: 1 })
    )
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Contact support' }))
    expect(
      await screen.findByRole('dialog', { name: 'Contact support' })
    ).toBeVisible()

    act(() => useAuthStore.getState().auth.reset())
    expect(
      screen.queryByRole('button', { name: 'Contact support' })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    client.clear()
  })
  it.each([undefined, {}, { enabled: false }, { enabled: 'true' }])(
    'hides disabled or invalid configuration (%j)',
    (config) => {
      const client = renderSupport(config)
      expect(
        screen.queryByRole('button', { name: 'Contact support' })
      ).not.toBeInTheDocument()
      client.clear()
    }
  )

  it('opens configured contact details and QR code by keyboard, then closes and restores focus', async () => {
    const client = renderSupport(
      parseCustomerSupportConfig({
        enabled: true,
        title: 'Help desk',
        description: 'Service hours: 9–18',
        name: 'Support team',
        phone: '123456',
        wechat: 'support-team',
        qr_code: '/api/customer-support/qr-code?v=test',
      })
    )
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Contact support' })
    await user.tab()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Help desk' })
    expect(
      within(dialog).getByRole('heading', { name: 'Help desk' })
    ).toHaveClass('break-words')
    expect(within(dialog).getByText('Service hours: 9–18')).toBeVisible()
    expect(within(dialog).getByText('Support team')).toBeVisible()
    expect(within(dialog).getByText('Phone number: 123456')).toBeVisible()
    expect(within(dialog).getByText('WeChat ID: support-team')).toBeVisible()
    expect(
      within(dialog).getByRole('img', { name: 'Support QR code' })
    ).toHaveAttribute('src', '/api/customer-support/qr-code?v=test')
    expect(
      within(dialog).getByRole('img', { name: 'Support QR code' })
    ).toHaveClass('max-w-full', 'h-auto')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    client.clear()
  })

  it('displays text literally and contains long content in a scrollable dialog', async () => {
    const description = `<script>alert(1)</script>${'客服'.repeat(400)}`
    const client = renderSupport({ enabled: true, description })
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Contact support' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveClass('overflow-y-auto')
    expect(within(dialog).getByText(description)).toBeVisible()
    expect(dialog.querySelector('script')).toBeNull()
    expect(within(dialog).getByText(description).parentElement).toHaveClass(
      'break-words'
    )
    client.clear()
  })
})
