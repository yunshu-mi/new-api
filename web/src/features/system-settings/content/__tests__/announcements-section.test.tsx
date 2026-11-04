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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { expect, it } from 'vitest'

import zh from '@/i18n/locales/zh.json'

import { AnnouncementsSection } from '../announcements-section'

it('shows the Chinese announcement types and their reference colors in the table and editor', async () => {
  const i18n = createInstance()
  await i18n.init({ lng: 'zh', resources: { zh } })
  const queryClient = new QueryClient()
  const user = userEvent.setup()
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AnnouncementsSection
          enabled
          data={JSON.stringify([
            {
              id: 1,
              extra: 'Service update',
              content: 'Existing announcement',
              publishDate: '2026-11-04T00:00:00Z',
              type: 'error',
            },
          ])}
        />
      </QueryClientProvider>
    </I18nextProvider>
  )

  const incident = screen.getByRole('cell', { name: '异常' })
  expect(incident.querySelector('[aria-hidden=true]')).toHaveClass(
    'bg-[#ef4444]'
  )

  const contentCell = screen.getByRole('cell', {
    name: 'Existing announcement',
  })
  expect(
    contentCell.querySelector('[data-slot="tooltip-trigger"]')
  ).toHaveClass('w-fit', 'max-w-full')

  for (const text of ['Service update', 'Existing announcement']) {
    const cell = screen.getByRole('cell', { name: text })
    const trigger = within(cell).getByText(text)
    await user.hover(trigger)
    const tooltip = screen.getByText(text, {
      selector: '[data-slot="tooltip-content"]',
    })
    expect(tooltip).toHaveClass(
      'bg-(--tooltip-surface)',
      '[--tooltip-surface:#41464c]'
    )
    await user.unhover(trigger)
  }

  await user.click(screen.getByRole('button', { name: '添加公告' }))
  const dialog = screen.getByRole('dialog', { name: '添加公告' })
  const type = within(dialog).getByRole('combobox', { name: '类型' })
  expect(type).toHaveTextContent('默认')
  await user.click(type)

  for (const [label, color] of [
    ['默认', 'bg-[#8b9aa7]'],
    ['进行中', 'bg-[#3b82f6]'],
    ['成功', 'bg-[#10b981]'],
    ['警告', 'bg-[#f59e0b]'],
    ['异常', 'bg-[#ef4444]'],
  ]) {
    const option = screen.getByRole('option', { name: label })
    expect(option.querySelector('[aria-hidden=true]')).toHaveClass(color)
  }

  await user.click(screen.getByRole('option', { name: '进行中' }))
  expect(type).toHaveTextContent('进行中')

  await user.type(
    within(dialog).getByRole('textbox', { name: '内容' }),
    'Maintenance details'
  )
  await user.type(
    within(dialog).getByRole('textbox', { name: '标题（可选）' }),
    'Scheduled outage'
  )
  await user.click(within(dialog).getByRole('button', { name: '添加' }))
  const headers = screen.getAllByRole('columnheader')
  expect(headers[1]).toHaveAccessibleName('标题')
  expect(headers[4]).toHaveAccessibleName('内容')
  expect(
    await screen.findByRole('cell', { name: 'Scheduled outage' })
  ).toBeVisible()
  queryClient.clear()
})
