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
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { getUserQuotaDates } from '@/features/dashboard/api'
import { calculateDashboardStats } from '@/features/dashboard/lib/stats'
import { getApiKeys } from '@/features/keys/api'
import { getUserProfile } from '@/features/profile/api'
import { getUserLogStats } from '@/features/usage-logs/api'
import { requireServerSuccess } from '@/lib/server-error-message'
import { statusQueryOptions } from '@/lib/status-query'
import { toStartOfDay } from '@/lib/time'
import { useAuthStore } from '@/stores/auth-store'

export function useOverviewSummary() {
  const userId = useAuthStore((state) => state.auth.user?.id)
  const currency = useQuery(statusQueryOptions)
  const [start, setStart] = useState(() =>
    toStartOfDay(Math.floor(Date.now() / 1000))
  )
  useEffect(() => {
    const midnight = new Date(start * 1000)
    midnight.setDate(midnight.getDate() + 1)
    const timer = window.setTimeout(
      () => {
        setStart(toStartOfDay(Math.floor(Date.now() / 1000)))
      },
      Math.max(0, midnight.getTime() - Date.now())
    )
    return () => window.clearTimeout(timer)
  }, [start])
  const options = {
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchInterval: 60_000,
  }
  // 与钱包共用账户接口，避免把登录时缓存的余额当作当前余额。
  const account = useQuery({
    ...options,
    queryKey: ['dashboard', 'overview', 'account', userId],
    queryFn: async () => requireServerSuccess(await getUserProfile()),
  })
  // 只取分页总数，不下载全部密钥，也不把单页启用数量误认为账户总数。
  const keys = useQuery({
    ...options,
    queryKey: ['dashboard', 'overview', 'keys', userId],
    queryFn: async () =>
      requireServerSuccess(await getApiKeys({ p: 1, size: 1 })),
  })
  const usage = useQuery({
    ...options,
    queryKey: ['dashboard', 'overview', 'today', userId, start],
    queryFn: async () => {
      const end = Math.floor(Date.now() / 1000)
      const response = requireServerSuccess(
        await getUserQuotaDates({
          start_timestamp: start,
          end_timestamp: end,
          default_time: 'hour',
        })
      )
      return {
        ...response,
        data: (response.data ?? []).filter(
          (item) => item.created_at >= start && item.created_at <= end
        ),
      }
    },
  })
  // 此接口的 rpm/tpm 固定统计最近 60 秒，与 quota 的筛选时间范围不同。
  const performance = useQuery({
    ...options,
    queryKey: ['dashboard', 'overview', 'rates', userId],
    queryFn: async () => {
      const end = Math.floor(Date.now() / 1000)
      return requireServerSuccess(
        await getUserLogStats({
          start_timestamp: end - 60,
          end_timestamp: end,
        })
      )
    },
  })

  return {
    account,
    keys,
    usage,
    performance,
    totals: calculateDashboardStats(usage.data?.data ?? []),
    currency,
  }
}
