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
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, Upload } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { useForm, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { CustomerSupportContent } from '@/components/customer-support'
import { Button } from '@/components/ui/button'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  customerSupportSchema,
  parseCustomerSupportConfig,
  type CustomerSupportConfig,
} from '@/lib/customer-support'

import {
  SettingsForm,
  SettingsSwitchField,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

export function CustomerSupportSection(props: { defaultValue: string }) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const switchId = useId()
  const [readingImage, setReadingImage] = useState(false)
  const defaults = useMemo(() => {
    const config = parseCustomerSupportConfig(props.defaultValue)
    return { ...config, title: config.title || t('Contact support') }
  }, [props.defaultValue, t])
  const schema = customerSupportSchema.superRefine((values, context) => {
    if (values.enabled && !values.title.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['title'],
        message: t('Popup title is required'),
      })
    }
    for (const key of ['title', 'description'] as const) {
      if ([...values[key]].length > (key === 'description' ? 1000 : 100)) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: t('Customer support text exceeds the length limit'),
        })
      }
    }
    for (const key of ['name', 'phone', 'wechat'] as const) {
      if ([...values[key]].length > 100) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: t('Customer support text exceeds the length limit'),
        })
      }
      if ([...values.second_contact[key]].length > 100) {
        context.addIssue({
          code: 'custom',
          path: ['second_contact', key],
          message: t('Customer support text exceeds the length limit'),
        })
      }
    }
  })
  const form = useForm<CustomerSupportConfig>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })
  const values = form.watch()

  useEffect(() => {
    form.reset(defaults)
  }, [defaults, form])

  const onSubmit = (config: CustomerSupportConfig) => {
    if (
      readingImage ||
      JSON.stringify(config) ===
        JSON.stringify(parseCustomerSupportConfig(props.defaultValue))
    ) {
      return
    }
    updateOption.mutate({
      key: 'console_setting.customer_support',
      value: JSON.stringify(config),
    })
  }

  return (
    <SettingsSection title={t('Customer support')}>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Show a support button in the top right. Save changes to apply. Turning it off preserves your configuration.'
        )}
      </p>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
            isSaveDisabled={readingImage}
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchField
                controlId={switchId}
                className='flex-col items-start gap-3'
                label={t('Show support button')}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <FormField
            control={form.control}
            name='title'
            render={({ field }) => (
              <FormItem data-settings-form-span='full'>
                <FormLabel required>{t('Popup title')}</FormLabel>
                <FormControl>
                  <Input maxLength={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Description')}</FormLabel>
                <FormControl>
                  <Textarea rows={4} maxLength={1000} {...field} />
                </FormControl>
                <FormDescription className='text-end'>
                  {[...field.value].length} / 1000
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <SupportContactFields
            title={t('First support contact')}
            readingImage={readingImage}
            onReadingImageChange={setReadingImage}
          />
          <SupportContactFields
            title={t('Second support contact')}
            second
            readingImage={readingImage}
            onReadingImageChange={setReadingImage}
          />
          <div className='bg-muted/20 space-y-6 rounded-lg border p-4 sm:p-6'>
            <h3 className='text-sm font-semibold'>
              {values.title || t('Contact support')}
            </h3>
            <CustomerSupportContent config={values} />
          </div>
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}

function SupportContactFields(props: {
  title: string
  second?: boolean
  readingImage: boolean
  onReadingImageChange: (reading: boolean) => void
}) {
  const { t } = useTranslation()
  const form = useFormContext<CustomerSupportConfig>()
  const fileInput = useRef<HTMLInputElement>(null)
  const qrCodeField = props.second ? 'second_contact.qr_code' : 'qr_code'
  const fields = [
    ['name', t('Support name')],
    ['phone', t('Phone number')],
    ['wechat', t('WeChat ID')],
  ] as const

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || props.readingImage) return
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      form.setError(qrCodeField, {
        message: t(
          'Support QR code must be a PNG, JPEG or WebP image up to 5 MB'
        ),
      })
      return
    }
    props.onReadingImageChange(true)
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        form.setValue(qrCodeField, reader.result, { shouldDirty: true })
        form.clearErrors(qrCodeField)
      }
    })
    reader.addEventListener('error', () => {
      form.setError(qrCodeField, { message: t('Failed to read QR code image') })
    })
    reader.addEventListener('loadend', () => props.onReadingImageChange(false))
    reader.readAsDataURL(file)
  }

  return (
    <FieldSet className='min-w-0 gap-5'>
      <FieldLegend variant='label'>{props.title}</FieldLegend>
      <div className='grid min-w-0 gap-5 sm:grid-cols-2'>
        {fields.map(([key, label]) => (
          <FormField
            key={key}
            control={form.control}
            name={props.second ? `second_contact.${key}` : key}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input
                    type={key === 'phone' ? 'tel' : 'text'}
                    maxLength={100}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
      <FormField
        control={form.control}
        name={qrCodeField}
        render={({ field }) => (
          <FormItem>
            <div className='bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-4'>
              <ImageIcon
                className='text-muted-foreground size-5'
                aria-hidden='true'
              />
              <div className='min-w-0 flex-1 space-y-1'>
                <FormLabel>{t('Support QR code')}</FormLabel>
                <FormDescription>
                  {t(
                    'PNG, JPEG or WebP, up to 5 MB. A clear square image is recommended.'
                  )}
                </FormDescription>
                <p className='text-muted-foreground text-xs'>
                  {field.value
                    ? t('Custom QR code configured')
                    : t('No QR code configured')}
                </p>
              </div>
              <FormControl>
                <input
                  ref={fileInput}
                  type='file'
                  accept='image/png,image/jpeg,image/webp'
                  className='sr-only'
                  onChange={onImageChange}
                  disabled={props.readingImage}
                />
              </FormControl>
              <Button
                type='button'
                variant='outline'
                disabled={props.readingImage}
                onClick={() => fileInput.current?.click()}
              >
                <Upload aria-hidden='true' />
                {t('Choose file')}
              </Button>
              <Button
                type='button'
                variant='ghost'
                className='text-destructive'
                disabled={!field.value || props.readingImage}
                onClick={() => {
                  field.onChange('')
                  form.clearErrors(qrCodeField)
                }}
              >
                {t('Remove QR code')}
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </FieldSet>
  )
}
