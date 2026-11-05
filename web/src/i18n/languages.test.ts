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
import { describe, expect, test } from 'vitest'

import {
  convertDetectedLanguage,
  normalizeInterfaceLanguage,
} from './languages'

describe('interface languages', () => {
  test.each(['fr', 'ru', 'ja', 'vi', 'zhTW', 'zh-TW'])(
    'falls back to English for a removed saved language: %s',
    (language) => {
      expect(normalizeInterfaceLanguage(language)).toBe('en')
    }
  )

  test.each(['en', 'zhCN'])(
    'preserves a supported saved language: %s',
    (language) => {
      expect(normalizeInterfaceLanguage(language)).toBe(language)
    }
  )

  test('loads only supported translations and falls back for removed languages', async () => {
    const { default: i18n, resources } = await import('./config')
    expect(Object.keys(resources).sort()).toEqual(['en', 'zhCN'])

    for (const language of ['fr', 'ru', 'ja', 'vi', 'zhTW']) {
      await i18n.changeLanguage(language)
      expect(i18n.resolvedLanguage).toBe('en')

      localStorage.setItem('i18nextLng', language)
      await i18n.changeLanguage()
      expect(i18n.resolvedLanguage).toBe('en')
      expect(localStorage.getItem('i18nextLng')).toBe('en')
    }

    await i18n.changeLanguage('zhCN')
    expect(i18n.resolvedLanguage).toBe('zhCN')
    await i18n.changeLanguage('en')
    expect(i18n.resolvedLanguage).toBe('en')
  })
})

describe('convertDetectedLanguage', () => {
  test('maps browser BCP-47 Chinese tags onto interface codes', () => {
    expect(convertDetectedLanguage('zh-TW')).toBe('zhTW')
    expect(convertDetectedLanguage('zh-HK')).toBe('zhTW')
    expect(convertDetectedLanguage('zh-MO')).toBe('zhTW')
    expect(convertDetectedLanguage('zh-Hant-TW')).toBe('zhTW')
    expect(convertDetectedLanguage('zh')).toBe('zhCN')
    expect(convertDetectedLanguage('zh-CN')).toBe('zhCN')
    expect(convertDetectedLanguage('zh-Hans')).toBe('zhCN')
  })

  test('keeps already-normalized interface codes stable (localStorage round-trip)', () => {
    // i18next caches `zhTW`/`zhCN` (the supportedLngs codes) to localStorage,
    // and the detector runs this converter on the cached value at every page
    // load — if `zhTW` does not survive the round-trip, a user who picked
    // Traditional Chinese is flipped to Simplified on the next load and the
    // cache is overwritten, making the flip permanent.
    expect(convertDetectedLanguage('zhTW')).toBe('zhTW')
    expect(convertDetectedLanguage('zhCN')).toBe('zhCN')
  })

  test('passes non-Chinese values through unchanged', () => {
    expect(convertDetectedLanguage('en')).toBe('en')
    expect(convertDetectedLanguage('fr-FR')).toBe('fr-FR')
    expect(convertDetectedLanguage('ja')).toBe('ja')
  })
})
