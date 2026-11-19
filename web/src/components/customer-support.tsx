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
import { Headset } from 'lucide-react'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useCustomerSupport } from '@/hooks/use-customer-support'
import {
  hasSupportContact,
  type CustomerSupportConfig,
  type SupportContact,
} from '@/lib/customer-support'
import { cn } from '@/lib/utils'

function SupportContactDetails(props: {
  contact: SupportContact
  label?: string
}) {
  const { t } = useTranslation()
  return (
    <div
      className='min-w-0 space-y-5'
      role={props.label ? 'group' : undefined}
      aria-label={props.label}
    >
      {props.contact.qr_code && (
        <img
          src={props.contact.qr_code}
          alt={t('Support QR code')}
          className='mx-auto h-auto max-h-80 w-52 max-w-full object-contain'
        />
      )}
      <div className='space-y-2'>
        {props.contact.name && <p>{props.contact.name}</p>}
        {props.contact.phone && (
          <p>
            {t('Phone number')}: {props.contact.phone}
          </p>
        )}
        {props.contact.wechat && (
          <p>
            {t('WeChat ID')}: {props.contact.wechat}
          </p>
        )}
      </div>
    </div>
  )
}

export function CustomerSupportContent(props: {
  config: CustomerSupportConfig
}) {
  const { t } = useTranslation()
  const hasFirst = hasSupportContact(props.config)
  const hasSecond = hasSupportContact(props.config.second_contact)
  const showBoth = hasFirst && hasSecond

  return (
    <div className='space-y-5 text-center text-sm break-words'>
      {props.config.description && (
        <p className='whitespace-pre-wrap'>{props.config.description}</p>
      )}
      {(hasFirst || hasSecond) && (
        <div className={cn('grid gap-6', showBoth && 'sm:grid-cols-2')}>
          {hasFirst && (
            <SupportContactDetails
              contact={props.config}
              label={showBoth ? t('First support contact') : undefined}
            />
          )}
          {hasSecond && (
            <SupportContactDetails
              contact={props.config.second_contact}
              label={showBoth ? t('Second support contact') : undefined}
            />
          )}
        </div>
      )}
    </div>
  )
}

export function CustomerSupportDialog(props: {
  config: CustomerSupportConfig
  trigger: ReactElement
  contentClassName?: string
}) {
  const { t } = useTranslation()

  return (
    <Dialog
      title={props.config.title || t('Contact support')}
      trigger={props.trigger}
      contentClassName={cn(
        hasSupportContact(props.config) &&
          hasSupportContact(props.config.second_contact)
          ? 'sm:max-w-xl'
          : 'sm:max-w-md',
        props.contentClassName
      )}
      titleClassName='pr-6 break-words'
      bodyClassName='text-center'
    >
      <CustomerSupportContent config={props.config} />
    </Dialog>
  )
}

export function CustomerSupport() {
  const { t } = useTranslation()
  const config = useCustomerSupport('header')

  if (!config) return null

  return (
    <CustomerSupportDialog
      config={config}
      trigger={
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label={t('Contact support')}
          title={t('Contact support')}
        >
          <Headset className='size-4' aria-hidden='true' />
        </Button>
      }
    />
  )
}

export function CustomerSupportSidebarItem(props: {
  config: CustomerSupportConfig
}) {
  const { t } = useTranslation()
  const label = t('Contact support')

  return (
    <SidebarMenuItem>
      <CustomerSupportDialog
        config={props.config}
        contentClassName='z-70'
        trigger={
          <SidebarMenuButton type='button' aria-label={label} tooltip={label}>
            <Headset aria-hidden='true' />
            <span className='min-w-0 flex-1 truncate'>{label}</span>
          </SidebarMenuButton>
        }
      />
    </SidebarMenuItem>
  )
}
