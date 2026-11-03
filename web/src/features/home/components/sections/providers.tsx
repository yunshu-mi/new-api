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

import seedanceIcon from '@/assets/brand-icons/seedance.ico'
import { AnimateInView } from '@/components/animate-in-view'
import { ProviderBadge } from '@/components/provider-badge'

const PROVIDERS = [
  { name: 'DeepSeek', icon: 'DeepSeek.Color' },
  { name: 'Zhipu', icon: 'Zhipu.Color' },
  { name: 'Kimi', icon: 'Moonshot' },
  { name: 'GPT', icon: 'OpenAI' },
  { name: 'Claude', icon: 'Claude.Color' },
  { name: 'Gemini', icon: 'Gemini.Color' },
  { name: 'Seedance', icon: null },
  { name: 'MiniMax', icon: 'Minimax.Color' },
]

export function Providers() {
  const { t } = useTranslation()
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className='relative z-10 px-6 py-8 lg:py-12'
    >
      <AnimateInView className='mx-auto max-w-6xl'>
        <h2
          id={headingId}
          className='text-muted-foreground text-center text-sm font-medium'
        >
          {t('Supported AI Providers')}
        </h2>
        <ul className='mx-auto mt-6 grid w-fit grid-cols-4 gap-3 sm:flex sm:w-full sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 md:gap-6 lg:gap-8'>
          {PROVIDERS.map((provider) => (
            <li
              key={provider.name}
              aria-label={provider.name}
              title={provider.name}
              className='border-border bg-card text-foreground flex size-9.5 items-center justify-center rounded-2xl border'
            >
              <ProviderBadge
                iconKey={provider.icon}
                iconNode={
                  provider.name === 'Seedance' ? (
                    <img
                      src={seedanceIcon}
                      alt=''
                      aria-hidden='true'
                      className='size-[22px] object-contain'
                    />
                  ) : undefined
                }
                iconSize={22}
                label={provider.name}
                colorText={false}
                copyable={false}
                showLabel={false}
              />
            </li>
          ))}
        </ul>
      </AnimateInView>
    </section>
  )
}
