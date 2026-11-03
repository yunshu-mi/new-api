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
import { Check, ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
// 左栏只放三句接入时能立刻验证的短事实，保持一行一条，不与上方能力卡和
// 右栏三条承诺重复。
const DEVELOPER_POINTS = [
  'Only one line changes',
  'Streaming stays the same',
  'Clear error reasons',
] as const

export function HowItWorks() {
  const { t } = useTranslation()
  const headingId = useId()
  // 渠道说明仅展示文字，不作为文档入口（https://docs.newapi.pro）。
  const integrationDescription = t(
    'Supports one-click configuration and perfectly adapts to NewAPI multi-protocol configuration.'
  )
  const channelDescription = t(
    '100% native channels, with web search and testing support'
  )
  const commitments = [
    {
      title: t('Full-Capability Official Channels'),
      description: (
        <span title={integrationDescription}>{channelDescription}</span>
      ),
    },
    {
      title: t('1:1 Top-ups · Clear Balance'),
      description: t('Use what you top up, with a clear and checkable balance'),
    },
    {
      title: t('Dedicated After-Sales Support'),
      description: t('Dedicated help with errors, plus tutorials'),
    },
  ]

  return (
    <section
      aria-labelledby={headingId}
      className='relative z-10 px-6 py-8 lg:py-12'
    >
      <AnimateInView className='mx-auto max-w-6xl' animation='fade-up'>
        <Card className='rounded-2xl py-0'>
          <div className='grid gap-7 px-6 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10 lg:px-10 lg:py-9'>
            <CardHeader className='flex flex-col gap-6 p-0 text-left'>
              <div>
                <CardTitle>
                  <h2
                    id={headingId}
                    className='text-xl font-bold tracking-tight'
                  >
                    {t('Our Commitments')}
                  </h2>
                </CardTitle>
                <CardDescription className='mt-3 leading-relaxed'>
                  {t(
                    '100% full-capability official channels | Reputation first, long-term operation | Dedicated help with errors'
                  )}
                </CardDescription>
              </div>
              {/* 核对项与标签成组贴住卡片下沿，左栏底部因此与右栏末行对齐。 */}
              <div className='mt-auto flex flex-col gap-5'>
                <ul className='border-border/50 flex flex-col gap-2.5 border-t pt-5'>
                  {DEVELOPER_POINTS.map((point) => (
                    <li key={point} className='flex items-center gap-2 text-sm'>
                      <Check
                        aria-hidden='true'
                        className='text-primary size-4 shrink-0'
                      />
                      {t(point)}
                    </li>
                  ))}
                </ul>
                <div className='flex flex-wrap gap-2'>
                  <Badge variant='secondary'>{t('High Concurrency')}</Badge>
                  <Badge variant='secondary'>{t('1:1 Top-ups')}</Badge>
                  <Badge variant='secondary'>&lt;200ms</Badge>
                  <Badge variant='secondary'>{t('Multiple Models')}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className='lg:border-border/60 p-0 lg:border-l lg:pl-10'>
              <ul className='divide-border/60 flex h-full flex-col divide-y'>
                {commitments.map((commitment) => (
                  <li
                    key={commitment.title}
                    className='flex flex-1 items-start gap-3 py-4 first:pt-0 last:pb-0'
                  >
                    <ChevronRight
                      aria-hidden='true'
                      className='text-primary mt-0.5 size-4 shrink-0'
                    />
                    <div>
                      <h3 className='text-[15px] font-semibold'>
                        {commitment.title}
                      </h3>
                      <p className='text-muted-foreground mt-1.5 text-sm leading-relaxed'>
                        {commitment.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </div>
        </Card>
      </AnimateInView>
    </section>
  )
}
