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
import { useTranslation } from 'react-i18next'

import { LoadingState } from '@/components/loading-state'
import { ItemGroup } from '@/components/ui/item'
import { ApiInfoItemComponent } from '@/features/dashboard/components/overview/api-info-item'
import { useApiInfo } from '@/features/dashboard/hooks/use-status-data'
import { useStatus } from '@/hooks/use-status'

export function ApiKeyAddresses() {
  const { t } = useTranslation()
  const { status, loading } = useStatus()
  const { items } = useApiInfo()

  if (loading) {
    return <LoadingState inline size='sm' message={t('Loading...')} />
  }

  const serverAddress =
    (typeof status?.server_address === 'string' &&
      status.server_address.trim()) ||
    ''
  const addresses = items.length
    ? items
    : [
        {
          url: serverAddress || window.location.origin,
          route: serverAddress ? t('Default API address') : t('Current domain'),
          description: '',
          color: 'grey',
        },
      ]

  return (
    <ItemGroup
      aria-label={t('API Addresses')}
      className='max-h-48 items-start overflow-y-auto *:shrink-0'
    >
      {addresses.map((address) => (
        <ApiInfoItemComponent
          key={address.url}
          item={address}
          variant='inline'
        />
      ))}
    </ItemGroup>
  )
}
