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
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { useNotifications } from '@/hooks/use-notifications'
import { useNotificationStore } from '@/stores/notification-store'

import { NotificationPopover } from '../notification-popover'

function Notifications({ autoOpenNotice }: { autoOpenNotice: boolean }) {
  const notifications = useNotifications(autoOpenNotice)
  return (
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
  )
}

function renderNotifications(
  autoOpenNotice = false,
  notice = 'Service notice',
  announcements = [{ id: 1, content: 'Service update' }]
) {
  const client = new QueryClient()
  client.setQueryData(['notice'], { success: true, data: notice })
  client.setQueryData(['status'], {
    announcements_enabled: true,
    announcements,
  })
  return render(
    <QueryClientProvider client={client}>
      <Notifications autoOpenNotice={autoOpenNotice} />
    </QueryClientProvider>
  )
}

afterEach(() => {
  useNotificationStore.setState(useNotificationStore.getInitialState())
  useNotificationStore.persist.clearStorage()
})

describe('notification dialog', () => {
  it('lets the notice grow with its content and only scrolls the dialog when the viewport is too short', async () => {
    const user = userEvent.setup()
    renderNotifications(false, 'Long notice\n\n'.repeat(80))
    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    const dialog = screen.getByRole('dialog', { name: 'System Announcements' })
    const panel = within(dialog).getByRole('tabpanel')

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveClass(
      'max-h-[min(var(--notification-height-limit,100dvh),var(--notification-available-height))]',
      'sm:max-w-[min(1150px,calc(100%-2rem))]',
      'overflow-y-auto'
    )
    expect(panel).not.toHaveClass('overflow-y-auto')
    expect(panel).not.toContainElement(within(dialog).getByRole('tablist'))
    for (const name of ['Close Today', 'Close Announcement']) {
      expect(panel).not.toContainElement(
        within(dialog).getByRole('button', { name })
      )
    }
  })

  it('switches tabs with the keyboard while keeping the dialog anchored at the top', async () => {
    const user = userEvent.setup()
    renderNotifications()
    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    const notice = screen.getByRole('tab', { name: 'Notice' })
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass(
      'top-(--notification-top)',
      'translate-y-0',
      'transition-none'
    )
    expect(notice).toHaveAttribute('aria-selected', 'true')
    notice.focus()
    await user.keyboard('{ArrowRight}{Enter}')

    const announcements = screen.getByRole('tab', {
      name: 'System Announcements',
    })
    expect(announcements).toHaveAttribute('aria-selected', 'true')
    expect(dialog).toHaveClass('top-(--notification-top)', 'translate-y-0')
    expect(
      within(screen.getByRole('tabpanel')).getByText('Service update')
    ).toBeVisible()
  })

  it('opens the notice tab from the bell even after closing on system announcements', async () => {
    const user = userEvent.setup()
    renderNotifications()
    const bell = screen.getByRole('button', { name: 'Notifications' })
    await user.click(bell)
    await user.click(screen.getByRole('tab', { name: 'System Announcements' }))
    await user.click(screen.getByRole('button', { name: 'Close Announcement' }))

    await user.click(bell)

    expect(
      screen.getByRole('tab', { name: 'Notice', selected: true })
    ).toBeVisible()
    expect(
      within(screen.getByRole('tabpanel')).getByText('Service notice')
    ).toBeVisible()
  })

  it('limits a long announcement list and keeps the controls outside its scroll area', async () => {
    const user = userEvent.setup()
    renderNotifications(true, 'Service notice', [
      { id: 1, content: `${'Long update\n\n'.repeat(80)}End of update` },
    ])
    await user.click(screen.getByRole('tab', { name: 'System Announcements' }))

    const dialog = screen.getByRole('dialog')
    const panel = within(dialog).getByRole('tabpanel')
    expect(dialog).toHaveClass('[--notification-height-limit:650px]')
    expect(panel).toHaveClass(
      'min-h-0',
      'overflow-y-auto',
      'overscroll-contain'
    )
    expect(within(panel).getByText('End of update')).toBeInTheDocument()
    expect(
      within(panel).queryByRole('separator', { hidden: true })
    ).not.toBeInTheDocument()
    expect(panel).not.toContainElement(within(dialog).getByRole('tablist'))
    expect(panel).not.toContainElement(
      within(dialog).getByRole('button', { name: 'Close Announcement' })
    )
  })

  it('connects adjacent announcements with thin vertical lines and leaves the last dot unconnected below', async () => {
    const user = userEvent.setup()
    renderNotifications(true, 'Service notice', [
      { id: 1, content: 'Service update\n\nMore details' },
      { id: 2, content: 'Scheduled maintenance' },
      { id: 3, content: 'Maintenance complete' },
    ])
    await user.click(screen.getByRole('tab', { name: 'System Announcements' }))

    const [first, second, last] = within(
      screen.getByRole('tabpanel')
    ).getAllByRole('listitem')
    for (const row of [first, second]) {
      const connector = within(row).getByRole('separator', { hidden: true })
      expect(connector).toHaveAttribute('aria-orientation', 'vertical')
      expect(connector).toHaveAttribute('aria-hidden', 'true')
      expect(connector).toHaveClass(
        'data-vertical:w-[0.5px]',
        'start-[calc(var(--spacing)_-_0.25px)]'
      )
    }
    expect(
      within(last).queryByRole('separator', { hidden: true })
    ).not.toBeInTheDocument()
  })

  it('suppresses automatic opening for the day while keeping the bell usable', async () => {
    const user = userEvent.setup()
    const firstVisit = renderNotifications(true)
    await user.click(screen.getByRole('button', { name: 'Close Today' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    firstVisit.unmount()

    const secondVisit = renderNotifications(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    secondVisit.unmount()

    useNotificationStore
      .getState()
      .setClosedUntilDate(new Date(2000, 0, 1).toDateString())
    renderNotifications(true)
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('does not open automatically when the console has no notice', () => {
    renderNotifications(true, '')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the notice on the next console visit after a regular close', async () => {
    const firstVisit = renderNotifications(true)
    await userEvent.click(
      screen.getByRole('button', { name: 'Close Announcement' })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    firstVisit.unmount()

    renderNotifications(true)
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it.each(['Close', 'Close Announcement', 'Escape'] as const)(
    'closes via %s and restores focus to the bell',
    async (dismiss) => {
      const user = userEvent.setup()
      renderNotifications()
      const bell = screen.getByRole('button', { name: 'Notifications' })
      bell.focus()
      await user.keyboard('{Enter}')
      expect(screen.getByRole('dialog')).toBeVisible()

      if (dismiss === 'Escape') {
        await user.keyboard('{Escape}')
      } else {
        await user.click(screen.getByRole('button', { name: dismiss }))
      }

      await waitFor(() => expect(bell).toHaveFocus())
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
    }
  )
})
