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
import type { CustomerSupportConfig } from '@/lib/customer-support'

export function CustomerSupportContent(props: {
  config: CustomerSupportConfig
}) {
  const { t } = useTranslation()
  return (
    <div className='space-y-5 text-center text-sm break-words'>
      {props.config.description && (
        <p className='whitespace-pre-wrap'>{props.config.description}</p>
      )}
      {props.config.qr_code && (
        <img
          src={props.config.qr_code}
          alt={t('Support QR code')}
          className='mx-auto h-auto max-h-80 w-52 max-w-full object-contain'
        />
      )}
      <div className='space-y-2'>
        {props.config.name && <p>{props.config.name}</p>}
        {props.config.phone && (
          <p>
            {t('Phone number')}: {props.config.phone}
          </p>
        )}
        {props.config.wechat && (
          <p>
            {t('WeChat ID')}: {props.config.wechat}
          </p>
        )}
      </div>
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
      contentClassName={props.contentClassName ?? 'sm:max-w-md'}
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
        contentClassName='z-70 sm:max-w-md'
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
