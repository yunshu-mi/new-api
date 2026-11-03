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
import i18next from 'i18next'
import { act } from 'react'
import { afterEach, expect, test } from 'vitest'

import { mapStatusDataToConfig, STATUS_QUERY_KEY } from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { Footer } from '../footer'

const clients: QueryClient[] = []
const initialConfig = useSystemConfigStore.getState().config

afterEach(async () => {
  cleanup()
  for (const client of clients) client.clear()
  clients.length = 0
  useSystemConfigStore.getState().setConfig(initialConfig)
  await i18next.changeLanguage('en')
  i18next.removeResourceBundle('zh', 'translation')
})

async function renderFooter(
  status: Record<string, unknown> = {},
  compact = true,
  footerHtml = ''
): Promise<QueryClient> {
  useSystemConfigStore.getState().setConfig({
    ...mapStatusDataToConfig(status),
    systemName: 'New API',
    footerHtml,
    demoSiteEnabled: false,
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, status)
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <Footer compact={compact} />,
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('contentinfo')
  return client
}

test.each([
  [true, ''],
  [false, ''],
  [true, '<p>Custom footer</p>'],
] as const)(
  '备案号在页脚左侧显示并链接到工信部，适用于紧凑、完整和自定义页脚：%s / %s',
  async (compact, html) => {
    const record = '京ICP备12345678号-1'
    await renderFooter({ icp_record: `  ${record}  ` }, compact, html)

    const footer = screen.getByRole('contentinfo')
    const link = within(footer).getByRole('link', { name: record })
    expect(link).toHaveAttribute('href', 'https://beian.miit.gov.cn/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link.parentElement).toHaveClass('min-w-0')
    if (!html) expect(link.parentElement).toHaveTextContent('©')
  }
)

test.each([undefined, '', '   ', 123])(
  '备案号为 %s 时不显示空入口',
  async (record) => {
    await renderFooter({ icp_record: record })

    expect(
      within(screen.getByRole('contentinfo')).queryByRole('link')
    ).not.toBeInTheDocument()
  }
)

test('超长备案号允许换行，配置中的 HTML 作为文本显示', async () => {
  const record = '<img src=x onerror=alert(1)>京ICP备12345678号-1'.repeat(5)
  await renderFooter({ icp_record: record })

  const link = screen.getByRole('link', { name: record })
  expect(link).toHaveClass('min-w-0', 'break-words')
  expect(link.querySelector('img')).toBeNull()
})

test('配置两项协议时在版权右侧显示协议组，并用竖线分隔', async () => {
  await renderFooter({
    user_agreement_enabled: true,
    privacy_policy_enabled: true,
  })

  const footer = screen.getByRole('contentinfo')
  const agreement = within(footer).getByRole('link', { name: 'User Agreement' })
  const privacy = within(footer).getByRole('link', { name: 'Privacy Policy' })
  expect(agreement).toHaveAttribute('href', '/user-agreement')
  expect(privacy).toHaveAttribute('href', '/privacy-policy')
  const legalGroup = agreement.parentElement
  expect(legalGroup).toContainElement(privacy)
  expect(legalGroup).toHaveTextContent('User Agreement|Privacy Policy')
  expect(legalGroup).not.toHaveTextContent('©')
  expect(legalGroup).toHaveClass('flex-wrap', 'min-w-0')
  expect(legalGroup?.parentElement).toHaveClass('sm:ml-auto', 'sm:justify-end')
  expect(legalGroup?.parentElement?.parentElement).toHaveClass(
    'flex-col',
    'sm:flex-row'
  )
})

test.each([
  [{}, []],
  [{ user_agreement_enabled: true }, ['User Agreement']],
  [{ privacy_policy_enabled: true }, ['Privacy Policy']],
] as const)(
  '配置为 %j 时仅显示已配置的协议，且没有多余分隔符',
  async (status, labels) => {
    await renderFooter(status)

    const footer = screen.getByRole('contentinfo')
    expect(
      within(footer)
        .queryAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(labels)
    expect(within(footer).queryByText('|')).not.toBeInTheDocument()
  }
)

test('后台状态更新后同步显示协议，并支持键盘聚焦和语言切换', async () => {
  const user = userEvent.setup()
  const client = await renderFooter()
  const zh = await import('@/i18n/locales/zh.json')
  i18next.addResourceBundle('zh', 'translation', zh.translation)

  await act(async () => {
    client.setQueryData(STATUS_QUERY_KEY, {
      user_agreement_enabled: true,
      privacy_policy_enabled: true,
    })
    await i18next.changeLanguage('zh')
  })

  const agreement = await screen.findByRole('link', { name: '用户协议' })
  await user.tab()
  expect(agreement).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('link', { name: '隐私政策' })).toHaveFocus()
})

test.each([
  [false, ''],
  [true, '<p>Custom footer</p>'],
] as const)(
  '完整页脚或自定义页脚仍显示协议及项目署名：%s / %s',
  async (compact, html) => {
    await renderFooter(
      { user_agreement_enabled: true, privacy_policy_enabled: true },
      compact,
      html
    )

    const footer = screen.getByRole('contentinfo')
    expect(
      within(footer).getByRole('link', { name: 'User Agreement' })
    ).toBeVisible()
    expect(
      within(footer).getByRole('link', { name: 'Privacy Policy' })
    ).toBeVisible()
    expect(
      within(footer)
        .getAllByRole('link', { name: 'New API' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            'https://github.com/QuantumNous/new-api'
        )
    ).toBe(true)
  }
)
