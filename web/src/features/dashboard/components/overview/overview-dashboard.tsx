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
import { Link, linkOptions } from '@tanstack/react-router'
import { ChartNoAxesCombined, FileText, KeyRound, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { useIsSidebarModuleVisible } from '@/hooks/use-sidebar-config'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { useDashboardContentVisibility } from '../../hooks/use-status-data'
import { AnnouncementsPanel } from './announcements-panel'
import { FAQPanel } from './faq-panel'
import { PerformanceHealthPanel } from './performance-health-panel'
import { SummaryCards } from './summary-cards'
import { UptimePanel } from './uptime-panel'

export function OverviewDashboard() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const {
    announcements: showAnnouncementsPanel,
    faq: showFAQPanel,
    uptimeKuma: showUptimePanel,
  } = useDashboardContentVisibility()

  const isAdmin = Boolean(user?.role && user.role >= ROLE.ADMIN)
  const showLeftContentPanels =
    isAdmin || showAnnouncementsPanel || showFAQPanel
  const showContentPanels = showLeftContentPanels || showUptimePanel
  const showKeys = useIsSidebarModuleVisible('/keys')
  const showWallet = useIsSidebarModuleVisible('/wallet')
  const showDashboard = useIsSidebarModuleVisible('/dashboard/models')
  const showLogs = useIsSidebarModuleVisible('/usage-logs/common')
  const quickLinks = [
    {
      link: linkOptions({ to: '/keys' }),
      icon: KeyRound,
      label: t('API Keys'),
      visible: showKeys,
    },
    {
      link: linkOptions({ to: '/wallet' }),
      icon: Wallet,
      label: t('Wallet'),
      visible: showWallet,
    },
    {
      link: linkOptions({
        to: '/dashboard/$section',
        params: { section: 'models' },
      }),
      icon: ChartNoAxesCombined,
      label: t('Dashboard'),
      visible: showDashboard,
    },
    {
      link: linkOptions({
        to: '/usage-logs/$section',
        params: { section: 'common' },
      }),
      icon: FileText,
      label: t('Usage Logs'),
      visible: showLogs,
    },
  ].filter((item) => item.visible)

  return (
    <SectionPageLayout
      headerDescription={t('Monitor balance, usage, and request volume')}
    >
      <SectionPageLayout.Title>
        {t('Platform Overview')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto flex w-full max-w-7xl flex-col gap-4'>
          <SummaryCards />

          {quickLinks.length > 0 && (
            <Card
              className='bg-border flex-row flex-wrap gap-px py-0'
              data-card-hover='false'
            >
              {quickLinks.map(({ link, icon: Icon, label }) => (
                <Link
                  key={link.to}
                  {...link}
                  className={buttonVariants({
                    variant: 'ghost',
                    className:
                      'bg-card min-h-16 min-w-32 flex-1 justify-start gap-3 rounded-none border-0 px-4 whitespace-normal focus-visible:ring-inset',
                  })}
                >
                  <IconBadge
                    size='md'
                    className='border-input size-[38px] border'
                  >
                    <Icon />
                  </IconBadge>
                  {label}
                </Link>
              ))}
            </Card>
          )}

          {showContentPanels && (
            <CardStaggerContainer
              className={cn(
                'grid grid-cols-1 gap-4',
                showLeftContentPanels &&
                  showUptimePanel &&
                  'xl:grid-cols-[minmax(0,1fr)_22rem]'
              )}
            >
              {showLeftContentPanels && (
                <div
                  className={cn(
                    'grid min-w-0 grid-cols-1 gap-4',
                    showAnnouncementsPanel && showFAQPanel && 'lg:grid-cols-2'
                  )}
                >
                  {isAdmin && (
                    <CardStaggerItem className='col-span-full'>
                      <PerformanceHealthPanel />
                    </CardStaggerItem>
                  )}
                  {showAnnouncementsPanel && (
                    <CardStaggerItem>
                      <AnnouncementsPanel />
                    </CardStaggerItem>
                  )}
                  {showFAQPanel && (
                    <CardStaggerItem>
                      <FAQPanel />
                    </CardStaggerItem>
                  )}
                </div>
              )}
              {showUptimePanel && (
                <CardStaggerItem>
                  <UptimePanel />
                </CardStaggerItem>
              )}
            </CardStaggerContainer>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
