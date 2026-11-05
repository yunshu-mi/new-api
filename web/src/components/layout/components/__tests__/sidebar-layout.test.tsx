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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Activity, Settings } from 'lucide-react'
import { afterEach, expect, it } from 'vitest'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

import { NavGroup } from '../nav-group'
import { SystemBrand } from '../system-brand'

let client: QueryClient

afterEach(() => {
  client?.clear()
  document.cookie = 'sidebar_state=; max-age=0; path=/'
})

async function renderSidebar() {
  client = new QueryClient()
  client.setQueryData(['status'], {})
  const route = createRootRoute({
    component: () => (
      <SidebarProvider>
        <Sidebar collapsible='icon'>
          <SidebarHeader>
            <SystemBrand variant='inline' size='large' />
          </SidebarHeader>
          <SidebarContent>
            <NavGroup
              title='General'
              items={[
                { title: 'Overview', url: '/', icon: Activity },
                {
                  title: 'Settings',
                  icon: Settings,
                  items: [{ title: 'Profile', url: '/settings' }],
                },
              ]}
            />
          </SidebarContent>
          <SidebarTrigger />
        </Sidebar>
      </SidebarProvider>
    ),
  })
  const router = createRouter({
    routeTree: route,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

it('keeps the large logo at its expanded size after collapsing and reopening', async () => {
  await renderSidebar()
  const logoFrame = screen.getByRole('img', { name: 'Logo' }).parentElement
  expect(logoFrame).toHaveClass('size-8')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
  expect(logoFrame).toHaveClass('size-8')
  expect(logoFrame).not.toHaveClass('group-data-[collapsible=icon]:size-5')
  await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
  expect(logoFrame).toHaveClass('size-8')
})

it('centers collapsed links and submenu buttons without clipping their fixed width', async () => {
  const { container } = await renderSidebar()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))

  expect(container.querySelector('[data-slot="sidebar-group"]')).toHaveClass(
    'group-data-[collapsible=icon]:px-0'
  )
  for (const button of [
    screen.getByRole('link', { name: 'Overview' }),
    screen.getByRole('button', { name: 'Settings' }),
  ]) {
    expect(button).toHaveClass('group-data-[collapsible=icon]:mx-auto')
    expect(button).toHaveClass('group-data-[collapsible=icon]:size-8!')
  }
})
