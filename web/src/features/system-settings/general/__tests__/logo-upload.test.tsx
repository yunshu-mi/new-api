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
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider, useTheme } from '@/context/theme-provider'
import { useSystemConfig } from '@/hooks/use-system-config'
import { api } from '@/lib/api'
import { DEFAULT_LOGO } from '@/lib/constants'
import { mapStatusDataToConfig, statusQueryOptions } from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { SettingsPageProvider } from '../../components/settings-page-context'
import { SystemInfoSection } from '../system-info-section'

let client: QueryClient
const originalDecode = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  'decode'
)

const initialConfig = useSystemConfigStore.getState().config

async function renderSettings(logo = '', logoDark = '') {
  function Fixture() {
    const [container, setContainer] = useState<HTMLDivElement | null>(null)
    useQuery(statusQueryOptions)
    const { logo: publishedLogo } = useSystemConfig()
    const { setTheme } = useTheme()
    return (
      <>
        <div ref={setContainer} />
        <img alt='Published logo' src={publishedLogo} />
        <button type='button' onClick={() => setTheme('light')}>
          Use light theme
        </button>
        <button type='button' onClick={() => setTheme('dark')}>
          Use dark theme
        </button>
        <SettingsPageProvider actionsContainer={container}>
          <SystemInfoSection
            defaultValues={{
              SystemName: 'New API',
              ServerAddress: '',
              TaskPublicAddress: '',
              Logo: logo,
              Footer: '',
              About: '',
              HomePageContent: '',
              general_setting: { docs_link: '', logo_dark: logoDark },
              legal: { user_agreement: '', privacy_policy: '' },
            }}
          />
        </SettingsPageProvider>
      </>
    )
  }
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(['status'], { logo, logo_dark: logoDark })
  useSystemConfigStore
    .getState()
    .setConfig(mapStatusDataToConfig({ logo, logo_dark: logoDark }))
  const router = createRouter({
    routeTree: createRootRoute({ component: Fixture }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme='light'>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
  return screen.findByLabelText('Light mode logo')
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: { logo: '' } },
  })
  vi.spyOn(toast, 'error')
})

afterEach(() => {
  client?.clear()
  useSystemConfigStore.setState({ config: initialConfig })
  localStorage.clear()
  document.documentElement.classList.remove('light', 'dark')
  if (originalDecode) {
    Object.defineProperty(HTMLImageElement.prototype, 'decode', originalDecode)
  } else {
    Reflect.deleteProperty(HTMLImageElement.prototype, 'decode')
  }
})

