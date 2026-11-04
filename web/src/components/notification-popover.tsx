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
import type { TFunction } from 'i18next'
import { Bell, Megaphone, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { RichContent } from '@/components/rich-content'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAnnouncementColorClass } from '@/lib/colors'
import { formatDateTimeObject } from '@/lib/time'
import { cn } from '@/lib/utils'

interface AnnouncementItem {
  id?: number | string
  type?: string
  content?: string
  extra?: string
  publishDate?: string | Date
}

interface NotificationPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseToday: () => void
  unreadCount: number
  activeTab: 'notice' | 'announcements'
  onTabChange: (tab: 'notice' | 'announcements') => void
  notice: string
  announcements: AnnouncementItem[]
  loading: boolean
  className?: string
}

const notificationTabClassName =
  'min-h-9 flex-none rounded-lg px-3 text-xs text-[#6c6c6c] data-active:bg-[#eaf5ff] data-active:text-[#0064fa] dark:data-active:border-transparent dark:data-active:bg-blue-400/15 dark:data-active:text-blue-300'

const notificationActionClassName =
  'bg-[#e8e8e8] text-[#0059e5] hover:bg-[#e2e2e2] dark:bg-secondary dark:text-blue-300 dark:hover:bg-secondary/80'

/**
 * Get relative time string from a date
 */
function getRelativeTime(publishDate: string | Date, t: TFunction): string {
  if (!publishDate) return ''

  const now = new Date()
  const pubDate = new Date(publishDate)

  // If invalid date, return original string
  if (Number.isNaN(pubDate.getTime())) {
    return typeof publishDate === 'string' ? publishDate : ''
  }

  const diffMs = now.getTime() - pubDate.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  // If future time, show specific date
  if (diffMs < 0) return formatDateTimeObject(pubDate)

  // Return relative time based on difference
  if (diffSeconds < 60) return t('Just now')
  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? t('1 minute ago')
      : t('{{count}} minutes ago', { count: diffMinutes })
  }
  if (diffHours < 24) {
    return diffHours === 1
      ? t('1 hour ago')
      : t('{{count}} hours ago', { count: diffHours })
  }
  if (diffDays < 7) {
    return diffDays === 1
      ? t('1 day ago')
      : t('{{count}} days ago', { count: diffDays })
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1
      ? t('1 week ago')
      : t('{{count}} weeks ago', { count: diffWeeks })
  }
  if (diffMonths < 12) {
    return diffMonths === 1
      ? t('1 month ago')
      : t('{{count}} months ago', { count: diffMonths })
  }
  if (diffYears < 2) return t('1 year ago')

  // Over 2 years, show specific date
  return formatDateTimeObject(pubDate)
}

/**
 * Announcement status dot indicator
 */
function AnnouncementDot({ type }: { type?: string }) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        'mt-1.5 inline-block size-2 shrink-0 rounded-full',
        getAnnouncementColorClass(type)
      )}
    />
  )
}

function getAnnouncementRenderKey(announcement: AnnouncementItem): string {
  if (announcement.id !== undefined && announcement.id !== null) {
    return `id:${announcement.id}`
  }

  return JSON.stringify({
    content: announcement.content ?? '',
    extra: announcement.extra ?? '',
    publishDate: announcement.publishDate ?? '',
    type: announcement.type ?? '',
  })
}

/**
 * Empty state component
 */
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <Empty className='min-h-48 border-0 p-4'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  )
}

/**
 * Notice tab content
 */
function NoticeContent({
  notice,
  loading,
  t,
}: {
  notice: string
  loading: boolean
  t: TFunction
}) {
  if (loading) {
    return (
      <EmptyState
        icon={<Bell />}
        title={t('Loading...')}
        description={t('Latest platform updates and notices')}
      />
    )
  }

  if (!notice) {
    return (
      <EmptyState icon={<Bell />} title={t('No announcements at this time')} />
    )
  }

  return (
    <RichContent
      breaks
      content={notice}
      className='[&_hr]:my-2 [&_li]:my-0 [&_p]:leading-5'
    />
  )
}

/**
 * Announcements tab content
 */
