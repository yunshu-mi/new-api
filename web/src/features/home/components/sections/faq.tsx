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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Markdown } from '@/components/ui/markdown'
import { useStatus } from '@/hooks/use-status'

interface FaqEntry {
  id?: number
  question: string
  answer: string
}

const DEFAULT_FAQ = [
  {
    question: 'Which models are supported?',
    answer:
      '20+ leading providers including OpenAI, Anthropic Claude, Google Gemini and DeepSeek, continuously updated - connect once, use any.',
  },
  {
    question: 'How is billing handled? Can I get a refund?',
    answer:
      'Pay-as-you-go, 1:1 top-ups, no monthly or hidden fees, and your balance is refundable anytime.',
  },
  {
    question: 'Do you store my data?',
    answer:
      'No. Requests are forwarded directly and never persisted, with no content retention or privacy matching.',
  },
  {
    question: 'Is it OpenAI-compatible?',
    answer:
      'Fully compatible with OpenAI / Anthropic protocols - swap the base URL and migrate with no code changes.',
  },
  {
    question: 'How about stability and latency?',
    answer:
      'Automatic scheduling and load balancing with seamless failover; average latency is under 200ms.',
  },
  {
    question: 'Do you support enterprise or dedicated channels?',
    answer:
      'Yes. Enterprise plans offer dedicated channels, SLA guarantees and audit/permission management.',
  },
] as const

export function Faq() {
  const { t } = useTranslation()
  const headingId = useId()
  const { status } = useStatus()

  // 后台配置的主页 FAQ（来自 /api/status 的 console_setting.home_faq）。
  const faqEnabled = status ? status.home_faq_enabled !== false : true
  const rawFaq = status?.home_faq
  const backendFaq: FaqEntry[] = Array.isArray(rawFaq)
    ? (rawFaq as FaqEntry[])
    : []

  // 后台显式关闭时，首页不展示该板块。
  if (!faqEnabled) return null

  const items: FaqEntry[] =
    backendFaq.length > 0
      ? backendFaq
      : DEFAULT_FAQ.map((item) => ({
          question: t(item.question),
          answer: t(item.answer),
        }))

  return (
    <section
      aria-labelledby={headingId}
      className='relative z-10 mx-auto w-full max-w-6xl px-6 py-12 md:py-16'
    >
      <AnimateInView className='mb-10 max-w-2xl'>
        <span className='font-mono text-[13px] font-medium text-[#3D5BFF]'>
          {t('03 · FAQ')}
        </span>
        <h2
          id={headingId}
          className='mt-3 text-3xl leading-tight font-bold tracking-tight text-[#0F131A] md:text-4xl'
        >
          {t('Everything you want to know')}
        </h2>
        <p className='mt-4 text-base leading-7 text-[#5A6370]'>
          {t('Still have questions? Join the community or contact us anytime.')}
        </p>
      </AnimateInView>

      <Accordion className='gap-4'>
        {items.map((item, idx) => {
          const key = item.id ?? `faq-${idx}`
          return (
            <AccordionItem
              key={key}
              value={`item-${key}`}
              className='overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white'
            >
              <AccordionTrigger className='px-6 py-5 text-base font-bold text-[#0F131A] hover:no-underline'>
                {item.question}
              </AccordionTrigger>
              <AccordionContent className='px-6 pb-5 text-[15px] leading-7 text-[#4A5260]'>
                <Markdown>{item.answer}</Markdown>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </section>
  )
}
