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
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import { Footer } from '@/components/layout/components/footer'
import { api } from '@/lib/api'
import { mapStatusDataToConfig, STATUS_QUERY_KEY } from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { SettingsPageProvider } from '../../components/settings-page-context'
import { SystemInfoSection } from '../system-info-section'

const initialConfig = useSystemConfigStore.getState().config
let client: QueryClient

afterEach(() => {
  cleanup()
  client?.clear()
  useSystemConfigStore.setState({ config: initialConfig })
  localStorage.clear()
})

function SiteInfoFixture(props: { record: string }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  return (
    <>
      <div ref={setContainer} />
      <SettingsPageProvider actionsContainer={container}>
        <SystemInfoSection
          defaultValues={{
            SystemName: 'New API',
            ServerAddress: '',
            TaskPublicAddress: '',
            Logo: '',
            Footer: '',
            About: '',
            HomePageContent: '',
            general_setting: {
              docs_link: '',
              logo_dark: '',
              icp_record: props.record,
            },
            legal: { user_agreement: '', privacy_policy: '' },
          }}
        />
      </SettingsPageProvider>
      <Footer compact />
    </>
  )
}

async function renderSettings(record: string): Promise<void> {
  const status = { icp_record: record }
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(STATUS_QUERY_KEY, status)
  useSystemConfigStore.getState().setConfig({
    ...mapStatusDataToConfig(status),
    footerHtml: '',
    demoSiteEnabled: false,
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <SiteInfoFixture record={record} />,
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByLabelText('ICP filing number')
}

test.each([
  ['', '京ICP备12345678号-1'],
  ['京ICP备12345678号-1', '沪ICP备87654321号-2'],
  ['京ICP备12345678号-1', ''],
])('备案号由 %s 保存为 %s 后同步刷新页脚', async (original, next) => {
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: { icp_record: next } },
  })
  await renderSettings(original)
  const user = userEvent.setup()
  const input = screen.getByLabelText('ICP filing number')
  expect(input).toHaveValue(original)
  await user.clear(input)
  if (next) await user.type(input, next)
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))

  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'general_setting.icp_record',
      value: next,
    })
  )
  const footer = within(screen.getByRole('contentinfo'))
  if (next) {
    expect(await footer.findByRole('link', { name: next })).toBeVisible()
  } else {
    await waitFor(() =>
      expect(footer.queryByRole('link')).not.toBeInTheDocument()
    )
  }
})

test('保存备案号失败时保留草稿和原有已发布的页脚', async () => {
  vi.spyOn(api, 'put').mockResolvedValue({
    data: { success: false, message: 'Could not save' },
  })
  await renderSettings('京ICP备12345678号-1')
  const user = userEvent.setup()
  const input = screen.getByLabelText('ICP filing number')
  await user.clear(input)
  await user.type(input, '沪ICP备87654321号-2')
  const save = screen.getByRole('button', { name: 'Save Changes' })
  await user.click(save)

  await waitFor(() => expect(api.put).toHaveBeenCalled())
  await waitFor(() => expect(save).not.toBeDisabled())
  expect(input).toHaveValue('沪ICP备87654321号-2')
  expect(
    screen.getByRole('link', { name: '京ICP备12345678号-1' })
  ).toBeVisible()
  expect(
    screen.queryByRole('link', { name: '沪ICP备87654321号-2' })
  ).not.toBeInTheDocument()
})
