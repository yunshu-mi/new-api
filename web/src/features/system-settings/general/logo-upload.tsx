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
import { Upload01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FormControl, FormDescription, FormLabel } from '@/components/ui/form'
import { DEFAULT_LOGO } from '@/lib/constants'

type LogoUploadProps = {
  label: string
  fallback?: string
  value: string
  onChange: (value: string) => void
  onBusyChange: (busy: boolean) => void
  disabled: boolean
}

export function LogoUpload(props: LogoUploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isReading, setIsReading] = useState(false)
  const logo = props.value || props.fallback || DEFAULT_LOGO
  const isCustom = !!props.value && props.value !== DEFAULT_LOGO
  const disabled = props.disabled || isReading
  let status = t('Using original logo')
  if (isCustom) status = t('Custom logo configured')
  else if (props.fallback) status = t('Using light mode logo')

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('Please choose a PNG or WebP image'))
      return
    }
    if (file.size > 100 * 1024) {
      toast.error(t('Logo file must be 100 KB or smaller'))
      return
    }

    setIsReading(true)
    props.onBusyChange(true)
    const reader = new FileReader()
    reader.addEventListener('load', async () => {
      try {
        if (typeof reader.result !== 'string') throw new Error('Invalid image')
        const image = new Image()
        image.src = reader.result
        await image.decode()
        props.onChange(reader.result)
      } catch {
        toast.error(t('Unable to read logo image'))
      } finally {
        setIsReading(false)
        props.onBusyChange(false)
      }
    })
    reader.addEventListener('error', () => {
      toast.error(t('Unable to read logo image'))
      setIsReading(false)
      props.onBusyChange(false)
    })
    reader.readAsDataURL(file)
  }

  return (
    <div className='bg-muted/30 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center'>
      <img
        src={logo}
        alt=''
        className='bg-background size-10 shrink-0 rounded-lg border object-contain p-1.5'
      />
      <div className='min-w-0 flex-1 space-y-1'>
        <FormLabel>{props.label}</FormLabel>
        <FormDescription>
          {t(
            'Upload a PNG or WebP image up to 100 KB. A transparent background is recommended.'
          )}
        </FormDescription>
        <p className='text-primary text-xs' role='status'>
          {status}
        </p>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <FormControl>
          <input
            ref={inputRef}
            type='file'
            accept='image/png,image/webp'
            className='sr-only'
            disabled={disabled}
            onChange={handleFileChange}
          />
        </FormControl>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={disabled}
          aria-label={t('Choose file for {{label}}', { label: props.label })}
          onClick={() => inputRef.current?.click()}
        >
          <HugeiconsIcon
            icon={Upload01Icon}
            data-icon='inline-start'
            aria-hidden='true'
          />
          {t('Choose file')}
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-destructive'
          disabled={disabled || !isCustom}
          aria-label={t('Restore original for {{label}}', {
            label: props.label,
          })}
          onClick={() => props.onChange('')}
        >
          {t('Restore original')}
        </Button>
      </div>
    </div>
  )
}
