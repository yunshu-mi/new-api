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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { t } = useTranslation()

  return (
    <AuthLayout variant='split'>
      <div className='sign-in-card-content flex w-full min-w-0 flex-col gap-6'>
        <div className='sign-in-heading'>
          <h1>{t('Create an account')}</h1>
          <p>{t('Enter your details to create an account')}</p>
        </div>

        <SignUpForm />

        <p className='sign-in-register'>
          {t('Already have an account?')}{' '}
          <Link to='/sign-in' className='sign-in-link'>
            {t('Sign in')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
