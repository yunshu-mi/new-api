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
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, expect, test } from 'vitest'

import { LanguageSwitcher } from '../language-switcher'

afterEach(async () => {
  await act(() => i18next.changeLanguage('en'))
})

test('offers only Simplified Chinese and English in the language menu', async () => {
  const user = userEvent.setup()
  render(<LanguageSwitcher />)

  await user.click(screen.getByRole('button', { name: 'Change language' }))

  expect(
    screen.getAllByRole('menuitem').map((item) => item.textContent)
  ).toEqual(['简体中文', 'English'])
})

test('switches between the two remaining interface languages', async () => {
  const user = userEvent.setup()
  render(<LanguageSwitcher />)

  await user.click(screen.getByRole('button', { name: 'Change language' }))
  await user.click(screen.getByRole('menuitem', { name: '简体中文' }))
  expect(i18next.language).toBe('zhCN')

  await user.click(screen.getByRole('button', { name: 'Change language' }))
  await user.click(screen.getByRole('menuitem', { name: 'English' }))
  expect(i18next.language).toBe('en')
})
