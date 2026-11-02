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
import { Play } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

import { HOME_API_ENDPOINTS } from '../../constants'

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
    <section className='relative z-10 shrink-0 overflow-hidden px-6 pb-[calc(.5rem+var(--home-space,0px)/2)]'>
      <div className='mx-auto w-full max-w-3xl'>
        <div className='flex flex-col items-center text-center'>
          <h1
            className='landing-animate-fade-up text-4xl leading-none font-bold tracking-tight md:text-5xl lg:text-[length:calc(3rem+var(--home-space,0px))]'
            style={{ animationDelay: '60ms' }}
          >
            {t('Unified')} <br />
            <span className='bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent'>
              {t('Large Model API Gateway')}
            </span>
          </h1>
          <p
            className='landing-animate-fade-up text-muted-foreground/80 mt-[calc(.75rem+var(--home-space,0px)/2)] max-w-xl text-base leading-7 opacity-0'
            style={{ animationDelay: '120ms' }}
          >
            {t('Enterprise-grade stability and speed')}
          </p>
          <p
            id={baseUrlHintId}
            className='landing-animate-fade-up text-muted-foreground/70 mt-[calc(.75rem+var(--home-space,0px)/2)] text-sm leading-6 opacity-0'
            style={{ animationDelay: '150ms' }}
          >
            {t('Just replace your model base URL with:')}
          </p>

          <div
            role='group'
            aria-label={t('API Base URL')}
            aria-describedby={baseUrlHintId}
            className='landing-animate-fade-up border-border/60 bg-card mt-2.5 flex w-full max-w-md min-w-0 items-center gap-2 rounded-xl border py-1.5 pr-2 pl-4 opacity-0 shadow-xs lg:max-w-[32.5rem]'
            style={{ animationDelay: '180ms' }}
          >
            {/* 基址居左，轮播路径靠右排列，复制按钮保持在最右侧。 */}
            <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-2 font-mono text-xs sm:text-sm'>
              <code className='text-foreground/90 min-w-0 break-all'>
                {apiBaseUrl}
              </code>
              <div
                aria-hidden='true'
                className='ml-auto hidden h-6 w-48 shrink-0 overflow-hidden pr-3 text-right text-[13px] font-medium text-blue-600 sm:block dark:text-blue-400'
              >
                <div className='landing-endpoint-scroll'>
                  {HOME_API_ENDPOINTS.map((endpoint) => (
                    <code
                      key={endpoint}
                      className='flex h-6 items-center justify-end'
                    >
                      {endpoint}
                    </code>
                  ))}
                  <code className='flex h-6 items-center justify-end'>
                    {HOME_API_ENDPOINTS[0]}
                  </code>
                </div>
              </div>
            </div>
            <CopyButton
              value={apiBaseUrl}
              variant='outline'
              className='size-9 shrink-0 rounded-lg'
              aria-label={t('Copy base URL')}
            />
          </div>

          <div
            className='landing-animate-fade-up mt-[calc(1rem+var(--home-space,0px)/2)] flex flex-wrap items-center justify-center gap-3 opacity-0'
            style={{ animationDelay: '240ms' }}
          >
            <Button
              className='group h-10 rounded-lg px-5 text-sm font-medium'
              render={
                <Link to={props.isAuthenticated ? '/keys' : '/sign-up'} />
              }
            >
              <Play aria-hidden='true' className='mr-1 size-3.5 fill-current' />
              {t('Get API Key')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
