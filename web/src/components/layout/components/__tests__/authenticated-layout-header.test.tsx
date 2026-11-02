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
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthenticatedLayout } from '../authenticated-layout'

vi.mock('@/components/config-drawer', () => ({ ConfigDrawer: () => null }))
vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => null,
}))
vi.mock('@/components/notification-popover', () => ({
  NotificationPopover: () => null,
}))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => null,
}))
vi.mock('@/components/search', () => ({
  Search: () => <div>Global search</div>,
}))
vi.mock('@/components/command-menu', () => ({ CommandMenu: () => null }))
vi.mock('@/features/system-update/system-update-action', () => ({
  SystemUpdateAction: () => null,
}))
vi.mock('@/components/layout/components/app-sidebar', () => ({
  AppSidebar: () => null,
}))
vi.mock('@/components/layout/components/system-brand', () => ({
  SystemBrand: () => <div>Brand</div>,
}))
vi.mock('@/components/layout/components/top-nav', () => ({
  TopNav: () => null,
}))
vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    popoverOpen: false,
    setPopoverOpen: vi.fn(),
    unreadCount: 0,
    activeTab: 'notice',
    setActiveTab: vi.fn(),
    notice: '',
    announcements: [],
    loading: false,
  }),
}))
vi.mock('@/hooks/use-top-nav-links', () => ({ useTopNavLinks: () => [] }))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ auth: { user: { id: 1, username: 'user', role: 1 } } }),
}))

afterEach(() => {
  document.cookie = 'sidebar_state=; max-age=0; path=/'
})

describe('authenticated layout header', () => {
  it('renders without the top bar search entry', () => {
    render(
      <AuthenticatedLayout>
        <div>Page content</div>
      </AuthenticatedLayout>
    )

    expect(screen.getByText('Brand')).toBeInTheDocument()
    expect(screen.queryByText('Global search')).not.toBeInTheDocument()
  })
})
