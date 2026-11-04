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
import { useState } from 'react'
import { expect, it, vi } from 'vitest'

import { NotificationPopover } from '@/components/notification-popover'
import { useNotifications } from '@/hooks/use-notifications'
import { api } from '@/lib/api'

import { SettingsPageProvider } from '../../components/settings-page-context'
import type { UpdateOptionRequest } from '../../types'
import { NoticeSection } from '../notice-section'

function NoticeFixture({ defaultValue }: { defaultValue: string }) {
  const [actions, setActions] = useState<HTMLDivElement | null>(null)
  const notifications = useNotifications()
  return (
    <>
      <div ref={setActions} />
      <SettingsPageProvider actionsContainer={actions}>
        <NoticeSection defaultValue={defaultValue} />
      </SettingsPageProvider>
      <NotificationPopover
        open={notifications.popoverOpen}
        onOpenChange={notifications.setPopoverOpen}
        onCloseToday={notifications.closeToday}
        unreadCount={notifications.unreadCount}
        activeTab={notifications.activeTab}
        onTabChange={notifications.setActiveTab}
        notice={notifications.notice}
        announcements={notifications.announcements}
        loading={notifications.loading}
      />
    </>
  )
}

it('inserts a separator at the cursor and renders it between the saved sections', async () => {
  const first = 'First section'
  const second = 'Second section'
  const initialNotice = first + second
  let savedNotice = initialNotice
  const put = vi.spyOn(api, 'put').mockImplementation(async (_url, body) => {
    savedNotice = String((body as UpdateOptionRequest).value)
    return { data: { success: true } }
  })
  vi.spyOn(api, 'get').mockImplementation(async (url) => ({
    data: { success: true, data: url === '/api/notice' ? savedNotice : {} },
  }))
  const client = new QueryClient()
  client.setQueryData(['notice'], { success: true, data: initialNotice })
  client.setQueryData(['status'], {})
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <NoticeFixture defaultValue={initialNotice} />
    </QueryClientProvider>
  )

  const editor = screen.getByRole<HTMLTextAreaElement>('textbox', {
    name: 'Announcement content',
  })
  await user.click(editor)
  editor.setSelectionRange(first.length, initialNotice.length)
  await user.click(screen.getByRole('button', { name: 'Insert separator' }))

  expect(editor).toHaveFocus()
  expect(editor).toHaveValue('First section\n\n---\n\nSecond section')
  expect(put).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Save notice' }))
  await user.click(screen.getByRole('button', { name: 'Notifications' }))

  const panel = within(screen.getByRole('tabpanel'))
  const separator = await panel.findByRole('separator')
  expect(panel.getByText(first).nextElementSibling).toBe(separator)
  expect(separator.nextElementSibling).toBe(panel.getByText(second))
  client.clear()
})
