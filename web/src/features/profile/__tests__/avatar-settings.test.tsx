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
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { createAppQueryClient } from '@/lib/query-client'

import { AvatarSettingsDialog } from '../components/avatar-settings-dialog'
import { ProfileHeader } from '../components/profile-header'

describe('avatar settings', () => {
  it('clips the loaded profile avatar to a circle without a surrounding ring', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(
      true
    )
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(
      360
    )

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <ProfileHeader
          profile={{
            id: 1,
            username: 'alice',
            display_name: 'Alice',
            avatar: '02_glasses_boy',
            role: 1,
            group: 'default',
            quota: 0,
            used_quota: 0,
            request_count: 0,
            status: 1,
            aff_count: 0,
            aff_quota: 0,
            aff_history_quota: 0,
            created_time: 0,
          }}
          loading={false}
          onAvatarChange={vi.fn()}
        />
      </QueryClientProvider>
    )

    const image = screen.getByAltText('')
    const frame = image.closest('[data-slot="avatar"]')
    expect(frame).toHaveClass('rounded-full', 'overflow-hidden', 'after:hidden')
    expect(frame).not.toHaveClass('sm:rounded-2xl')
    expect(frame).not.toHaveClass('ring-2')
    expect(frame).not.toHaveClass('sm:ring-4')
    expect(image).toHaveClass('scale-110')
  })

  it('opens from the keyboard and saves the selected preset', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true },
    })
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <AvatarSettingsDialog onSaved={onSaved} />
      </QueryClientProvider>
    )

    const trigger = screen.getByRole('button', { name: 'Change avatar' })
    trigger.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Change avatar' })
    const options = within(dialog).getByRole('radiogroup')
    const original = within(options).getByRole('radio', {
      name: 'Default avatar',
    })
    expect(original).toBeChecked()
    expect(within(options).getAllByRole('radio')).toHaveLength(6)
    expect(within(options).getAllByRole('presentation')[0]).toHaveAttribute(
      'src',
      '/avatars/01_default_user.png'
    )

    const save = within(dialog).getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    original.focus()
    await user.keyboard('{ArrowRight}')
    expect(
      within(options).getByRole('radio', { name: 'Long-haired woman' })
    ).toBeChecked()
    await user.click(within(options).getByText('Moon'))
    expect(within(options).getByRole('radio', { name: 'Moon' })).toBeChecked()
    await user.click(save)

    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(put).toHaveBeenCalledWith('/api/user/self/avatar', {
      avatar: '07_moon',
    })
    expect(onSaved).toHaveBeenCalledWith('07_moon')
  })

  it('keeps the dialog and draft open when restoring the default fails', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: false, message: 'Update failed' },
    })
    const errorToast = vi.spyOn(toast, 'error')
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <AvatarSettingsDialog avatar='07_moon' onSaved={onSaved} />
      </QueryClientProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Change avatar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change avatar' })
    expect(within(dialog).getByRole('radio', { name: 'Moon' })).toBeChecked()
    await user.click(within(dialog).getByText('Default avatar'))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(errorToast).toHaveBeenCalledWith('Update failed')
    )
    expect(put).toHaveBeenCalledWith('/api/user/self/avatar', {
      avatar: '01_default_user',
    })
    expect(onSaved).not.toHaveBeenCalled()
    expect(
      within(dialog).getByRole('radio', { name: 'Default avatar' })
    ).toBeChecked()
  })
})
