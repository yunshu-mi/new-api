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
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import { DataTableView } from '../data-table-view'

const emptyRows: { name: string }[] = []
const rows = [{ name: 'Example key' }]
const columns = [{ accessorKey: 'name', header: 'Name' }]
const rowHoverBackground =
  'hover:[background-color:color-mix(in_oklch,var(--muted)_50%,var(--background))]'

function Fixture(props: {
  splitHeader: boolean
  customEmpty?: boolean
  populated?: boolean
}) {
  const table = useReactTable({
    data: props.populated ? rows : emptyRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <DataTableView
      table={table}
      splitHeader={props.splitHeader}
      emptyContent={props.customEmpty ? <span>No results</span> : undefined}
    />
  )
}

it.each([false, true])(
  'keeps the default empty row transparent on hover with splitHeader=%s',
  (splitHeader) => {
    render(<Fixture splitHeader={splitHeader} />)

    const row = screen.getByText('No Data').closest('tr')
    expect(row).toHaveClass('hover:[background-color:transparent]')
    expect(row).not.toHaveClass(rowHoverBackground)
  }
)

it.each([false, true])(
  'keeps a custom empty row transparent on hover with splitHeader=%s',
  (splitHeader) => {
    render(<Fixture splitHeader={splitHeader} customEmpty />)

    const row = screen.getByText('No results').closest('tr')
    expect(row).toHaveClass('hover:[background-color:transparent]')
    expect(row).not.toHaveClass(rowHoverBackground)
  }
)

it('preserves hover highlighting for populated data rows', () => {
  render(<Fixture splitHeader populated />)

  const row = screen.getByText('Example key').closest('tr')
  expect(row).toHaveClass(rowHoverBackground)
  expect(row).not.toHaveClass('hover:[background-color:transparent]')
})
