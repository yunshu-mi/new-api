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
import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

import { HeroTerminalDemo } from '../hero-terminal-demo'

interface HeroStat {
  value: string
  label: string
  accent?: boolean
}

const HERO_STATS: HeroStat[] = [
  { value: '20+', label: 'connected models' },
  { value: '99.99%', label: 'uptime' },
  { value: '<200ms', label: 'avg latency' },
  { value: '0', label: 'data persisted', accent: true },
]

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const baseUrlHintId = useId()
  const { status } = useStatus()
  const serverAddress =
    typeof status?.server_address === 'string'
      ? status.server_address.trim().replace(/\/+$/, '')
      : ''
  const apiBaseUrl = serverAddress || window.location.origin

  return (
    <section className='relative z-10 mx-auto w-full max-w-6xl px-6 pt-24 pb-10 md:pt-40 md:pb-14'>
      <div className='grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12'>
        {/* 左栏：文案与操作 */}
        <div className='flex flex-col items-start gap-6'>
          <span className='dark:text-foreground inline-flex items-center gap-2 rounded-full border border-[#E6E9F0] bg-white/35 px-3.5 py-1.5 text-[13px] font-medium text-[#3A434F] backdrop-blur-sm dark:bg-[#0b0f17]/40'>
            <span
              aria-hidden='true'
              className='size-2 rounded-full bg-[#3D5BFF]'
            />
            {t('New v2.0 is live · xAI Grok / Mistral supported')}
          </span>

          <h1 className='font-sans text-4xl leading-[1.1] font-bold tracking-tight text-[#0F131A] md:text-[2.75rem]'>
            {t('One endpoint,')}
            <br />
            <span className='landing-hero-gradient bg-clip-text text-transparent'>
              {t('for every large model')}
            </span>
          </h1>

          <p className='max-w-lg text-base leading-7 text-[#5A6370]'>
            {t(
              'Enterprise-grade stability, fast routing, transparent billing. Built for developers, not for slides.'
            )}
          </p>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              className='h-8 gap-2 rounded-xl bg-[#526FDB] px-5 text-sm font-medium text-white hover:bg-[#4667CC] [a]:hover:bg-[#4667CC]'
              render={
                <Link to={props.isAuthenticated ? '/keys' : '/sign-in'} />
              }
            >
              {t('Get API Key')}
              <ArrowRight aria-hidden='true' className='size-4' />
            </Button>
            <Button
              variant='outline'
              className='dark:text-foreground h-8 gap-2 rounded-xl border-[#E6E9F0] bg-white/35 px-5 text-sm font-medium text-[#0F131A] backdrop-blur-sm hover:bg-white/50 dark:bg-[#0b0f17]/40 dark:hover:bg-[#0b0f17]/55'
              render={<Link to='/about' />}
            >
              <BookOpen
                aria-hidden='true'
                className='dark:text-muted-foreground size-4 text-[#5A6370]'
              />
              {t('View Docs')}
            </Button>
          </div>

          <div
            role='group'
            aria-label={t('API Base URL')}
            aria-describedby={baseUrlHintId}
            className='dark:text-foreground flex w-full max-w-md items-center gap-2 rounded-xl border border-[#E6E9F0] bg-white/35 px-4 py-[0.2rem] backdrop-blur-sm dark:bg-[#0b0f17]/40'
          >
            <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <span
                id={baseUrlHintId}
                className='dark:text-muted-foreground font-mono text-[11px] font-medium tracking-wide text-[#8892A0]'
              >
                {t('API endpoint · OpenAI-compatible')}
              </span>
              <code className='truncate font-mono text-sm font-medium text-[#2F4FD0] dark:text-blue-300'>
                {apiBaseUrl}
              </code>
            </span>
            <CopyButton
              value={apiBaseUrl}
              variant='outline'
              className='size-8 shrink-0 rounded-lg'
              iconClassName='size-4'
              aria-label={t('Copy base URL')}
            />
          </div>

          <dl className='mt-2 flex w-full max-w-md items-center justify-between gap-4 border-t border-[#E6E9F0] pt-5'>
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className='flex flex-col gap-1'>
                <dt className='sr-only'>{t(stat.label)}</dt>
                <dd
                  className={
                    stat.accent
                      ? 'font-mono text-xl font-bold text-[#3D5BFF]'
                      : 'font-mono text-xl font-bold text-[#0F131A]'
                  }
                >
                  {stat.value}
                </dd>
                <dd className='text-xs text-[#8892A0]'>{t(stat.label)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 右栏：代码控制台演示 */}
        <HeroTerminalDemo className='max-w-full' />
      </div>
    </section>
  )
}
