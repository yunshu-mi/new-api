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
import { afterEach, expect, it } from 'vitest'

import { PageHeaderContext } from '../page-header'
import { SectionPageLayout } from '../section-page-layout'

afterEach(() => {
  document.querySelector('[data-test-header]')?.remove()
})

it.each(['start', 'end', undefined] as const)(
  'aligns actions to %s when the page title is in the shared header',
  (alignment) => {
    const header = document.createElement('div')
    header.dataset.testHeader = ''
    document.body.append(header)

    render(
      <PageHeaderContext.Provider value={header}>
        <SectionPageLayout
          actionsAlignment={alignment}
          headerDescription='Page description'
        >
          <SectionPageLayout.Title>Logs</SectionPageLayout.Title>
          <SectionPageLayout.Actions>
            <button type='button'>View scope</button>
          </SectionPageLayout.Actions>
          <SectionPageLayout.Content>Log records</SectionPageLayout.Content>
        </SectionPageLayout>
      </PageHeaderContext.Provider>
    )

    expect(header).toHaveTextContent('Logs')
    const actions = screen.getByRole('button', {
      name: 'View scope',
    }).parentElement
    expect(actions).toHaveClass('flex-wrap', 'max-w-full')
    if (alignment === 'start') {
      expect(actions).toHaveClass('justify-start')
      expect(actions).not.toHaveClass('ms-auto', 'justify-end')
    } else {
      expect(actions).toHaveClass('ms-auto', 'justify-end')
    }
  }
)
