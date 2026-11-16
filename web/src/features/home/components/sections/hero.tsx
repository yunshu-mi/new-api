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
          <span className='border-border bg-card text-foreground inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium backdrop-blur-sm'>
            <span
              aria-hidden='true'
              className='bg-primary size-2 rounded-full'
            />
            {t('New v2.0 is live · xAI Grok / Mistral supported')}
          </span>

          <h1 className='text-foreground font-sans text-4xl leading-[1.1] font-bold tracking-tight md:text-[2.75rem]'>
            {t('One endpoint,')}
            <br />
            <span className='landing-hero-gradient bg-clip-text text-transparent'>
              {t('for every large model')}
            </span>
          </h1>

          <p className='text-muted-foreground max-w-lg text-base leading-7'>
            {t(
              'Enterprise-grade stability, fast routing, transparent billing. Built for developers, not for slides.'
            )}
          </p>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              className='h-9 gap-2 px-5'
              render={
                <Link to={props.isAuthenticated ? '/keys' : '/sign-in'} />
              }
            >
              {t('Get API Key')}
              <ArrowRight aria-hidden='true' className='size-4' />
            </Button>
            <Button
              variant='outline'
              className='h-9 gap-2 px-5'
              render={<Link to='/about' />}
            >
              <BookOpen
                aria-hidden='true'
                className='text-muted-foreground size-4'
              />
              {t('View Docs')}
            </Button>
          </div>

          <div
            role='group'
            aria-label={t('API Base URL')}
            aria-describedby={baseUrlHintId}
            className='border-border bg-card flex w-full max-w-md items-center gap-2 rounded-xl border px-4 py-[0.2rem] backdrop-blur-sm'
          >
            <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <span
                id={baseUrlHintId}
                className='text-muted-foreground font-mono text-[11px] font-medium tracking-wide'
              >
                {t('API endpoint · OpenAI-compatible')}
              </span>
              <code className='text-primary truncate font-mono text-sm font-medium'>
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

          <dl className='border-border mt-2 grid w-full max-w-md grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4'>
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className='flex flex-col gap-1'>
                <dt className='sr-only'>{t(stat.label)}</dt>
                <dd
                  className={
                    stat.accent
                      ? 'text-primary font-mono text-xl font-bold'
                      : 'text-foreground font-mono text-xl font-bold'
                  }
                >
                  {stat.value}
                </dd>
                <dd className='text-muted-foreground text-xs'>
                  {t(stat.label)}
                </dd>
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
