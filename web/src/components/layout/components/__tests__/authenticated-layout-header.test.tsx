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
import { afterEach, assert, describe, expect, it, vi } from 'vitest'

import { DirectionProvider } from '@/context/direction-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { THEME_STORAGE_KEYS } from '@/lib/theme-storage'

import { AuthenticatedLayout } from '../authenticated-layout'
import { SectionPageLayout } from '../section-page-layout'

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
vi.mock('@/hooks/use-sidebar-view', () => ({
  useSidebarView: () => ({ key: 'root', navGroups: [] }),
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
  document.cookie = 'layout_collapsible=; max-age=0; path=/'
  localStorage.clear()
  document.documentElement.classList.remove('light', 'dark')
  vi.unstubAllGlobals()
})

function TestAppearanceProviders(props: { children: React.ReactNode }) {
  return (
    <DirectionProvider>
      <ThemeProvider>{props.children}</ThemeProvider>
    </DirectionProvider>
  )
}

describe('authenticated layout header', () => {
  it.each([1440, 390])(
    'moves opted-in titles into the top bar at width %s and clears them when leaving',
    (width) => {
      vi.stubGlobal('innerWidth', width)
      const client = new QueryClient()
      client.setQueryData(['status'], {})
      const { rerender } = render(
        <QueryClientProvider client={client}>
          <AuthenticatedLayout>
            <SectionPageLayout headerDescription='Manage API keys and access tokens'>
              <SectionPageLayout.Title>API Keys</SectionPageLayout.Title>
              <SectionPageLayout.Actions>
                <button type='button'>Page action</button>
              </SectionPageLayout.Actions>
              <SectionPageLayout.Content>Key list</SectionPageLayout.Content>
            </SectionPageLayout>
          </AuthenticatedLayout>
        </QueryClientProvider>,
        { wrapper: TestAppearanceProviders }
      )

      const header = within(screen.getByRole('banner'))
      expect(
        header.getByRole('heading', { name: 'API Keys', level: 1 })
      ).toHaveClass('truncate', 'text-sm', 'leading-5', 'font-semibold')
      expect(header.getByText('Manage API keys and access tokens')).toHaveClass(
        'truncate'
      )
      expect(screen.getAllByRole('heading', { name: 'API Keys' })).toHaveLength(
        1
      )
      expect(
        header.queryByRole('button', { name: 'Page action' })
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page action' })).toBeVisible()
      expect(screen.getByText('Key list')).toBeVisible()

      rerender(
        <QueryClientProvider client={client}>
          <AuthenticatedLayout>
            <SectionPageLayout>
              <SectionPageLayout.Title>Channels</SectionPageLayout.Title>
              <SectionPageLayout.Content>
                Channel list
              </SectionPageLayout.Content>
            </SectionPageLayout>
          </AuthenticatedLayout>
        </QueryClientProvider>
      )
      expect(header.queryByRole('heading')).not.toBeInTheDocument()
      expect(
        screen.queryByText('Manage API keys and access tokens')
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Channels', level: 2 })
      ).toBeVisible()
      client.clear()
    }
  )

  it.each(['Common Logs', 'Task Logs', 'Audit Logs'])(
    'does not reserve a blank action row above %s when scope controls are hidden',
    (title) => {
      const client = new QueryClient()
      client.setQueryData(['status'], {})
      render(
        <QueryClientProvider client={client}>
          <AuthenticatedLayout>
            <SectionPageLayout headerDescription='Log details' fixedContent>
              <SectionPageLayout.Title>{title}</SectionPageLayout.Title>
              <SectionPageLayout.Actions>{false}</SectionPageLayout.Actions>
              <SectionPageLayout.Content>
                <div role='search'>Log filters</div>
              </SectionPageLayout.Content>
            </SectionPageLayout>
          </AuthenticatedLayout>
        </QueryClientProvider>,
        { wrapper: TestAppearanceProviders }
      )

      const content = screen.getByRole('search').parentElement
      expect(content?.previousElementSibling).toBeNull()
      expect(content).toHaveClass('pt-3', 'sm:pt-4')
      client.clear()
    }
  )

  it('keeps the page title in content when rendered outside the console', () => {
    render(
      <SectionPageLayout headerDescription='Manage API keys and access tokens'>
        <SectionPageLayout.Title>API Keys</SectionPageLayout.Title>
        <SectionPageLayout.Content>Key list</SectionPageLayout.Content>
      </SectionPageLayout>
    )
    expect(
      screen.getByRole('heading', { name: 'API Keys', level: 2 })
    ).toBeVisible()
  })

  it('places the sidebar logo in its own header beside the top bar', () => {
    vi.stubGlobal('innerWidth', 1440)
    const client = new QueryClient()
    client.setQueryData(['status'], {})
    const { container } = render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>Page content</AuthenticatedLayout>
      </QueryClientProvider>,
      { wrapper: TestAppearanceProviders }
    )

    const sidebar = container.querySelector<HTMLElement>(
      '[data-slot="sidebar"]'
    )
    assert(sidebar)
    expect(within(sidebar).getByText('Brand')).toBeInTheDocument()
    expect(screen.getByRole('banner').parentElement).toBe(sidebar.parentElement)
    expect(sidebar.parentElement).toHaveStyle('--sidebar-width: 240px')
    client.clear()
  })

  it('renders without the top bar search entry', () => {
    const client = new QueryClient()
    client.setQueryData(['status'], {})
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>
          <div>Page content</div>
        </AuthenticatedLayout>
      </QueryClientProvider>,
      { wrapper: TestAppearanceProviders }
    )

    const header = within(screen.getByRole('banner'))
    expect(header.queryByText('Global search')).not.toBeInTheDocument()
    client.clear()
  })

  it('makes the desktop inset panel fill the area below the top bar with square corners', () => {
    vi.stubGlobal('innerWidth', 1440)
    const client = new QueryClient()
    client.setQueryData(['status'], {})
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>Page content</AuthenticatedLayout>
      </QueryClientProvider>,
      { wrapper: TestAppearanceProviders }
    )

    expect(screen.getByRole('main')).toHaveClass(
      'h-[calc(100svh-var(--console-header-height))]',
      'md:peer-data-[variant=inset]:m-0',
      'md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0',
      'md:peer-data-[variant=inset]:rounded-none'
    )
    client.clear()
  })

  it('collapses and reopens the desktop sidebar from its footer', async () => {
    vi.stubGlobal('innerWidth', 1440)
    const client = new QueryClient()
    client.setQueryData(['status'], {})
    const { container } = render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>Page content</AuthenticatedLayout>
      </QueryClientProvider>,
      { wrapper: TestAppearanceProviders }
    )

    const sidebar = container.querySelector<HTMLElement>(
      '[data-slot="sidebar"]'
    )
    const footer = sidebar?.querySelector<HTMLElement>(
      '[data-slot="sidebar-footer"]'
    )
    assert(footer)
    expect(
      within(screen.getByRole('banner')).queryByRole('button', {
        name: 'Toggle Sidebar',
      })
    ).not.toBeInTheDocument()

    const toggle = within(footer).getByRole('button', {
      name: 'Collapse',
      expanded: true,
    })
    expect(within(toggle).getByText('Collapse')).toBeVisible()
    expect(toggle).toHaveClass(
      'w-full',
      'h-8',
      'text-xs',
      'hover:bg-muted',
      'aria-expanded:not-hover:bg-transparent'
    )
    const user = userEvent.setup()
    await user.click(toggle)
    const expand = within(footer).getByRole('button', {
      name: 'Expand',
      expanded: false,
    })
    expect(expand).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(
      within(footer).getByRole('button', { name: 'Collapse', expanded: true })
    ).toBeVisible()
    client.clear()
  })

  it('keeps an icon sidebar when collapsing from a saved offcanvas layout', async () => {
    vi.stubGlobal('innerWidth', 1440)
    document.cookie = 'layout_collapsible=offcanvas; path=/'
    const client = new QueryClient()
    client.setQueryData(['status'], {})
    const { container, unmount } = render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>Page content</AuthenticatedLayout>
      </QueryClientProvider>,
      { wrapper: TestAppearanceProviders }
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Collapse' }))
    const expand = screen.getByRole('button', { name: 'Expand' })
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      'data-collapsible',
      'icon'
    )
    expect(document.cookie).toContain('layout_collapsible=icon')
    expect(expand).not.toHaveClass('fixed')
    await user.click(expand)
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Collapse' }))
    unmount()
    const restored = render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>Page content</AuthenticatedLayout>
      </QueryClientProvider>,
      { wrapper: TestAppearanceProviders }
    )
    expect(
      restored.container.querySelector('[data-slot="sidebar"]')
    ).toHaveAttribute('data-collapsible', 'icon')
    expect(
      screen.getByRole('button', { name: 'Expand', expanded: false })
    ).toBeVisible()
    client.clear()
  })

  it.each(['expanded', 'collapsed', 'non-collapsible'])(
    'switches directly between light and dark from the footer when the sidebar is %s',
    async (state) => {
      vi.stubGlobal('innerWidth', 1440)
      if (state === 'collapsed') document.cookie = 'sidebar_state=false; path=/'
      if (state === 'non-collapsible') {
        document.cookie = 'layout_collapsible=none; path=/'
      }
      const client = new QueryClient()
      client.setQueryData(['status'], {})
      const { container } = render(
        <QueryClientProvider client={client}>
          <AuthenticatedLayout>Page content</AuthenticatedLayout>
        </QueryClientProvider>,
        { wrapper: TestAppearanceProviders }
      )

      expect(
        within(screen.getByRole('banner')).queryByRole('button', {
          name: 'Dark mode',
        })
      ).not.toBeInTheDocument()
      const footer = container.querySelector<HTMLElement>(
        '[data-slot="sidebar-footer"]'
      )
      assert(footer)
      const trigger = within(footer).getByRole('button', {
        name: 'Dark mode',
      })
      expect(trigger).toHaveTextContent('Dark mode')
      expect(trigger).toHaveClass(
        'text-muted-foreground',
        'h-8',
        'text-xs',
        '[&_svg]:size-3.5'
      )
      const divider = container.querySelector('[data-slot="sidebar-separator"]')
      expect(divider).toHaveClass(
        'mx-0',
        'shrink-0',
        'md:-mx-(--console-sidebar-padding)',
        'md:data-horizontal:w-[calc(100%+2*var(--console-sidebar-padding))]'
      )
      const user = userEvent.setup()
      await user.click(trigger)
      expect(document.documentElement).toHaveClass('dark')
      expect(localStorage.getItem(THEME_STORAGE_KEYS.mode)).toBe('dark')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      const lightMode = within(footer).getByRole('button', {
        name: 'Light mode',
      })
      expect(lightMode).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(document.documentElement).toHaveClass('light')
      expect(localStorage.getItem(THEME_STORAGE_KEYS.mode)).toBe('light')
      expect(
        within(footer).getByRole('button', { name: 'Dark mode' })
      ).toHaveFocus()
      client.clear()
    }
  )

  it('switches the theme with one tap while keeping the mobile sidebar open', async () => {
    vi.stubGlobal('innerWidth', 390)
    const client = new QueryClient()
    client.setQueryData(['status'], {})
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>Page content</AuthenticatedLayout>
      </QueryClientProvider>,
      { wrapper: TestAppearanceProviders }
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
    const sidebar = await screen.findByRole('dialog', { name: 'Sidebar' })
    const footer = sidebar.querySelector<HTMLElement>(
      '[data-slot="sidebar-footer"]'
    )
    assert(footer)
    const trigger = within(footer).getByRole('button', {
      name: 'Dark mode',
    })
    expect(trigger).not.toHaveClass('max-md:hidden')
    await user.click(trigger)
    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByRole('dialog', { name: 'Sidebar' })).toBeVisible()
    expect(
      screen.queryByRole('dialog', { name: 'Theme Settings' })
    ).not.toBeInTheDocument()
    await user.click(within(footer).getByRole('button', { name: 'Light mode' }))
    expect(document.documentElement).toHaveClass('light')
    client.clear()
  })

  it('switches to light on the first click when the saved system theme resolves to dark', async () => {
    vi.stubGlobal('innerWidth', 1440)
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches:
        query === '(prefers-color-scheme: dark)' || matchMedia(query).matches,
    }))
    const client = new QueryClient()
    client.setQueryData(['status'], {})
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>Page content</AuthenticatedLayout>
      </QueryClientProvider>,
      { wrapper: TestAppearanceProviders }
    )
    expect(document.documentElement).toHaveClass('dark')
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Light mode' }))
    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem(THEME_STORAGE_KEYS.mode)).toBe('light')
    client.clear()
  })
})