describe('logo upload settings', () => {
  it('shows image placeholders beside upload controls and configured logos in the previews below', async () => {
    const lightLogo = 'https://example.com/light.png'
    const darkLogo = 'https://example.com/dark.webp'
    await renderSettings(lightLogo, darkLogo)

    const placeholders = screen.getAllByTestId('logo-upload-icon')
    expect(placeholders).toHaveLength(2)
    for (const placeholder of placeholders) {
      expect(placeholder).toHaveAttribute('aria-hidden', 'true')
      expect(placeholder).toHaveClass('size-10', 'shrink-0')
    }
    expect(screen.queryAllByAltText('')).toHaveLength(0)
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      lightLogo
    )
    expect(screen.getByAltText('Dark logo preview')).toHaveAttribute(
      'src',
      darkLogo
    )
  })

  it('saves separate light and dark uploads and switches the published logo with the theme', async () => {
    const input = await renderSettings()
    const user = userEvent.setup()
    const lightData = 'data:image/png;base64,bGlnaHQ='
    const darkData = 'data:image/webp;base64,ZGFyaw=='
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { logo: lightData, logo_dark: darkData } },
    })
    await user.upload(
      input,
      new File(['light'], 'light.png', { type: 'image/png' })
    )
    await waitFor(() =>
      expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
        'src',
        lightData
      )
    )
    await user.upload(
      screen.getByLabelText('Dark mode logo (optional)'),
      new File(['dark'], 'dark.webp', { type: 'image/webp' })
    )
    await waitFor(() =>
      expect(screen.getByAltText('Dark logo preview')).toHaveAttribute(
        'src',
        darkData
      )
    )
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      lightData
    )
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/api/option/', {
        key: 'Logo',
        value: lightData,
      })
    )
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/api/option/', {
        key: 'general_setting.logo_dark',
        value: darkData,
      })
    )
    await waitFor(() =>
      expect(screen.getByAltText('Published logo')).toHaveAttribute(
        'src',
        lightData
      )
    )
    await user.click(screen.getByRole('button', { name: 'Use dark theme' }))
    expect(screen.getByAltText('Published logo')).toHaveAttribute(
      'src',
      darkData
    )
    await user.click(screen.getByRole('button', { name: 'Use light theme' }))
    expect(screen.getByAltText('Published logo')).toHaveAttribute(
      'src',
      lightData
    )
  })

  it('restoring only the dark logo uses the saved light logo in dark mode', async () => {
    const lightData = 'https://example.com/light.png'
    await renderSettings(lightData, 'https://example.com/dark.webp')
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { logo: lightData, logo_dark: '' } },
    })
    await user.click(screen.getByRole('button', { name: 'Use dark theme' }))
    expect(screen.getByAltText('Published logo')).toHaveAttribute(
      'src',
      'https://example.com/dark.webp'
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Restore original for Dark mode logo (optional)',
      })
    )
    expect(screen.getByAltText('Dark logo preview')).toHaveAttribute(
      'src',
      lightData
    )
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      lightData
    )
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/option/', {
        key: 'general_setting.logo_dark',
        value: '',
      })
    )
    await waitFor(() =>
      expect(screen.getByAltText('Published logo')).toHaveAttribute(
        'src',
        lightData
      )
    )
  })

  it('restoring only the light logo keeps the separately configured dark logo', async () => {
    await renderSettings(
      'https://example.com/light.png',
      'https://example.com/dark.webp'
    )
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', {
        name: 'Restore original for Light mode logo',
      })
    )
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      DEFAULT_LOGO
    )
    expect(screen.getByAltText('Dark logo preview')).toHaveAttribute(
      'src',
      'https://example.com/dark.webp'
    )
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/option/', {
        key: 'Logo',
        value: '',
      })
    )
  })

  it('previews a selected image before saving and refreshes the published logo after saving', async () => {
    const input = await renderSettings('https://example.com/old-logo.png')
    const user = userEvent.setup()
    const file = new File(['logo-image'], 'logo.png', { type: 'image/png' })
    const dataUrl = 'data:image/png;base64,bG9nby1pbWFnZQ=='
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { logo: dataUrl } },
    })

    await user.upload(input, file)
    await waitFor(() =>
      expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
        'src',
        dataUrl
      )
    )
    expect(screen.getByAltText('Dark logo preview')).toHaveAttribute(
      'src',
      dataUrl
    )
    expect(screen.getByAltText('Published logo')).toHaveAttribute(
      'src',
      'https://example.com/old-logo.png'
    )
    expect(api.put).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/api/option/', {
        key: 'Logo',
        value: dataUrl,
      })
    )
    await waitFor(() =>
      expect(screen.getByAltText('Published logo')).toHaveAttribute(
        'src',
        dataUrl
      )
    )
  })

  it('restoring the original logo saves an empty setting while reset restores the saved URL', async () => {
    await renderSettings('https://example.com/old-logo.png')
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', {
        name: 'Restore original for Light mode logo',
      })
    )
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      DEFAULT_LOGO
    )
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      'https://example.com/old-logo.png'
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Restore original for Light mode logo',
      })
    )
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/api/option/', {
        key: 'Logo',
        value: '',
      })
    )
    await waitFor(() =>
      expect(screen.getByAltText('Published logo')).toHaveAttribute(
        'src',
        DEFAULT_LOGO
      )
    )
  })

  it.each([
    [
      'unsupported file',
      new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }),
      'Please choose a PNG or WebP image',
    ],
    [
      'oversized file',
      new File([new Uint8Array(100 * 1024 + 1)], 'logo.png', {
        type: 'image/png',
      }),
      'Logo file must be 100 KB or smaller',
    ],
  ])(
    'keeps the saved logo when selecting an %s',
    async (_label, file, error) => {
      const input = await renderSettings('https://example.com/saved.png')
      const user = userEvent.setup({ applyAccept: false })
      await user.upload(input, file)
      expect(toast.error).toHaveBeenCalledWith(error)
      expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
        'src',
        'https://example.com/saved.png'
      )
      await user.click(screen.getByRole('button', { name: 'Save Changes' }))
      expect(api.put).not.toHaveBeenCalled()
    }
  )

  it('preserves the previous logo when decoding fails and allows selecting the same file again', async () => {
    const input = await renderSettings()
    vi.mocked(HTMLImageElement.prototype.decode).mockRejectedValueOnce(
      new Error('Invalid image')
    )
    const user = userEvent.setup()
    const file = new File(['webp-image'], 'logo.webp', { type: 'image/webp' })
    await user.upload(input, file)
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Unable to read logo image')
    )
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      DEFAULT_LOGO
    )
    await user.upload(input, file)
    await waitFor(() =>
      expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
        'src',
        'data:image/webp;base64,d2VicC1pbWFnZQ=='
      )
    )
  })

  it('shows a read error and preserves the saved logo when FileReader fails', async () => {
    const input = await renderSettings('https://example.com/saved.png')
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(
      function (this: FileReader) {
        this.dispatchEvent(new ProgressEvent('error'))
      }
    )
    const user = userEvent.setup()
    await user.upload(
      input,
      new File(['logo-image'], 'logo.png', { type: 'image/png' })
    )
    expect(toast.error).toHaveBeenCalledWith('Unable to read logo image')
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      'https://example.com/saved.png'
    )
    expect(
      screen.getByRole('button', { name: 'Choose file for Light mode logo' })
    ).toBeEnabled()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('disables save and reset while reading and retains the uploaded draft after a failed save', async () => {
    const input = await renderSettings()
    let finishDecode!: () => void
    vi.mocked(HTMLImageElement.prototype.decode).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishDecode = resolve
      })
    )
    vi.mocked(api.put).mockRejectedValueOnce(new Error('Save failed'))
    const user = userEvent.setup()
    await user.upload(
      input,
      new File(['logo-image'], 'logo.png', { type: 'image/png' })
    )
    await waitFor(() =>
      expect(HTMLImageElement.prototype.decode).toHaveBeenCalled()
    )
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Choose file for Light mode logo' })
    ).toBeDisabled()
    finishDecode()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
    )
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(api.put).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
    )
    expect(screen.getByAltText('Light logo preview')).toHaveAttribute(
      'src',
      'data:image/png;base64,bG9nby1pbWFnZQ=='
    )
    expect(screen.getByAltText('Published logo')).toHaveAttribute(
      'src',
      DEFAULT_LOGO
    )
    expect(api.get).not.toHaveBeenCalled()
  })
})
