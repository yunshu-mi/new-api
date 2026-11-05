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
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { toast, Toaster } from 'sonner'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { MobileDrawer } from '@/components/layout/components/mobile-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

function SignOutPage(props: { mobile: boolean }) {
  const [open, setOpen] = useState(true)
  const user = useAuthStore((state) => state.auth.user)
  if (!user) return <Outlet />

  return (
    <>
      <Outlet />
      {props.mobile ? (
        <MobileDrawer
          isOpen={open}
          onClose={() => setOpen(false)}
          homeUrl='/'
          displayLogo={null}
          displaySiteName='Test'
          loading={false}
          logoLoaded
          mobileLinksList={[]}
          showAuthButtons
          user={user}
        />
      ) : (
        <ProfileDropdown />
      )}
    </>
  )
}

async function renderSignOut(path: string, mobile: boolean) {
  useAuthStore.getState().auth.setBundle({
    access_token: 'test-access-token',
    token_type: 'Bearer',
    access_expires_at: 1_900_000_000,
    user: { id: 1, username: 'alice', role: 1 },
    session: {
      sid: 'test-session',
      current: true,
      login_method: 'password',
      ip: '127.0.0.1',
      user_agent: 'test',
      created_at: 1,
      last_active_at: 1,
      expires_at: 1_900_000_000,
    },
  })
  const queryClient = new QueryClient()
  queryClient.setQueryData(STATUS_QUERY_KEY, {})
  queryClient.setQueryData(['private-account'], { username: 'alice' })
  const rootRoute = createRootRoute({
    component: () => <SignOutPage mobile={mobile} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => <h1>Home</h1>,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/dashboard',
        component: () => <h1>Dashboard</h1>,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/sign-in',
        component: () => <h1>Sign in</h1>,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  if (!mobile) {
    await userEvent.click(await screen.findByRole('button', { name: 'Profile' }))
  }
  return { router, queryClient }
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  window.localStorage.clear()
})

test('dismisses the confirmation shortly after successful sign-out', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true } })
  await renderSignOut('/dashboard', false)
  const signOut = await screen.findByRole('menuitem', { name: 'Sign out' })
  vi.useFakeTimers()
  try {
    render(<Toaster duration={5000} />)
    await act(async () => {
      fireEvent.click(signOut)
    })
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(screen.getByText('Signed out')).toBeVisible()
    await act(() => vi.advanceTimersByTimeAsync(1250))
    expect(screen.queryByText('Signed out')).not.toBeInTheDocument()
  } finally {
    vi.useRealTimers()
  }
})

test.each([
  { path: '/', mobile: false },
  { path: '/dashboard', mobile: false },
  { path: '/', mobile: true },
  { path: '/dashboard', mobile: true },
])(
  'one click signs out from $path (mobile: $mobile) and replaces the page with home',
  async ({ path, mobile }) => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: '' },
    })
    const { router, queryClient } = await renderSignOut(path, mobile)

    await userEvent.click(
      await screen.findByRole(mobile ? 'button' : 'menuitem', {
        name: 'Sign out',
      })
    )

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/')
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Home' })).toBeVisible()
    expect(router.history.length).toBe(1)
    expect(useAuthStore.getState().auth).toMatchObject({
      user: null,
      accessToken: null,
      session: null,
    })
    expect(queryClient.getQueryData(['private-account'])).toBeUndefined()
    expect(post).toHaveBeenCalledWith(
      '/api/user/auth/logout',
      undefined,
      expect.objectContaining({ headers: { 'X-Auth-Session': 'test-session' } })
    )
  }
)

test.each([
  { failure: 'unsuccessful response', mobile: false },
  { failure: 'network failure', mobile: false },
  { failure: 'unsuccessful response', mobile: true },
  { failure: 'network failure', mobile: true },
])(
  'sign out with $failure (mobile: $mobile) preserves the session and page and allows retry',
  async ({ failure, mobile }) => {
    const post = vi.spyOn(api, 'post')
    if (failure === 'network failure') {
      post.mockRejectedValue(new Error('Network unavailable'))
    } else {
      post.mockResolvedValue({
        data: { success: false, message: 'Not revoked' },
      })
    }
    const errorToast = vi.spyOn(toast, 'error')
    const { router, queryClient } = await renderSignOut('/dashboard', mobile)

    await userEvent.click(
      await screen.findByRole(mobile ? 'button' : 'menuitem', {
        name: 'Sign out',
      })
    )

    await waitFor(() => expect(errorToast).toHaveBeenCalled())
    expect(router.state.location.pathname).toBe('/dashboard')
    expect(useAuthStore.getState().auth.accessToken).toBe('test-access-token')
    expect(queryClient.getQueryData(['private-account'])).toEqual({
      username: 'alice',
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    post.mockResolvedValue({ data: { success: true, message: '' } })
    if (!mobile) {
      await userEvent.click(screen.getByRole('button', { name: 'Profile' }))
    }
    await userEvent.click(
      await screen.findByRole(mobile ? 'button' : 'menuitem', {
        name: 'Sign out',
      })
    )
    await waitFor(() => expect(useAuthStore.getState().auth.user).toBeNull())
  }
)

test.each([false, true])(
  'pending sign out (mobile: %s) disables the action and waits for server confirmation',
  async (mobile) => {
    let finishRequest!: () => void
    const request = new Promise<void>((resolve) => {
      finishRequest = resolve
    })
    const post = vi.spyOn(api, 'post').mockImplementation(async () => {
      await request
      return { data: { success: true, message: '' } }
    })
    const { router } = await renderSignOut('/dashboard', mobile)

    await userEvent.click(
      await screen.findByRole(mobile ? 'button' : 'menuitem', {
        name: 'Sign out',
      })
    )
    expect(post).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(useAuthStore.getState().auth.accessToken).toBe('test-access-token')
    expect(router.state.location.pathname).toBe('/dashboard')

    if (!mobile) {
      await userEvent.click(screen.getByRole('button', { name: 'Profile' }))
    }
    const signOut = await screen.findByRole(mobile ? 'button' : 'menuitem', {
      name: 'Sign out',
    })
    if (mobile) {
      expect(signOut).toBeDisabled()
    } else {
      expect(signOut).toHaveAttribute('aria-disabled', 'true')
    }
    await userEvent.click(signOut)
    expect(post).toHaveBeenCalledTimes(1)

    await act(async () => {
      finishRequest()
      await request
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(useAuthStore.getState().auth.user).toBeNull()
  }
)
