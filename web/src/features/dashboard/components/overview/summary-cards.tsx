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
  Coins,
  Gauge,
  History,
  KeyRound,
  Layers,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { Card } from '@/components/ui/card'
import { useOverviewSummary } from '@/features/dashboard/hooks/use-overview-summary'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber, formatQuota } from '@/lib/format'

import { StatCard } from '../ui/stat-card'

export function SummaryCards() {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const { account, keys, usage, performance, totals, currency } =
    useOverviewSummary()
  const accountLoading = account.isPending || currency.isPending
  const accountError = account.isError || currency.isError
  const dailyDescription = t('Today since local midnight')
  const items = [
    {
      key: 'balance',
      title: t('Account balance'),
      icon: Wallet,
      iconTone: 'success' as const,
      value: formatQuota(account.data?.data?.quota ?? 0),
      description:
        (account.data?.data?.quota ?? 0) > 0
          ? t('Available balance')
          : t('Balance depleted'),
      loading: accountLoading,
      error: accountError,
    },
    {
      key: 'keys',
      title: t('API Keys'),
      icon: KeyRound,
      iconTone: 'info' as const,
      value: formatNumber(keys.data?.data?.total ?? 0, locale),
      description: t('Total API keys'),
      loading: keys.isPending,
      error: keys.isError,
    },
    {
      key: 'today-requests',
      title: t('Today’s requests'),
      icon: Activity,
      iconTone: 'success' as const,
      value: formatNumber(totals.totalCount, locale),
      description: dailyDescription,
      loading: usage.isPending,
      error: usage.isError,
    },
    {
      key: 'today-usage',
      title: t('Today’s consumption'),
      icon: Coins,
      iconTone: 'violet' as const,
      value: formatQuota(totals.totalQuota),
      description: dailyDescription,
      loading: usage.isPending || currency.isPending,
      error: usage.isError || currency.isError,
    },
    {
      key: 'today-tokens',
      title: t('Today’s tokens'),
      icon: Layers,
      iconTone: 'warning' as const,
      value: formatNumber(totals.totalTokens, locale),
      description: `${t('Cache Read')}: ${formatNumber(totals.totalCacheReadTokens, locale)} · ${t('Cache Write')}: ${formatNumber(totals.totalCacheCreationTokens, locale)}`,
      loading: usage.isPending,
      error: usage.isError,
    },
    {
      key: 'total-usage',
      title: t('Total consumed'),
      icon: History,
      iconTone: 'indigo' as const,
      value: formatQuota(account.data?.data?.used_quota ?? 0),
      description: t('Lifetime consumption'),
      loading: accountLoading,
      error: accountError,
    },
    {
      key: 'performance',
      title: t('Request performance'),
      icon: Gauge,
      iconTone: 'violet' as const,
      value: `${formatNumber(performance.data?.data?.rpm ?? 0, locale)} RPM`,
      description: `${formatNumber(performance.data?.data?.tpm ?? 0, locale)} TPM · ${t('Last 60 seconds')}`,
      loading: performance.isPending,
      error: performance.isError,
    },
    {
      key: 'total-requests',
      title: t('Total requests made'),
      icon: Activity,
      iconTone: 'destructive' as const,
      value: formatNumber(account.data?.data?.request_count ?? 0, locale),
      description: t('Lifetime requests'),
      loading: account.isPending,
      error: account.isError,
    },
  ]
  const failedQueries = [account, keys, usage, performance, currency].filter(
    (query) => query.isError
  )

  return (
    <section className='min-w-0 space-y-4' aria-label={t('Usage at a glance')}>
      <div
        role='list'
        aria-label={t('Usage at a glance')}
        className='grid min-w-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4'
      >
        {items.map((item) => (
          <Card
            key={item.key}
            role='listitem'
            aria-label={item.title}
            className='min-w-0 gap-0 rounded-2xl border py-0 shadow-xs ring-0'
          >
            <StatCard
              title={item.title}
              icon={item.icon}
              iconTone={item.iconTone}
              value={item.value}
              loading={item.loading}
              error={item.error}
              layout='inline'
              description={item.error ? t('Failed to load') : item.description}
            />
          </Card>
        ))}
      </div>
      <p className='text-muted-foreground text-xs leading-relaxed'>
        {t(
          'Daily usage is aggregated hourly and may be delayed. All metrics are for your account.'
        )}
      </p>
      {failedQueries.length > 0 && (
        <ErrorState
          className='min-h-0 py-4'
          title={t('Failed to load')}
          description={t(
            'Some statistics could not be loaded. Retry to refresh them.'
          )}
          onRetry={() => {
            for (const query of failedQueries) void query.refetch()
          }}
        />
      )}
    </section>
  )
}
