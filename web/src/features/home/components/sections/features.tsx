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
import {
  Activity,
  Layers,
  Receipt,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { cn } from '@/lib/utils'

interface FeatureCard {
  id: string
  icon: LucideIcon
  title: string
  description: string
  tag: string
  wide: boolean
}

function FeatureCardView(props: { card: FeatureCard }) {
  const { card } = props
  const Icon = card.icon
  return (
    <div className='flex h-full flex-col gap-4 rounded-2xl border border-[#E6E9F0] bg-white p-8 text-left'>
      <Icon aria-hidden='true' className='size-7 text-[#3D5BFF]' />
      <h3 className='text-xl font-bold text-[#0F131A]'>{card.title}</h3>
      <p className='text-[15px] leading-7 text-[#5A6370]'>{card.description}</p>
      <span className='font-mono text-sm font-semibold text-[#2F4FD0]'>
        {card.tag}
      </span>
    </div>
  )
}

export function Features() {
  const { t } = useTranslation()
  const headingId = useId()

  const features: FeatureCard[] = [
    {
      id: 'unified',
      icon: Layers,
      title: t('Unified Access'),
      description: t(
        'One API key, OpenAI / Anthropic compatible, connected to 20+ leading models - no per-provider integration.'
      ),
      tag: t('one-key → 20+ models'),
      wide: true,
    },
    {
      id: 'balancing',
      icon: Activity,
      title: t('Auto Scheduling & Load Balancing'),
      description: t(
        'Seamless failover and automatic load distribution for a consistently smooth experience.'
      ),
      tag: t('99.99% uptime'),
      wide: false,
    },
    {
      id: 'billing',
      icon: Receipt,
      title: t('Transparent Billing'),
      description: t(
        'Pay-as-you-go, 1:1 top-ups, refundable balance, real-time usage.'
      ),
      tag: t('¥0.0012 / 1K tokens'),
      wide: false,
    },
    {
      id: 'secure',
      icon: ShieldCheck,
      title: t('Secure & Reliable · No Storage'),
      description: t(
        'Requests are forwarded directly and never persisted; enterprise-grade permissions and audit.'
      ),
      tag: t('0 persistence · always encrypted'),
      wide: true,
    },
  ]

  return (
    <section
      aria-labelledby={headingId}
      className='relative z-10 mx-auto w-full max-w-6xl px-6 py-12 md:py-16'
    >
      <AnimateInView className='mb-10 max-w-2xl'>
        <span className='font-mono text-[13px] font-medium text-[#3D5BFF]'>
          {t('01 · Core capabilities')}
        </span>
        <h2
          id={headingId}
          className='mt-3 text-3xl leading-tight font-bold tracking-tight text-[#0F131A] md:text-4xl'
        >
          {t('Core capabilities built for developers')}
        </h2>
        <p className='mt-4 text-base leading-7 text-[#5A6370]'>
          {t(
            'Not slide-deck talking points, but the stability, transparency and security running every day.'
          )}
        </p>
      </AnimateInView>

      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
        {features.map((feature, index) => (
          <AnimateInView
            key={feature.id}
            className={cn(feature.wide && 'sm:col-span-2')}
            delay={index * 80}
            animation='fade-up'
          >
            <FeatureCardView card={feature} />
          </AnimateInView>
        ))}
      </div>
    </section>
  )
}
