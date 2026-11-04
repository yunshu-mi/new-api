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
import { useState, type BaseSyntheticEvent } from 'react'
import { useWatch, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

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
import { DEFAULT_LOGO } from '@/lib/constants'

import { FormDirtyIndicator } from '../components/form-dirty-indicator'
import { FormNavigationGuard } from '../components/form-navigation-guard'
import {
  SettingsForm,
  SettingsFormGrid,
  SettingsFormGridItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useSettingsForm } from '../hooks/use-settings-form'
import { useUpdateOption } from '../hooks/use-update-option'
import { LogoUpload } from './logo-upload'
import { isValidTaskPublicAddress } from './task-public-address'

const _systemInfoSchema = z.object({
  SystemName: z.string().min(1),
  ServerAddress: z.string().optional(),
  TaskPublicAddress: z.string().refine(isValidTaskPublicAddress),
  Logo: z.string().url().optional().or(z.literal('')),
  Footer: z.string().optional(),
  About: z.string().optional(),
  HomePageContent: z.string().optional(),
  general_setting: z.object({
    docs_link: z.string(),
    icp_record: z.string().optional(),
    logo_dark: z.string().url().optional().or(z.literal('')),
  }),
  legal: z.object({
    user_agreement: z.string().optional(),
    privacy_policy: z.string().optional(),
  }),
})

type SystemInfoFormValues = z.infer<typeof _systemInfoSchema>

type SystemInfoSectionProps = {
  defaultValues: SystemInfoFormValues
}

function normalizeValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

export function SystemInfoSection({ defaultValues }: SystemInfoSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [isReadingLogo, setIsReadingLogo] = useState(false)

  const normalizedDefaults: SystemInfoFormValues = {
    SystemName: normalizeValue(defaultValues.SystemName),
    ServerAddress: normalizeValue(defaultValues.ServerAddress),
    TaskPublicAddress: normalizeValue(defaultValues.TaskPublicAddress),
    Logo: normalizeValue(defaultValues.Logo),
    Footer: normalizeValue(defaultValues.Footer),
    About: normalizeValue(defaultValues.About),
    HomePageContent: normalizeValue(defaultValues.HomePageContent),
    general_setting: {
      docs_link: normalizeValue(defaultValues.general_setting?.docs_link),
      icp_record: normalizeValue(defaultValues.general_setting?.icp_record),
      logo_dark: normalizeValue(defaultValues.general_setting?.logo_dark),
    },
    legal: {
      user_agreement: normalizeValue(defaultValues.legal?.user_agreement),
      privacy_policy: normalizeValue(defaultValues.legal?.privacy_policy),
    },
  }

  const systemInfoSchemaWithI18n = z.object({
    SystemName: z.string().min(1, {
      error: () => t('System name is required'),
    }),
    ServerAddress: z.string().optional(),
    TaskPublicAddress: z.string().refine(isValidTaskPublicAddress, {
      error: () =>
        t(
          'Enter an absolute HTTP(S) URL without credentials, query parameters, or fragments'
        ),
    }),
    Logo: z.string().url().optional().or(z.literal('')),
    Footer: z.string().optional(),
    About: z.string().optional(),
    HomePageContent: z.string().optional(),
    general_setting: z.object({
      docs_link: z.string(),
      icp_record: z.string().optional(),
      logo_dark: z.string().url().optional().or(z.literal('')),
    }),
    legal: z.object({
      user_agreement: z.string().optional(),
      privacy_policy: z.string().optional(),
    }),
  })

  const { form, handleSubmit, handleReset, isDirty, isSubmitting } =
    useSettingsForm<SystemInfoFormValues>({
      resolver: zodResolver(systemInfoSchemaWithI18n) as Resolver<
        SystemInfoFormValues,
        unknown,
        SystemInfoFormValues
      >,
      defaultValues: normalizedDefaults,
      onSubmit: async (_data, changedFields) => {
        for (const [key, value] of Object.entries(changedFields)) {
          let v = normalizeValue(value)
          if (key === 'ServerAddress' || key === 'TaskPublicAddress') {
            v = v.replace(/\/+$/, '')
          }
          await updateOption.mutateAsync({
            key,
            value: v,
          })
        }
      },
    })

  const [lightLogo, darkLogo] = useWatch({
    control: form.control,
    name: ['Logo', 'general_setting.logo_dark'],
  })

  const handleSave = async (event?: BaseSyntheticEvent) => {
    event?.preventDefault()
    if (isReadingLogo) return
    try {
      await handleSubmit(event)
    } catch {
      // 更新失败由 mutation 提示，保留表单草稿供重试。
    }
  }

  return (
    <>
      <FormNavigationGuard when={isDirty} />

      <SettingsSection title={t('System Information')}>
        <Form {...form}>
          <SettingsForm onSubmit={handleSave}>
            <SettingsPageFormActions
              onSave={handleSave}
              onReset={handleReset}
              isSaving={isSubmitting || updateOption.isPending}
              isSaveDisabled={isReadingLogo}
              isResetDisabled={!isDirty || isReadingLogo}
            />
            <FormDirtyIndicator isDirty={isDirty} />
            <SettingsFormGrid className='items-start'>
              <FieldSet className='min-w-0'>
                <FieldLegend>{t('Basic Information')}</FieldLegend>
                <FormField
                  control={form.control}
                  name='SystemName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('System Name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('New API')} {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('The name displayed across the application')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='ServerAddress'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Server Address')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='https://yourdomain.com'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'The public URL of your server, used for OAuth callbacks, webhooks, and other external integrations'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='TaskPublicAddress'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Async Task Public Address')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='https://media.example.com/tasks'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Public base URL for async task media. Supports a dedicated media domain, port, or Nginx path prefix; falls back to Server Address when empty.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldSet>

              <FieldSet className='@container min-w-0 gap-3'>
                <FieldLegend>{t('Logo')}</FieldLegend>
                <FormField
                  control={form.control}
                  name='Logo'
                  render={({ field }) => (
                    <FormItem>
                      <LogoUpload
                        label={t('Light mode logo')}
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBusyChange={setIsReadingLogo}
                        disabled={
                          isReadingLogo ||
                          isSubmitting ||
                          updateOption.isPending
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='general_setting.logo_dark'
                  render={({ field }) => (
                    <FormItem>
                      <LogoUpload
                        label={t('Dark mode logo (optional)')}
                        value={field.value || ''}
                        fallback={lightLogo || DEFAULT_LOGO}
                        onChange={field.onChange}
                        onBusyChange={setIsReadingLogo}
                        disabled={
                          isReadingLogo ||
                          isSubmitting ||
                          updateOption.isPending
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='grid grid-cols-2 gap-2'>
                  <div className='flex min-w-0 flex-col items-center gap-3 rounded-lg border bg-white p-4 text-slate-900'>
                    <img
                      src={lightLogo || DEFAULT_LOGO}
                      alt={t('Light logo preview')}
                      className='h-10 max-w-full object-contain'
                    />
                    <span className='text-xs'>{t('Light')}</span>
                  </div>
                  <div className='flex min-w-0 flex-col items-center gap-3 rounded-lg border bg-neutral-950 p-4 text-white'>
                    <img
                      src={darkLogo || lightLogo || DEFAULT_LOGO}
                      alt={t('Dark logo preview')}
                      className='h-10 max-w-full object-contain'
                    />
                    <span className='text-xs'>{t('Dark')}</span>
                  </div>
                </div>
              </FieldSet>
            </SettingsFormGrid>

            <div className='min-w-0 border-t pt-5'>
              <FieldSet className='min-w-0'>
                <FieldLegend>{t('Page Content')}</FieldLegend>
                <SettingsFormGrid className='items-start'>
                  <SettingsFormGridItem span='full'>
                    <FormField
                      control={form.control}
                      name='general_setting.docs_link'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Documentation Link')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('https://docs.example.com')}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('Link to your documentation site')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SettingsFormGridItem>

                  <SettingsFormGridItem>
                    <FormField
                      control={form.control}
                      name='About'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('About')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t(
                                'Enter HTML code (e.g., <p>About us...</p>) or a URL (e.g., https://example.com) to embed as iframe'
                              )}
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t(
                              'Supports HTML markup or iframe embedding. Enter HTML code directly, or provide a complete URL to automatically embed it as an iframe.'
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SettingsFormGridItem>

                  <SettingsFormGridItem>
                    <FormField
                      control={form.control}
                      name='HomePageContent'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Home Page Content')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t('Welcome to our New API...')}
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t(
                              'Content displayed on the home page (supports Markdown)'
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SettingsFormGridItem>
                </SettingsFormGrid>
              </FieldSet>
            </div>

            <div className='min-w-0 border-t pt-5'>
              <FieldSet className='min-w-0'>
                <FieldLegend>{t('Footer Settings')}</FieldLegend>
                <SettingsFormGrid className='items-start'>
                  <SettingsFormGridItem>
                    <FormField
                      control={form.control}
                      name='Footer'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Footer')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t(
                                '© 2025 Your Company. All rights reserved.'
                              )}
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('Footer text displayed at the bottom of pages')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SettingsFormGridItem>

                  <SettingsFormGridItem>
                    <FormField
                      control={form.control}
                      name='general_setting.icp_record'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('ICP filing number')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            {t(
                              'Displayed beside the copyright in the footer. Leave empty to hide.'
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SettingsFormGridItem>
                </SettingsFormGrid>
              </FieldSet>
            </div>

            <div className='min-w-0 border-t pt-5'>
              <FieldSet className='min-w-0'>
                <FieldLegend>{t('Legal Agreements')}</FieldLegend>
                <SettingsFormGrid className='items-start'>
                  <SettingsFormGridItem>
                    <FormField
                      control={form.control}
                      name='legal.user_agreement'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('User Agreement')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t(
                                'Provide Markdown, HTML, or an external URL for the user agreement'
                              )}
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t(
                              'Leave empty to disable the agreement requirement. Supports Markdown, HTML, or a full URL to redirect users.'
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SettingsFormGridItem>

                  <SettingsFormGridItem>
                    <FormField
                      control={form.control}
                      name='legal.privacy_policy'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Privacy Policy')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t(
                                'Provide Markdown, HTML, or an external URL for the privacy policy'
                              )}
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t(
                              'Leave empty to disable the privacy policy requirement. Supports Markdown, HTML, or a full URL to redirect users.'
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SettingsFormGridItem>
                </SettingsFormGrid>
              </FieldSet>
            </div>
          </SettingsForm>
        </Form>
      </SettingsSection>
    </>
  )
}
