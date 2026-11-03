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

import { AnimateInView } from '@/components/animate-in-view'
import { getLobeIcon } from '@/lib/lobe-icon'

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
    { name: t('StepFun'), icon: 'Stepfun.Color' },
    { name: 'Meta Llama', icon: 'Meta.Color' },
  ]

  return (
    <section
      aria-labelledby={headingId}
      className='relative z-10 mx-auto w-full max-w-6xl px-6 py-12 md:py-16'
    >
      <AnimateInView className='mb-10 max-w-2xl'>
        <span className='font-mono text-[13px] font-medium text-[#3D5BFF]'>
          {t('02 · Model marketplace')}
        </span>
        <h2
          id={headingId}
          className='mt-3 text-3xl leading-tight font-bold tracking-tight text-[#0F131A] md:text-4xl'
        >
          {t('One account, the whole model ecosystem')}
        </h2>
        <p className='mt-4 text-base leading-7 text-[#5A6370]'>
          {t(
            "Covering the world's leading model providers, continuously updated - connect once, use any."
          )}
        </p>
      </AnimateInView>

      <ul className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'>
        {providers.map((provider, index) => (
          <AnimateInView
            as='li'
            key={provider.name}
            delay={index * 50}
            animation='fade-up'
          >
            <div className='flex h-full flex-col items-center gap-3 rounded-2xl border border-[#E6E9F0] bg-white px-5 py-7'>
              <span className='flex size-10 items-center justify-center'>
                {getLobeIcon(provider.icon, 40)}
              </span>
              <span className='text-sm font-semibold text-[#3A434F]'>
                {provider.name}
              </span>
            </div>
          </AnimateInView>
        ))}
      </ul>
    </section>
  )
}
