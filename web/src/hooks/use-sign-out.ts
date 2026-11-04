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
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { logout } from '@/features/auth/api'
import { clearAuthenticatedClientState } from '@/lib/auth-session'
import { handleServerError } from '@/lib/handle-server-error'

export function useSignOut(onSignedOut?: () => void) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const signingOut = useRef(false)

  const signOut = async () => {
    if (signingOut.current) return
    signingOut.current = true
    setIsSigningOut(true)
    try {
      const response = await logout()
      if (!response.success) {
        handleServerError(response, t('Failed to sign out session'))
        return
      }

      clearAuthenticatedClientState(queryClient)
      onSignedOut?.()
      toast.success(t('Signed out'), { duration: 1000 })
      void navigate({ to: '/', replace: true })
    } catch (error: unknown) {
      handleServerError(error, t('Failed to sign out session'))
    } finally {
      signingOut.current = false
      setIsSigningOut(false)
    }
  }

  return { signOut, isSigningOut }
}
