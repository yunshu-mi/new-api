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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CustomerSupport } from '@/components/customer-support'
import { api } from '@/lib/api'
import {
  parseCustomerSupportConfig,
  type CustomerSupportConfig,
} from '@/lib/customer-support'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

import { SettingsPageProvider } from '../../components/settings-page-context'
import type { UpdateOptionRequest } from '../../types'
import { CustomerSupportSection } from '../customer-support-section'

function Fixture(props: {
  client: QueryClient
  config: CustomerSupportConfig
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  return (
    <QueryClientProvider client={props.client}>
      <div ref={setContainer} />
      <SettingsPageProvider actionsContainer={container}>
        <CustomerSupportSection defaultValue={JSON.stringify(props.config)} />
      </SettingsPageProvider>
      <CustomerSupport />
    </QueryClientProvider>
  )
}

function renderSettings(config = parseCustomerSupportConfig({})) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(STATUS_QUERY_KEY, { customer_support: config })
  render(<Fixture client={client} config={config} />)
  return client
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.setUser({ id: 1, username: 'admin', role: 100 })
})

afterEach(() => {
  useAuthStore.getState().auth.reset()
})

describe('customer support settings', () => {
  it('previews separate contact fields and saves all settings, refreshing the header entry', async () => {
    let storedConfig = parseCustomerSupportConfig({})
    const put = vi.spyOn(api, 'put').mockImplementation(async (_url, body) => {
      storedConfig = parseCustomerSupportConfig(
        (body as UpdateOptionRequest).value
      )
      return { data: { success: true } } as never
    })
    vi.spyOn(api, 'get').mockImplementation(
      async () =>
        ({
          data: { success: true, data: { customer_support: storedConfig } },
        }) as never
    )
    const client = renderSettings()
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('switch', { name: 'Show support button' })
    )
    await user.clear(screen.getByRole('textbox', { name: /Popup title/ }))
    await user.type(
      screen.getByRole('textbox', { name: /Popup title/ }),
      'Help desk'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Service hours: 9–18'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Support name' }),
      'Support team'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Phone number' }),
      '123456'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'WeChat ID' }),
      'support-team'
    )
    expect(screen.getByRole('heading', { name: 'Help desk' })).toBeVisible()
    expect(screen.getByText('Phone number: 123456')).toBeVisible()
    expect(screen.getByText('WeChat ID: support-team')).toBeVisible()
    expect(put).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('/api/option/', {
        key: 'console_setting.customer_support',
        value: JSON.stringify({
          enabled: true,
          title: 'Help desk',
          description: 'Service hours: 9–18',
          name: 'Support team',
          phone: '123456',
          wechat: 'support-team',
          qr_code: '',
        }),
      })
    )
    expect(
      await screen.findByRole('button', { name: 'Contact support' })
    ).toBeVisible()
    client.clear()
  })

  it('turning off support saves the contact details and QR code while hiding the entry', async () => {
    let storedConfig = parseCustomerSupportConfig({
      enabled: true,
      title: 'Contact support',
      name: 'Support team',
      phone: '123456',
      qr_code: 'data:image/png;base64,test',
    })
    vi.spyOn(api, 'put').mockImplementation(async (_url, body) => {
      storedConfig = parseCustomerSupportConfig(
        (body as UpdateOptionRequest).value
      )
      return { data: { success: true } } as never
    })
    vi.spyOn(api, 'get').mockImplementation(
      async () =>
        ({
          data: { success: true, data: { customer_support: storedConfig } },
        }) as never
    )
    const client = renderSettings(storedConfig)
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('switch', { name: 'Show support button' })
    )
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Contact support' })
      ).not.toBeInTheDocument()
    )
    expect(storedConfig).toMatchObject({
      enabled: false,
      name: 'Support team',
      phone: '123456',
      qr_code: 'data:image/png;base64,test',
    })
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue(
      '123456'
    )
    client.clear()
  })

  it('uploads and saves a QR image, then previews removal before saving again', async () => {
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: { customer_support: {} } },
    })
    const client = renderSettings()
    const user = userEvent.setup()
    const file = new File(
      [
        Uint8Array.from(
          atob(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII='
          ),
          (c) => c.charCodeAt(0)
        ),
      ],
      'qr.png',
      { type: 'image/png' }
    )
    await user.upload(screen.getByLabelText('Support QR code'), file)
    const image = await screen.findByRole('img', { name: 'Support QR code' })
    expect(image.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
    const imageData = image.getAttribute('src')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    const saved = put.mock.calls[0][1] as UpdateOptionRequest
    expect(saved.key).toBe('console_setting.customer_support')
    expect(JSON.parse(saved.value as string)).toMatchObject({
      qr_code: imageData,
    })
    await user.click(screen.getByRole('button', { name: 'Remove QR code' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove QR code' })
    ).toBeDisabled()
    expect(put).toHaveBeenCalledTimes(1)
    client.clear()
  })

  it.each([
    new File(['<svg/>'], 'qr.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    }),
  ])('rejects unsupported or oversized QR files ($name)', async (file) => {
    const client = renderSettings()
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(screen.getByLabelText('Support QR code'), file)
    expect(
      await screen.findByText(
        'Support QR code must be a PNG, JPEG or WebP image up to 5 MB'
      )
    ).toBeVisible()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    client.clear()
  })

  it('requires a popup title when support is enabled', async () => {
    const put = vi.spyOn(api, 'put')
    const client = renderSettings()
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('switch', { name: 'Show support button' })
    )
    await user.clear(screen.getByRole('textbox', { name: /Popup title/ }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Popup title is required')).toBeVisible()
    expect(put).not.toHaveBeenCalled()
    client.clear()
  })

  it('a failed save preserves the draft and previously published contact', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(new Error('Save failed'))
    const client = renderSettings(
      parseCustomerSupportConfig({
        enabled: true,
        title: 'Help desk',
        name: 'Published contact',
      })
    )
    const user = userEvent.setup()
    const input = screen.getByRole('textbox', { name: 'Support name' })
    await user.clear(input)
    await user.type(input, 'Updated contact')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
    )
    expect(input).toHaveValue('Updated contact')
    await user.click(screen.getByRole('button', { name: 'Contact support' }))
    expect(await screen.findByText('Published contact')).toBeVisible()
    client.clear()
  })
})
