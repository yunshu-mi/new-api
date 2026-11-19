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
import { z } from 'zod'

const supportContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  wechat: z.string(),
  qr_code: z.string(),
})

export const customerSupportSchema = z.object({
  enabled: z.boolean(),
  title: z.string(),
  description: z.string(),
  ...supportContactSchema.shape,
  second_contact: supportContactSchema,
})

export type SupportContact = z.infer<typeof supportContactSchema>
export type CustomerSupportConfig = z.infer<typeof customerSupportSchema>

const emptyContact: SupportContact = {
  name: '',
  phone: '',
  wechat: '',
  qr_code: '',
}

export function hasSupportContact(contact: SupportContact): boolean {
  return Boolean(
    contact.name.trim() ||
    contact.phone.trim() ||
    contact.wechat.trim() ||
    contact.qr_code.trim()
  )
}

export function parseCustomerSupportConfig(
  value: unknown
): CustomerSupportConfig {
  let parsed = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      parsed = {}
    }
  }
  const defaults = {
    enabled: false,
    title: '',
    description: '',
    ...emptyContact,
    second_contact: emptyContact,
  }
  const config = typeof parsed === 'object' && parsed !== null ? parsed : {}
  const second = 'second_contact' in config ? config.second_contact : undefined
  const result = customerSupportSchema.safeParse({
    ...defaults,
    ...config,
    second_contact: {
      ...emptyContact,
      ...(typeof second === 'object' && second !== null ? second : {}),
    },
  })
  return result.success ? result.data : defaults
}
