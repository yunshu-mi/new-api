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
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { UsageLogsProvider } from '../usage-logs-provider'
import { UsageLogsTable } from '../usage-logs-table'

afterEach(cleanup)

it.each([
  [
    'common',
    'example-model',
    {
      id: 1,
      created_at: 1788840000,
      type: 2,
      model_name: 'example-model',
      content: '',
      other: '',
    },
  ],
  [
    'task',
    'task-1',
    { id: 1, task_id: 'task-1', submit_time: 1788840000, status: 'SUBMITTED' },
  ],
  [
    'drawing',
    'draw-1',
    { id: 1, mj_id: 'draw-1', submit_time: 1788840000000, action: 'IMAGINE' },
  ],
] as const)(
  'uses a neutral hover background only on data rows in the %s log table',
  async (logCategory, cellText, record) => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: { items: [record], total: 1 } },
    })
    const root = createRootRoute()
    const auth = createRoute({
      getParentRoute: () => root,
      id: '_authenticated',
    })
    const logs = createRoute({
      getParentRoute: () => auth,
      path: '/usage-logs/$section',
      component: () => <UsageLogsTable logCategory={logCategory} />,
    })
    const router = createRouter({
      routeTree: root.addChildren([auth.addChildren([logs])]),
      history: createMemoryHistory({
        initialEntries: [`/usage-logs/${logCategory}`],
      }),
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <UsageLogsProvider>
          <RouterProvider router={router} />
        </UsageLogsProvider>
      </QueryClientProvider>
    )

    const cell = await screen.findByRole('cell', { name: new RegExp(cellText) })
    expect(cell.closest('tr')).toHaveClass(
      'hover:[background-color:var(--table-row-hover)]'
    )
    const table = screen.getByRole<HTMLTableElement>('table')
    expect(table.tHead).toHaveClass('sticky', '[&_tr:hover]:bg-transparent')
  }
)
