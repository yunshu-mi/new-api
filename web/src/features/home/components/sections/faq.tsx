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

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Markdown } from '@/components/ui/markdown'
import { useStatus } from '@/hooks/use-status'

import { HOME_SECTION_CLASS_NAME } from '../../constants'

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
    <section aria-labelledby={headingId} className={HOME_SECTION_CLASS_NAME}>
      <div className='mb-6 max-w-2xl'>
        <span className='font-sans text-[13px] font-medium text-[#3D5BFF]'>
          {t('03 · FAQ')}
        </span>
        <h2
          id={headingId}
          className='mt-2 text-[36px] leading-tight font-bold tracking-tight text-[#0F131A]'
        >
          {t('Everything you want to know')}
        </h2>
        <p className='mt-3 text-[16px] leading-6 font-normal text-[#5A6370]'>
          {t('Still have questions? Join the community or contact us anytime.')}
        </p>
      </div>

      <Accordion className='gap-3'>
        {items.map((item, idx) => {
          const key = item.id ?? `faq-${idx}`
          return (
            <AccordionItem
              key={key}
              value={`item-${key}`}
              className='overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white'
            >
              <AccordionTrigger className='px-5 py-4 text-sm font-bold text-[#0F131A] hover:no-underline'>
                {item.question}
              </AccordionTrigger>
              <AccordionContent className='px-5 pb-4 text-sm leading-6 text-[#4A5260]'>
                <Markdown>{item.answer}</Markdown>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </section>
  )
}
