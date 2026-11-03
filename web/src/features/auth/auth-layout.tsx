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
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

import '@/styles/sign-in.css'

type AuthLayoutProps = {
  children: React.ReactNode
  variant?: 'default' | 'split'
}

export function AuthLayout({ children, variant = 'default' }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  if (variant === 'split') {
    const brand = (
      <Link to='/' className='sign-in-brand'>
        {loading ? (
          <>
            <Skeleton className='size-10 shrink-0 rounded-full' />
            <Skeleton className='h-8 w-28' />
          </>
        ) : (
          <>
            <img
              src={logo}
              alt={t('Logo')}
              className='size-10 shrink-0 rounded-full object-cover'
            />
            <span className='min-w-0 break-words'>{systemName}</span>
          </>
        )}
      </Link>
    )

    return (
      <div className='sign-in-page'>
        <main className='sign-in-content'>
          <section
            className='sign-in-intro'
            aria-labelledby='sign-in-intro-title'
          >
            {brand}
            <div className='space-y-4'>
              <p id='sign-in-intro-title' className='sign-in-headline'>
                {t('A unified')} <br />
                <span className='bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent'>
                  {t('Large model API gateway')}
                </span>
              </p>
              <p className='text-base leading-relaxed text-[var(--sign-in-muted)]'>
                {t(
                  'A stable, efficient and secure platform for AI model access and management'
                )}
              </p>
            </div>
          </section>
          <Card className='sign-in-card'>
            <div className='sign-in-card-brand'>{brand}</div>
            {children}
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className='relative grid h-svh max-w-none'>
      <Link
        to='/'
        className='absolute top-4 left-4 z-10 flex items-center gap-2 transition-opacity hover:opacity-80 sm:top-8 sm:left-8'
      >
        <div className='relative h-8 w-8'>
          {loading ? (
            <Skeleton className='absolute inset-0 rounded-full' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='h-8 w-8 rounded-full object-cover'
            />
          )}
        </div>
        {loading ? (
          <Skeleton className='h-6 w-24' />
        ) : (
          <h1 className='text-xl font-medium'>{systemName}</h1>
        )}
      </Link>
      <div className='container flex items-center pt-16 sm:pt-0'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 px-4 py-8 sm:w-[480px] sm:p-8'>
          {children}
        </div>
      </div>
    </div>
  )
}
