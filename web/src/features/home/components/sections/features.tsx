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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const FEATURE_VISUALS = {
  unified: (
    <svg
      width='176'
      height='80'
      viewBox='0 0 176 80'
      className='h-full w-auto'
      fill='none'
      stroke='currentColor'
    >
      <rect x='10' y='6' width='28' height='24' rx='5' />
      <rect x='66' y='6' width='28' height='24' rx='5' />
      <rect x='122' y='6' width='28' height='24' rx='5' />
      <path d='M24 30v14h56m0-14v28m56-28v14H80' opacity='.4' />
      <rect x='54' y='58' width='52' height='20' rx='5' />
      <text
        x='80'
        y='72'
        textAnchor='middle'
        fontSize='10'
        fontFamily='monospace'
        fill='currentColor'
        stroke='none'
      >
        API
      </text>
    </svg>
  ),
  billing: (
    <svg
      width='176'
      height='80'
      viewBox='0 0 176 80'
      className='h-full w-auto'
      fill='none'
      stroke='currentColor'
    >
      <path d='M12 6v66h144' opacity='.2' />
      <path
        d='M17 18h112M17 36h112M17 54h112'
        strokeDasharray='3 5'
        opacity='.15'
      />
      <g fill='currentColor' stroke='none'>
        <rect x='24' y='12' width='14' height='60' rx='3' opacity='.8' />
        <rect x='46' y='26' width='14' height='46' rx='3' opacity='.65' />
        <rect x='68' y='39' width='14' height='33' rx='3' opacity='.5' />
        <rect x='90' y='48' width='14' height='24' rx='3' opacity='.35' />
        <rect x='112' y='56' width='14' height='16' rx='3' opacity='.2' />
      </g>
    </svg>
  ),
  secure: (
    <svg
      width='176'
      height='80'
      viewBox='0 0 176 80'
      className='h-full w-auto'
      fill='none'
      stroke='currentColor'
    >
      <path
        d='m14 15 4 4 7-9m-11 30 4 4 7-9m-11 30 4 4 7-9'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M36 15h68M36 40h52M36 65h62'
        strokeWidth='5'
        strokeLinecap='round'
        opacity='.35'
      />
      <path d='m132 21 18 7v16c0 11-18 19-18 19s-18-8-18-19V28l18-7Z' />
      <path
        d='m123 42 6 6 12-13'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  ),
  privacy: (
    <svg
      width='176'
      height='80'
      viewBox='0 0 176 80'
      className='h-full w-auto'
      fill='none'
      stroke='currentColor'
    >
      <ellipse cx='88' cy='20' rx='26' ry='8' />
      <path d='M62 20v34c0 4.4 11.6 8 26 8s26-3.6 26-8V20' />
      <path d='M62 37c0 4.4 11.6 8 26 8s26-3.6 26-8' opacity='.35' />
      <path d='m61 69 54-50' strokeWidth='3' strokeLinecap='round' />
    </svg>
  ),
  balancing: (
    <svg
      width='176'
      height='80'
      viewBox='0 0 176 80'
      className='h-full w-auto'
      fill='none'
      stroke='currentColor'
    >
      <circle cx='20' cy='40' r='7' />
      <path d='M27 40h20' />
      <rect x='47' y='30' width='34' height='20' rx='5' />
      <path d='M81 40h11' opacity='.4' />
      <path d='M92 40 117 18M92 40h25M92 40l25 22' opacity='.4' />
      <circle cx='124' cy='18' r='7' opacity='.5' />
      <circle cx='124' cy='40' r='7' />
      <circle cx='124' cy='62' r='7' opacity='.5' />
    </svg>
  ),
}

export function Features() {
  const { t } = useTranslation()
  const headingId = useId()
  const features = [
    {
      id: 'unified',
      number: '01',
      title: t('Unified Access'),
      description: t(
        'Use one base URL for OpenAI, Claude, Gemini, and compatible tools.'
      ),
      visual: FEATURE_VISUALS.unified,
    },
    {
      id: 'billing',
      number: '02',
      title: t('Transparent Billing'),
      description: t('Pay-as-you-go with real-time usage monitoring'),
      visual: FEATURE_VISUALS.billing,
    },
    {
      id: 'secure',
      number: '03',
      title: t('Secure & Reliable'),
      description: t(
        'Enterprise-grade security with comprehensive permission management'
      ),
      visual: FEATURE_VISUALS.secure,
    },
    {
      id: 'privacy',
      number: '04',
      title: t('No Request Storage'),
      description: t(
        'Requests are forwarded directly, never written to disk, rewritten, or cached.'
      ),
      visual: FEATURE_VISUALS.privacy,
    },
    {
      id: 'balancing',
      number: '05',
      title: t('Automatic Load Balancing'),
      description: t(
        'Smooth, stable service with edge-accelerated deployment and automatic failover.'
      ),
      visual: FEATURE_VISUALS.balancing,
    },
  ]

  return (
    <section
      aria-labelledby={headingId}
      className='relative z-10 flex flex-1 flex-col px-6 py-2'
    >
      <div className='mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center'>
        <AnimateInView className='mb-[calc(.75rem+var(--home-space,0px)/2)] shrink-0 text-center'>
          <h2
            id={headingId}
            className='text-2xl leading-tight font-bold tracking-tight md:text-[28px] lg:text-[length:calc(1.75rem+var(--home-space,0px)/2)]'
          >
            {t('Built for developers,')}{' '}
            <span className='bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent'>
              {t('not for slide decks.')}
            </span>
          </h2>
        </AnimateInView>

        {/* 首行三张等宽卡，末行两张各占半行，正好铺满六列，避免留下空位。 */}
        <ul className='grid flex-1 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:max-h-[44svh] lg:grid-cols-6'>
          {features.map((feature, index) => {
            const titleId = `${headingId}-${feature.id}`
            const spanClass = index < 3 ? 'lg:col-span-2' : 'lg:col-span-3'
            // 平板两列时最后一张单独成行会留出左偏的空位，让它横跳整行。
            const lastItemClass =
              index === features.length - 1 ? 'sm:col-span-2' : undefined
            return (
              <AnimateInView
                as='li'
                key={feature.id}
                className={cn(spanClass, lastItemClass)}
                delay={index * 80}
                animation='fade-up'
              >
                <Card
                  role='article'
                  aria-labelledby={titleId}
                  className='relative h-full justify-center gap-0 py-[calc(.5rem+var(--home-space,0px)/2)] text-center'
                >
                  <div
                    aria-hidden='true'
                    className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400/30 via-violet-400/30 to-purple-500/30'
                  />
                  <CardContent aria-hidden='true' className='text-primary/70'>
                    <span className='block font-mono text-[11px] tracking-[0.3em]'>
                      {feature.number}
                    </span>
                    <div className='mt-[calc(.25rem+var(--home-space,0px)/4)] flex h-[calc(2rem+var(--home-space,0px))] items-center justify-center'>
                      {feature.visual}
                    </div>
                  </CardContent>
                  <CardHeader className='pt-[calc(.5rem+var(--home-space,0px)/2)]'>
                    <CardTitle>
                      <h3
                        id={titleId}
                        className='text-[length:calc(1rem+var(--home-space,0px)/8)] font-semibold'
                      >
                        {feature.title}
                      </h3>
                    </CardTitle>
                    <CardDescription className='mx-auto mt-1 min-h-10 max-w-[36ch] text-[length:calc(.75rem+var(--home-space,0px)/16)] leading-5'>
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
