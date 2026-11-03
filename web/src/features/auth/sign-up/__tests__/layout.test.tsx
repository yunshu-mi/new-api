import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { SystemStatus } from '@/features/auth/types'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { SignUp } from '..'

const initialSystemConfig = useSystemConfigStore.getState()

function renderSignUp(status: SystemStatus = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(STATUS_QUERY_KEY, status)
  const root = createRootRoute({ component: Outlet })
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({
        getParentRoute: () => root,
        path: '/sign-up',
        component: SignUp,
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/sign-in',
        component: () => <p>Sign-in destination</p>,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/sign-up'] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  useSystemConfigStore.getState().setLoading(false)
  useSystemConfigStore
    .getState()
    .setConfig({ systemName: 'Example gateway', logo: '/logo.png' })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useSystemConfigStore.setState(initialSystemConfig)
  localStorage.clear()
  delete window.turnstile
})

it('keeps labeled fields, independent password visibility and the sign-in link in the shared card', async () => {
  renderSignUp()
  const user = userEvent.setup()
  expect(await screen.findByLabelText('Username')).toBeVisible()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Create an account'
  )
  const password = screen.getByLabelText<HTMLInputElement>('Password')
  const confirmation =
    screen.getByLabelText<HTMLInputElement>('Confirm password')
  for (const input of [
    screen.getByLabelText<HTMLInputElement>('Username'),
    password,
    confirmation,
  ]) {
    expect(input.labels?.[0]).not.toHaveClass('sr-only')
  }
  expect(password).toHaveAttribute('autoComplete', 'new-password')
  expect(password).toHaveAccessibleDescription(
    'Enter password (8–128 characters)'
  )
  expect(confirmation).toHaveAttribute('autoComplete', 'new-password')
  expect(password).toHaveAttribute('type', 'password')
  expect(confirmation).toHaveAttribute('type', 'password')
  await user.click(password)
  await user.paste('example-password')
  await user.click(
    screen.getAllByRole('button', { name: 'Toggle password visibility' })[0]
  )
  expect(password).toHaveAttribute('type', 'text')
  expect(password).toHaveValue('example-password')
  expect(confirmation).toHaveAttribute('type', 'password')
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
    'href',
    '/sign-in'
  )
  expect(
    screen.queryByLabelText('Email (required for verification)')
  ).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument()
})

it('keeps password mismatch errors associated with confirmation and prevents submission', async () => {
  const post = vi.spyOn(api, 'post')
  renderSignUp()
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Username'), 'example-user')
  await user.type(screen.getByLabelText('Password'), 'example-password')
  await user.type(
    screen.getByLabelText('Confirm password'),
    'different-password'
  )
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  expect(await screen.findByText("Passwords don't match.")).toBeVisible()
  expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  expect(post).not.toHaveBeenCalled()
})

it('keeps registration pending until the response and redirects to sign-in after success', async () => {
  let complete!: (response: unknown) => void
  const pending = new Promise((resolve) => {
    complete = resolve
  })
  const post = vi.spyOn(api, 'post').mockReturnValue(pending)
  renderSignUp()
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Username'), 'example-user')
  await user.type(screen.getByLabelText('Password'), 'example-password')
  await user.type(screen.getByLabelText('Confirm password'), 'example-password')
  const submit = screen.getByRole('button', { name: 'Create account' })
  await user.click(submit)
  expect(submit).toBeDisabled()
  expect(post).toHaveBeenCalledWith(
    '/api/user/register',
    {
      username: 'example-user',
      password: 'example-password',
      email: undefined,
      verification_code: undefined,
      aff_code: '',
      turnstile: '',
    },
    { params: { turnstile: '' } }
  )
  await act(async () => {
    complete({ data: { success: true } })
    await pending
  })
  expect(await screen.findByText('Sign-in destination')).toBeVisible()
})

it('sends verification email and keeps resend disabled during the countdown', async () => {
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true } })
  renderSignUp({ email_verification: true })
  const user = userEvent.setup()
  const email = await screen.findByLabelText<HTMLInputElement>(
    'Email (required for verification)'
  )
  expect(screen.getByRole('button', { name: 'Send code' })).toBeDisabled()
  expect(screen.getByLabelText('Verification code')).toBeVisible()
  expect(email.labels?.[0]).not.toHaveClass('sr-only')
  const code = screen.getByLabelText<HTMLInputElement>('Verification code')
  expect(code.labels?.[0]).not.toHaveClass('sr-only')
  expect(code).toHaveAttribute('autoComplete', 'one-time-code')
  await user.type(email, 'user@example.com')
  await user.click(screen.getByRole('button', { name: 'Send code' }))
  expect(get).toHaveBeenCalledWith('/api/verification', {
    params: { email: 'user@example.com', turnstile: '' },
  })
  expect(await screen.findByRole('button', { name: /Resend/ })).toBeDisabled()
})

it('requires the verification code when email verification is enabled and forwards it unchanged', async () => {
  const post = vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: false, message: 'Failed to create account' },
  })
  renderSignUp({ email_verification: true })
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Username'), 'example-user')
  await user.type(screen.getByLabelText('Password'), 'example-password')
  await user.type(screen.getByLabelText('Confirm password'), 'example-password')
  await user.type(
    screen.getByLabelText('Email (required for verification)'),
    'user@example.com'
  )
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  expect(post).not.toHaveBeenCalled()
  await user.type(screen.getByLabelText('Verification code'), '012345')
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  expect(post).toHaveBeenCalledWith(
    '/api/user/register',
    expect.objectContaining({
      email: 'user@example.com',
      verification_code: '012345',
    }),
    { params: { turnstile: '' } }
  )
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  )
  expect(screen.getByLabelText('Username')).toHaveValue('example-user')
})

it('keeps registration disabled until both the human check and legal consent are satisfied', async () => {
  let verify: ((token: string) => void) | undefined
  window.turnstile = {
    render: (_element, options) => {
      verify = options.callback as (token: string) => void
    },
  }
  renderSignUp({
    user_agreement_enabled: true,
    turnstile_check: true,
    turnstile_site_key: 'test-site',
  })
  const submit = await screen.findByRole('button', { name: 'Create account' })
  expect(submit).toBeDisabled()
  await waitFor(() => expect(verify).toBeDefined())
  act(() => verify?.('test-verification-token'))
  expect(submit).toBeDisabled()
  await userEvent.setup().click(screen.getByRole('checkbox'))
  expect(submit).toBeEnabled()
})

it.each([true, false])(
  'preserves OAuth registration visibility when enabled is %s',
  async (enabled) => {
    renderSignUp({ github_oauth: true, oauth_register_enabled: enabled })
    await screen.findByRole('button', { name: 'Create account' })
    if (enabled) {
      expect(
        screen.getByRole('button', { name: /Continue with GitHub/ })
      ).toBeVisible()
    } else {
      expect(
        screen.queryByRole('button', { name: /Continue with GitHub/ })
      ).not.toBeInTheDocument()
    }
  }
)
