import { readFileSync } from 'node:fs'
import path from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from 'sonner'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ThemeProvider } from '@/context/theme-provider'
import type { SystemStatus } from '@/features/auth/types'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { THEME_STORAGE_KEYS } from '@/lib/theme-storage'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { SignIn } from '..'

const initialSystemConfig = useSystemConfigStore.getState()

function renderSignIn(status: SystemStatus = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(STATUS_QUERY_KEY, status)
  const root = createRootRoute({ component: Outlet })
  const auth = createRoute({
    getParentRoute: () => root,
    id: '(auth)',
    component: Outlet,
  })
  const signIn = createRoute({
    getParentRoute: () => auth,
    path: '/sign-in',
    validateSearch: () => ({ redirect: '/pricing' }),
    component: SignIn,
  })
  const router = createRouter({
    routeTree: root.addChildren([
      auth.addChildren([signIn]),
      createRoute({
        getParentRoute: () => root,
        path: '/otp',
        component: () => <p>Verification required</p>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/pricing',
        component: () => <h1>Pricing</h1>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/user-agreement',
        component: () => <h1>User Agreement</h1>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/privacy-policy',
        component: () => <h1>Privacy Policy</h1>,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/sign-in'] }),
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
  return { router, client }
}

beforeEach(() => {
  useAuthStore.getState().auth.reset('idle')
  useSystemConfigStore.getState().setLoading(false)
  useSystemConfigStore
    .getState()
    .setConfig({ systemName: 'Example gateway', logo: '/logo.png' })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useAuthStore.getState().auth.reset('idle')
  useSystemConfigStore.setState(initialSystemConfig)
  document.documentElement.classList.remove('light', 'dark')
  localStorage.clear()
})

it('uses the light theme and logos on sign-in, then restores the saved dark theme on departure', async () => {
  localStorage.setItem(THEME_STORAGE_KEYS.mode, 'dark')
  useSystemConfigStore.getState().setConfig({
    logo: '/light-logo.png',
    logoDark: '/dark-logo.png',
  })
  const { router } = renderSignIn()

  const logos = await screen.findAllByRole('img', { name: 'Logo' })
  expect(logos).toHaveLength(2)
  await waitFor(() => {
    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement).not.toHaveClass('dark')
    for (const logo of logos) {
      expect(logo).toHaveAttribute('src', '/light-logo.png')
    }
  })
  expect(localStorage.getItem(THEME_STORAGE_KEYS.mode)).toBe('dark')

  await act(() => router.navigate({ to: '/pricing' }))
  expect(await screen.findByRole('heading', { name: 'Pricing' })).toBeVisible()
  expect(document.documentElement).toHaveClass('dark')
  expect(document.documentElement).not.toHaveClass('light')
})

it('keeps accessible input labels and password visibility controls in the redesigned card', async () => {
  renderSignIn()
  const user = userEvent.setup()
  const username =
    await screen.findByLabelText<HTMLInputElement>('Username or Email')
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Welcome back'
  )
  const password = screen.getByLabelText<HTMLInputElement>('Password')
  for (const input of [username, password]) {
    expect(input.labels?.[0]).not.toHaveClass('sr-only')
  }
  expect(username).toHaveAttribute('autoComplete', 'username')
  expect(password).toHaveAttribute('autoComplete', 'current-password')
  expect(username).toHaveAttribute('placeholder', 'Username or Email')
  expect(password).toHaveAttribute('type', 'password')
  expect(
    screen.getByRole('link', { name: 'Forgot password?' })
  ).toHaveAttribute('href', '/forgot-password')
  await user.type(username, 'example-user')
  await user.click(password)
  await user.paste('example-password')
  await user.click(
    screen.getByRole('button', { name: 'Toggle password visibility' })
  )
  expect(password).toHaveAttribute('type', 'text')
  expect(password).toHaveValue('example-password')
  await user.click(
    screen.getByRole('button', { name: 'Toggle password visibility' })
  )
  expect(password).toHaveAttribute('type', 'password')
})

it.each([
  [{}, true],
  [{ register_enabled: false }, false],
  [{ self_use_mode_enabled: true }, false],
] as const)(
  'preserves the registration visibility for configuration %j',
  async (status, visible) => {
    renderSignIn(status)
    await screen.findByRole('button', { name: 'Sign in' })
    if (visible) {
      expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
        'href',
        '/sign-up'
      )
    } else {
      expect(
        screen.queryByRole('link', { name: 'Sign up' })
      ).not.toBeInTheDocument()
    }
  }
)

it('shows configured alternative methods when password login is disabled', async () => {
  renderSignIn({ password_login_enabled: false, passkey_login: true })
  expect(
    await screen.findByRole('button', { name: 'Sign in with Passkey' })
  ).toBeDisabled()
  expect(screen.queryByLabelText('Username or Email')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
})

it('keeps validation errors linked to the inputs when an empty form is submitted', async () => {
  const post = vi.spyOn(api, 'post')
  renderSignIn()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Sign in' }))
  expect(
    await screen.findByText('Please enter your username or email')
  ).toBeVisible()
  expect(screen.getByLabelText('Username or Email')).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  expect(screen.getByLabelText('Password')).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  expect(post).not.toHaveBeenCalled()
})

it('retains legal consent, loading protection and verification redirects when submitting from the card', async () => {
  let complete!: (value: unknown) => void
  const pending = new Promise((resolve) => {
    complete = resolve
  })
  const post = vi.spyOn(api, 'post').mockReturnValue(pending)
  renderSignIn({
    user_agreement_enabled: true,
    privacy_policy_enabled: true,
  })
  const user = userEvent.setup()
  await user.type(
    await screen.findByLabelText('Username or Email'),
    'example-user'
  )
  await user.type(screen.getByLabelText('Password'), 'example-password')
  const submit = screen.getByRole('button', { name: 'Sign in' })
  expect(screen.getAllByRole('link', { name: 'User Agreement' })).toHaveLength(
    1
  )
  expect(screen.getAllByRole('link', { name: 'Privacy Policy' })).toHaveLength(
    1
  )
  await user.click(submit)
  expect(post).not.toHaveBeenCalled()
  await user.click(screen.getByRole('checkbox'))
  await user.click(submit)
  expect(submit).toBeDisabled()
  expect(post).toHaveBeenCalledWith(
    '/api/user/login?turnstile=',
    {
      username: 'example-user',
      password: 'example-password',
    },
    { skipAuthRefresh: true }
  )
  await act(async () => {
    complete({
      data: {
        success: true,
        data: {
          require_verification: true,
          flow_token: 'test-login-flow',
          expires_at: Math.floor(Date.now() / 1000) + 300,
          methods: [{ method: '2fa', available: true }],
        },
      },
    })
    await pending
  })
  expect(await screen.findByText('Verification required')).toBeVisible()
  expect(useAuthStore.getState().auth.user).toBeNull()
  expect(
    useAuthStore.getState().auth.pendingLoginVerification?.redirectTo
  ).toBe('/pricing')
})

it.each(['User Agreement', 'Privacy Policy'])(
  'opens %s in the current tab and returns to sign-in through browser history',
  async (name) => {
    const { router } = renderSignIn({
      user_agreement_enabled: true,
      privacy_policy_enabled: true,
    })
    const user = userEvent.setup()
    const link = await screen.findByRole('link', { name })
    expect(link).not.toHaveAttribute('target', '_blank')
    await user.click(link)
    expect(await screen.findByRole('heading', { name })).toBeVisible()
    act(() => router.history.back())
    expect(await screen.findByLabelText('Username or Email')).toBeVisible()
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  }
)

it('restores the submit button after a failed login without applying authentication', async () => {
  const post = vi
    .spyOn(api, 'post')
    .mockResolvedValue({ data: { success: false, message: 'Login failed' } })
  renderSignIn()
  const user = userEvent.setup()
  await user.type(
    await screen.findByLabelText('Username or Email'),
    'example-user'
  )
  await user.type(screen.getByLabelText('Password'), 'example-password')
  const submit = screen.getByRole('button', { name: 'Sign in' })
  await user.click(submit)
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(submit).toBeEnabled())
  expect(useAuthStore.getState().auth.user).toBeNull()
  expect(screen.getByLabelText('Password')).toHaveValue('example-password')
})

it('dismisses the welcome notification shortly after successful sign-in', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({
    data: {
      success: true,
      data: {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        access_expires_at: 1_900_000_000,
        user: { id: 1, username: 'example-user', role: 1 },
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
      },
    },
  })
  renderSignIn()
  const user = userEvent.setup()
  await user.type(
    await screen.findByLabelText('Username or Email'),
    'example-user'
  )
  await user.type(screen.getByLabelText('Password'), 'example-password')
  vi.useFakeTimers()
  try {
    render(<Toaster duration={5000} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    })
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(screen.getByText('Welcome back!')).toBeVisible()
    await act(() => vi.advanceTimersByTimeAsync(1250))
    expect(screen.queryByText('Welcome back!')).not.toBeInTheDocument()
  } finally {
    vi.useRealTimers()
  }
})

it('keeps the shared auth card compact and switches to one column below the desktop breakpoint', () => {
  const stylesheet = new CSSStyleSheet()
  stylesheet.replaceSync(
    readFileSync(path.resolve('src/styles/sign-in.css'), 'utf8')
  )
  const rules = [...stylesheet.cssRules]
  const page = rules.find(
    (rule) =>
      rule instanceof CSSStyleRule && rule.selectorText === '.sign-in-page'
  ) as CSSStyleRule
  const content = rules.find(
    (rule) =>
      rule instanceof CSSStyleRule && rule.selectorText === '.sign-in-content'
  ) as CSSStyleRule
  expect(page.style.getPropertyValue('min-height')).toBe('100svh')
  expect(page.style.getPropertyValue('height')).toBe('')
  expect(content.style.getPropertyValue('grid-template-columns')).toBe(
    'minmax(0, 1fr) minmax(0, 400px)'
  )
  const card = rules.find(
    (rule) =>
      rule instanceof CSSStyleRule && rule.selectorText === '.sign-in-card'
  ) as CSSStyleRule
  expect(card.style.getPropertyValue('padding')).toBe('24px')
  for (const [selector, property, value] of [
    ['.sign-in-card-content', 'gap', '16px'],
    ['.sign-in-form', 'gap', '12px'],
    [".sign-in-form [data-slot='form-item']", 'gap', '6px'],
    ['.sign-in-heading h1', 'font-size', '24px'],
    ['.sign-in-form .sign-in-input-wrap input', 'height', '40px'],
    ['.sign-in-form .sign-in-submit', 'height', '40px'],
  ]) {
    const rule = rules.find(
      (rule) => rule instanceof CSSStyleRule && rule.selectorText === selector
    ) as CSSStyleRule | undefined
    expect(rule?.style.getPropertyValue(property), selector).toBe(value)
  }
  const cardBrand = rules.find(
    (rule) =>
      rule instanceof CSSStyleRule &&
      rule.selectorText === '.sign-in-card-brand'
  ) as CSSStyleRule
  expect(cardBrand.style.getPropertyValue('display')).toBe('none')
  const mobile = rules.find(
    (rule) =>
      rule instanceof CSSMediaRule &&
      rule.conditionText === '(max-width: 1023px)'
  ) as CSSMediaRule
  const mobileRules = [...mobile.cssRules] as CSSStyleRule[]
  expect(
    mobileRules
      .find((rule) => rule.selectorText === '.sign-in-content')
      ?.style.getPropertyValue('max-width')
  ).toBe('400px')
  expect(
    mobileRules
      .find((rule) => rule.selectorText === '.sign-in-content')
      ?.style.getPropertyValue('grid-template-columns')
  ).toBe('minmax(0, 1fr)')
  expect(
    mobileRules
      .find((rule) => rule.selectorText === '.sign-in-intro')
      ?.style.getPropertyValue('display')
  ).toBe('none')
  expect(
    mobileRules
      .find((rule) => rule.selectorText === '.sign-in-card-brand')
      ?.style.getPropertyValue('display')
  ).toBe('flex')
})
