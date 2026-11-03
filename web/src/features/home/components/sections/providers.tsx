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
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import seedanceLogo from '@/assets/brand-icons/seedance.ico'
import { getLobeIcon } from '@/lib/lobe-icon'

import { HOME_SECTION_CLASS_NAME } from '../../constants'

export function Providers() {
  const { t } = useTranslation()
  const headingId = useId()

  const providers = [
    { name: 'DeepSeek', icon: 'DeepSeek.Color' },
    { name: t('Zhipu GLM'), icon: 'Zhipu.Color' },
    { name: 'Kimi', icon: 'Moonshot' },
    { name: 'OpenAI', icon: 'OpenAI' },
    { name: 'Claude', icon: 'Claude.Color' },
    { name: 'Gemini', icon: 'Gemini.Color' },
    { name: 'Seedance', logo: seedanceLogo },
    { name: 'MiniMax', icon: 'Minimax.Color' },
  ]

  return (
    <section aria-labelledby={headingId} className={HOME_SECTION_CLASS_NAME}>
      <div className='mb-6 max-w-2xl'>
        <span className='font-sans text-[13px] font-medium text-[#3D5BFF]'>
          {t('02 · Model marketplace')}
        </span>
        <h2
          id={headingId}
          className='mt-2 text-[36px] leading-tight font-bold tracking-tight text-[#0F131A]'
        >
          {t('One account, the whole model ecosystem')}
        </h2>
        <p className='mt-3 text-[16px] leading-6 font-normal text-[#5A6370]'>
          {t(
            "Covering the world's leading model providers, continuously updated - connect once, use any."
          )}
        </p>
      </div>

      <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
        {providers.map((provider) => (
          <li key={provider.name}>
            <div className='flex h-full flex-col items-center gap-2 rounded-2xl border border-[#E6E9F0] bg-white px-4 py-5'>
              <span className='flex size-8 items-center justify-center'>
                {provider.logo ? (
                  <img
                    src={provider.logo}
                    alt=''
                    aria-hidden='true'
                    width={32}
                    height={32}
                    className='object-contain'
                  />
                ) : (
                  getLobeIcon(provider.icon, 32)
                )}
              </span>
              <span className='text-sm font-semibold text-[#3A434F]'>
                {provider.name}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