function AnnouncementsContent({
  announcements,
  loading,
  t,
}: {
  announcements: AnnouncementItem[]
  loading: boolean
  t: TFunction
}) {
  if (loading) {
    return (
      <EmptyState
        icon={<Megaphone />}
        title={t('Loading...')}
        description={t('Latest platform updates and notices')}
      />
    )
  }

  if (announcements.length === 0) {
    return (
      <EmptyState icon={<Megaphone />} title={t('No system announcements')} />
    )
  }

  return (
    <ol className='flex list-none flex-col'>
      {announcements.map((item, idx) => {
        const announcementKey = getAnnouncementRenderKey(item)
        const title = typeof item.extra === 'string' ? item.extra.trim() : ''
        const publishDate = item.publishDate ? new Date(item.publishDate) : null
        const relativeTime = publishDate ? getRelativeTime(publishDate, t) : ''
        const absoluteTime = publishDate
          ? formatDateTimeObject(publishDate)
          : ''

        return (
          <li
            key={announcementKey}
            className='relative flex items-start gap-3 py-3'
          >
            <AnnouncementDot type={item.type} />
            {idx < announcements.length - 1 ? (
              <Separator
                aria-hidden='true'
                orientation='vertical'
                className='bg-muted-foreground/50 pointer-events-none absolute start-[calc(var(--spacing)_-_0.25px)] top-7 -bottom-3.5 data-vertical:w-[0.5px]'
              />
            ) : null}
            <div className='flex min-w-0 flex-1 flex-col gap-2'>
              {title ? (
                <p className='text-sm font-medium wrap-anywhere'>{title}</p>
              ) : null}
              <div className='text-sm'>
                <RichContent breaks content={item.content || ''} />
              </div>

              {absoluteTime ? (
                <div className='text-muted-foreground text-xs'>
                  {relativeTime ? `${relativeTime} • ` : null}
                  {absoluteTime}
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Notification dialog with Notice and Announcements tabs
 */
export function NotificationPopover({
  open,
  onOpenChange,
  onCloseToday,
  unreadCount,
  activeTab,
  onTabChange,
  notice,
  announcements,
  loading,
  className,
}: NotificationPopoverProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className={cn('relative size-9', className)}
            aria-label={t('Notifications')}
          />
        }
      >
        <Bell className='size-[1.2rem]' />
        {unreadCount > 0 ? (
          <Badge
            variant='destructive'
            className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-semibold tabular-nums'
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        ) : null}
      </DialogTrigger>

      <DialogContent
        aria-modal='true'
        showCloseButton={false}
        overlayClassName='bg-black/55 supports-backdrop-filter:backdrop-blur-none'
        className={cn(
          'bg-background top-(--notification-top) flex max-h-[min(var(--notification-height-limit,100dvh),var(--notification-available-height))] origin-top translate-y-0 flex-col gap-0 transition-none [--notification-available-height:calc(100dvh-var(--notification-top)-var(--dialog-inset-bottom,1rem))] [--notification-top:max(var(--dialog-inset-top,1rem),min(8dvh,5rem))] sm:max-w-[min(1150px,calc(100%-2rem))] sm:px-6',
          activeTab === 'announcements' && '[--notification-height-limit:650px]'
        )}
      >
        <Tabs
          className={cn(
            'gap-4',
            activeTab === 'notice' ? 'shrink-0' : 'min-h-0'
          )}
          value={activeTab}
          onValueChange={onTabChange}
        >
          <DialogHeader className='relative shrink-0 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 pe-8'>
            <DialogTitle className='text-lg font-semibold'>
              {t('System Announcements')}
            </DialogTitle>
            <TabsList className='h-auto flex-wrap justify-start gap-1 bg-transparent p-0 group-data-horizontal/tabs:h-auto'>
              <TabsTrigger value='notice' className={notificationTabClassName}>
                <Bell aria-hidden='true' className='size-3.5' />
                {t('Notice')}
              </TabsTrigger>
              <TabsTrigger
                value='announcements'
                className={notificationTabClassName}
              >
                <Megaphone aria-hidden='true' className='size-3.5' />
                {t('System Announcements')}
              </TabsTrigger>
            </TabsList>
            <DialogClose
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  className='absolute end-0 top-0'
                  aria-label={t('Close')}
                />
              }
            >
              <X aria-hidden='true' className='size-4' />
            </DialogClose>
          </DialogHeader>

          <TabsContent value='notice'>
            <NoticeContent notice={notice} loading={loading} t={t} />
          </TabsContent>

          <TabsContent
            value='announcements'
            className='min-h-0 overflow-y-auto overscroll-contain pe-2'
          >
            <AnnouncementsContent
              announcements={announcements}
              loading={loading}
              t={t}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className='m-0 mt-4 shrink-0 flex-row flex-wrap justify-end rounded-none border-0 bg-transparent p-0'>
          <Button
            variant='secondary'
            className={notificationActionClassName}
            onClick={onCloseToday}
          >
            {t('Close Today')}
          </Button>
          <DialogClose
            render={
              <Button
                variant='secondary'
                className={notificationActionClassName}
              />
            }
          >
            {t('Close Announcement')}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
