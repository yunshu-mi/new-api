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
import { Camera01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  getUserAvatarId,
  getUserAvatarUrl,
  USER_AVATAR_PRESETS,
} from '@/lib/avatar'
import { requireServerSuccess } from '@/lib/server-error-message'

import { updateUserAvatar } from '../api'

type AvatarSettingsDialogProps = {
  avatar?: string
  onSaved: (avatar: string) => void
}

export function AvatarSettingsDialog(props: AvatarSettingsDialogProps) {
  const { t } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const saved = getUserAvatarId(props.avatar)
  const [selected, setSelected] = useState(saved)
  const saveAvatar = useMutation({
    mutationFn: async (avatar: string) =>
      requireServerSuccess(await updateUserAvatar(avatar)),
    onSuccess: (_response, avatar) => {
      props.onSaved(avatar)
      setOpen(false)
      toast.success(t('Profile updated successfully'))
    },
  })

  return (
    <Dialog
      title={t('Change avatar')}
      description={t('Choose a system avatar.')}
      open={open}
      onOpenChange={(nextOpen) => {
        if (saveAvatar.isPending) return
        if (nextOpen) setSelected(saved)
        setOpen(nextOpen)
      }}
      trigger={
        <Button variant='outline' size='sm' className='shrink-0'>
          <HugeiconsIcon
            icon={Camera01Icon}
            aria-hidden='true'
            data-icon='inline-start'
          />
          {t('Change avatar')}
        </Button>
      }
      contentClassName='sm:max-w-lg'
      footer={
        <>
          <Button
            variant='outline'
            disabled={saveAvatar.isPending}
            onClick={() => setOpen(false)}
          >
            {t('Cancel')}
          </Button>
          <Button
            disabled={selected === saved || saveAvatar.isPending}
            onClick={() => saveAvatar.mutate(selected)}
          >
            {t('Save')}
          </Button>
        </>
      }
    >
      <RadioGroup
        aria-label={t('Change avatar')}
        className='grid-cols-2 sm:grid-cols-3'
        value={selected}
        onValueChange={setSelected}
        disabled={saveAvatar.isPending}
      >
        {USER_AVATAR_PRESETS.map((preset) => {
          const optionId = `${id}-${preset.id}`
          const src = getUserAvatarUrl(preset.id)
          return (
            <div
              key={preset.id}
              className='hover:bg-muted/50 has-data-checked:border-primary relative rounded-lg border'
            >
              <RadioGroupItem
                id={optionId}
                value={preset.id}
                className='absolute start-2 top-2'
              />
              <Label
                htmlFor={optionId}
                className='flex h-full cursor-pointer flex-col gap-2 px-2 py-3 text-center'
              >
                <img
                  src={src}
                  alt=''
                  className='size-12 rounded-full object-cover'
                />
                {t(preset.label)}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </Dialog>
  )
}
