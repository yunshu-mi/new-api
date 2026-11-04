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
import type { CSSProperties } from 'react'

export type UserAvatarStyle = Pick<CSSProperties, 'backgroundColor' | 'color'>

const DEFAULT_USER_AVATAR_ID = '01_default_user'

export const USER_AVATAR_PRESETS = [
  { id: DEFAULT_USER_AVATAR_ID, label: 'Default avatar' },
  { id: '01_long_hair_woman', label: 'Long-haired woman' },
  { id: '02_glasses_boy', label: 'Boy with glasses' },
  { id: '05_mountain', label: 'Mountain' },
  { id: '06_sunset', label: 'Sunset' },
  { id: '07_moon', label: 'Moon' },
] as const

export function getUserAvatarId(avatar?: string): string {
  return (
    USER_AVATAR_PRESETS.find((preset) => preset.id === avatar)?.id ??
    DEFAULT_USER_AVATAR_ID
  )
}

export function getUserAvatarUrl(avatar?: string): string {
  return `/avatars/${getUserAvatarId(avatar)}.png`
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

export function getUserAvatarStyle(name: string): UserAvatarStyle {
  const hash = hashString(name)
  const hue = hash % 360
  const saturation = 54 + (hash % 8)
  const lightness = 52 + ((hash >> 4) % 8)

  return {
    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
    color: 'white',
  }
}

export function getUserAvatarFallback(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}
