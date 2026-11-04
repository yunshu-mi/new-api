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
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { PublicHeader } from '../public-header'

const initialConfig = useSystemConfigStore.getState()
const initialAuth = useAuthStore.getState()
let queryClient: QueryClient

afterEach(() => {
  queryClient?.clear()
  useSystemConfigStore.setState(initialConfig)
  useAuthStore.setState(initialAuth)
  localStorage.clear()
  vi.restoreAllMocks()
})

async function renderPublicHeader(
  registrationStatus: {
    register_enabled?: boolean
    self_use_mode_enabled?: boolean
  } = {}
) {
  useAuthStore.getState().auth.setUser(null)
  useSystemConfigStore.getState().setLoading(false)
  queryClient = new QueryClient()
  queryClient.setQueryData(['status'], {
    HeaderNavModules: {
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      docs: false,
      about: false,
    },
    ...registrationStatus,
  })
  queryClient.setQueryData(['notice'], { success: true, data: '' })
  const route = createRootRoute({
    component: () => (
      <PublicHeader
        showThemeSwitch={false}
        showLanguageSwitcher={false}
        showNotifications={false}
      />
    ),
  })
  const router = createRouter({
    routeTree: route,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

it('keeps the floating header aligned with the home content when scrolling down and back to the top', async () => {
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)
  await renderPublicHeader()

  const header = await screen.findByRole('banner')
  const nav = within(header).getByRole('navigation')
  const container = nav.parentElement

  for (const scrollY of [0, 300, 0]) {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(scrollY)
    act(() => {
      fireEvent.scroll(window)
    })
    expect(header).toHaveClass('fixed', 'inset-x-0', 'top-0')
    expect(container).toHaveClass('mx-auto', 'max-w-6xl', 'px-6', 'pt-3')
    expect(nav).toHaveClass('h-9', 'rounded-2xl', 'backdrop-blur-sm')
    expect(
      within(nav).getByRole('button', { name: 'Sign in / Sign up' })
    ).toHaveClass('h-6.5', 'px-2')
  }
})

it.each([
  { reducedMotion: false, behavior: 'smooth' },
  { reducedMotion: true, behavior: 'instant' },
])(
  'returns to the top with $behavior scrolling when the logo is clicked on the home page',
  async ({ reducedMotion, behavior }) => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      ...window.matchMedia('(prefers-reduced-motion: reduce)'),
      matches: reducedMotion,
    })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    await renderPublicHeader()
    const logoLink = within(await screen.findByRole('banner')).getByRole(
      'link',
      {
        name: `logo ${initialConfig.config.systemName}`,
      }
    )

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(300)
    scrollTo.mockClear()
    fireEvent.click(logoLink)

    expect(logoLink).toHaveAttribute('href', '/')
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior })
  }
)

it('shows Home and Console in both public menus only after sign-in', async () => {
  await renderPublicHeader()
  const header = await screen.findByRole('banner')
  fireEvent.click(
    within(header).getByRole('button', { name: 'Toggle navigation menu' })
  )

  const modelSquareLinks = screen.getAllByRole('link', { name: 'Model Square' })
  expect(modelSquareLinks).toHaveLength(2)
  for (const link of modelSquareLinks) {
    expect(link).toHaveAttribute('href', '/pricing')
  }
  expect(screen.queryAllByRole('link', { name: 'Home' })).toHaveLength(0)
  expect(screen.queryAllByRole('link', { name: 'Console' })).toHaveLength(0)

  act(() => {
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'user',
      role: ROLE.USER,
    })
  })

  const homeLinks = screen.queryAllByRole('link', { name: 'Home' })
  const consoleLinks = screen.queryAllByRole('link', { name: 'Console' })
  expect(homeLinks).toHaveLength(2)
  expect(consoleLinks).toHaveLength(2)
  for (const link of homeLinks) expect(link).toHaveAttribute('href', '/')
  for (const link of consoleLinks) {
    expect(link).toHaveAttribute('href', '/dashboard')
  }
})

it('matches the desktop sign-in colors when the mobile menu opens', async () => {
  await renderPublicHeader()
  const header = await screen.findByRole('banner')
  const desktopSignIn = within(header).getByRole('button', {
    name: 'Sign in / Sign up',
  })
  fireEvent.click(
    within(header).getByRole('button', { name: 'Toggle navigation menu' })
  )

  const mobileSignIn = screen.getByRole('link', { name: 'Sign in / Sign up' })
  const signInColors = ['bg-[#526FDB]', 'text-white', '[a]:hover:bg-[#4667CC]']
  expect(desktopSignIn).toHaveClass(...signInColors)
  expect(mobileSignIn).toHaveClass(...signInColors)
})

it('labels the single sign-in entry with both actions when registration is enabled', async () => {
  await renderPublicHeader({ register_enabled: true })
  const header = await screen.findByRole('banner')

  expect(
    within(header).getByRole('button', { name: 'Sign in / Sign up' })
  ).toHaveAttribute('href', '/sign-in')

  fireEvent.click(
    within(header).getByRole('button', { name: 'Toggle navigation menu' })
  )

  expect(
    screen.getByRole('link', { name: 'Sign in / Sign up' })
  ).toHaveAttribute('href', '/sign-in')
  expect(
    screen.queryByRole('link', { name: 'Sign up' })
  ).not.toBeInTheDocument()
})

it.each([
  ['registration is disabled', { register_enabled: false }],
  [
    'self-use mode is enabled',
    { register_enabled: true, self_use_mode_enabled: true },
  ],
] as const)(
  'offers sign-in without registration when %s',
  async (_, status) => {
    await renderPublicHeader(status)
    const header = await screen.findByRole('banner')
    expect(
      within(header).getByRole('button', { name: 'Sign in' })
    ).toHaveAttribute('href', '/sign-in')

    fireEvent.click(
      within(header).getByRole('button', { name: 'Toggle navigation menu' })
    )

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in'
    )
    expect(
      screen.queryByRole('link', { name: 'Sign in / Sign up' })
    ).not.toBeInTheDocument()
  }
)
