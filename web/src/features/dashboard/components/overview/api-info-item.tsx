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
import { Zap, ExternalLink, Gauge } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Item, ItemActions, ItemContent } from '@/components/ui/item'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getLatencyColorClass,
  openExternalSpeedTest,
} from '@/features/dashboard/lib/api-info'
import type { ApiInfoItem, PingStatus } from '@/features/dashboard/types'
import { toIntlLocale } from '@/i18n/languages'
import { getBgColorClass } from '@/lib/colors'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

type ApiInfoItemProps = {
  item: ApiInfoItem
} & (
  | { variant: 'inline' }
  | { variant?: undefined; status: PingStatus; onTest: (url: string) => void }
)

export function ApiInfoItemComponent(props: ApiInfoItemProps) {
  const { t, i18n } = useTranslation()
  const descriptionId = useId()
  const item = props.item
  const inline = props.variant === 'inline'
  const copyLabel = inline ? t('Copy API URL') : t('Copy URL')
  const externalTestLabel = t('External Speed Test')

  const routeDot = (
    <span
      aria-hidden='true'
      className={cn(
        'inline-block size-2 shrink-0 [clip-path:circle(closest-side)]',
        getBgColorClass(item.color)
      )}
    />
  )
  const copyButton = (
    <CopyButton
      value={item.url}
      variant='ghost'
      size='sm'
      className='size-7 p-0'
      iconClassName='size-3.5'
      tooltip={copyLabel}
      tooltipVariant={inline ? 'neutral' : undefined}
      aria-label={inline ? `${copyLabel}: ${item.url}` : copyLabel}
    />
  )

  if (inline) {
    const address = (
      <code className='text-muted-foreground min-w-0 cursor-text text-xs break-all select-text'>
        {item.url}
      </code>
    )
    const description =
      typeof item.description === 'string' ? item.description.trim() : ''

    return (
      <Item
        role='listitem'
        variant='outline'
        size='xs'
        className='border-input min-h-8 w-fit max-w-full flex-nowrap py-px'
      >
        <ItemContent className='min-w-0'>
          <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
            <span className='inline-flex min-w-0 items-center gap-1.5 text-xs font-medium'>
              {routeDot}
              <span className='min-w-0 wrap-anywhere'>{item.route}</span>
            </span>
            {description ? (
              <Tooltip>
                <TooltipTrigger
                  render={address}
                  delay={0}
                  tabIndex={0}
                  aria-describedby={descriptionId}
                  className='focus-visible:outline-ring rounded-xs focus-visible:outline-2'
                />
                <TooltipContent
                  id={descriptionId}
                  role='tooltip'
                  variant='neutral'
                  className='max-w-[min(20rem,calc(100vw-2rem))] wrap-anywhere whitespace-pre-wrap'
                >
                  {description}
                </TooltipContent>
              </Tooltip>
            ) : (
              address
            )}
          </div>
        </ItemContent>
        <ItemActions className='gap-0.5'>
          {copyButton}
          <Button
            variant='ghost'
            size='sm'
            className='size-7 p-0'
            onClick={() => openExternalSpeedTest(item.url)}
            title={externalTestLabel}
            aria-label={`${externalTestLabel}: ${item.url}`}
          >
            <Zap className='size-3.5' />
          </Button>
        </ItemActions>
      </Item>
    )
  }

  const status = props.status
  const testLabel = t('Test Latency')
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const latencyStatus = (
    <>
      {status.testing && (
        <StatusBadge
          label={t('Testing...')}
          variant='warning'
          className='animate-pulse'
          copyable={false}
        />
      )}
      {status.latency !== null && !status.testing && (
        <StatusBadge
          variant='success'
          label={`${formatNumber(status.latency, locale)}${t('ms')}`}
          className={cn(
            'font-mono font-medium',
            getLatencyColorClass(status.latency)
          )}
          copyable={false}
        />
      )}
      {status.error && (
        <StatusBadge label={t('N/A')} variant='neutral' copyable={false} />
      )}
    </>
  )

  return (
    <div className='group hover:bg-muted/40 flex items-center justify-between gap-2 px-3 py-2.5 transition-colors sm:gap-3 sm:px-5 sm:py-3'>
      <div className='flex min-w-0 flex-1 items-center gap-2 sm:gap-3'>
        {routeDot}
        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <div className='flex items-baseline gap-2'>
            <span className='font-mono text-sm font-semibold'>
              {item.route}
            </span>
            <span className='text-muted-foreground/60 hidden truncate text-xs md:inline'>
              {item.description}
            </span>
          </div>
          <span className='text-muted-foreground/40 truncate font-mono text-xs'>
            {item.url}
          </span>
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        <div className='flex items-center'>{latencyStatus}</div>

        <div className='flex items-center gap-0.5'>
          <Button
            variant='ghost'
            size='sm'
            className='size-7 p-0'
            onClick={() => props.onTest(item.url)}
            disabled={status.testing}
            title={testLabel}
            aria-label={testLabel}
          >
            <Zap
              className={cn('size-3.5', status.testing && 'animate-pulse')}
            />
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => openExternalSpeedTest(item.url)}
            className='hidden size-7 p-0 sm:inline-flex'
            title={externalTestLabel}
          >
            <Gauge className='size-3.5' />
          </Button>

          {copyButton}

          <Button
            variant='ghost'
            size='sm'
            className='hidden size-7 p-0 sm:inline-flex'
            title={t('Open in New Tab')}
            render={<a href={item.url} target='_blank' rel='noreferrer' />}
          >
            <ExternalLink className='size-3.5' />
          </Button>
        </div>
      </div>
    </div>
  )
}
