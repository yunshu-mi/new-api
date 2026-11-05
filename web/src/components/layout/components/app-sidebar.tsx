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
import { ChevronsLeft, ChevronsRight, Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { CustomerSupportSidebarItem } from '@/components/customer-support'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { useLayout } from '@/context/layout-provider'
import { useTheme } from '@/context/theme-provider'
import { useCustomerSupport } from '@/hooks/use-customer-support'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { MOTION_TRANSITION, MOTION_VARIANTS } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { NavGroup } from './nav-group'
import { SidebarViewHeader } from './sidebar-view-header'
import { SystemBrand } from './system-brand'

/**
 * Application sidebar.
 *
 * Adopts the Vercel / Cloudflare "drill-in" pattern: the URL drives
 * which sidebar *view* is rendered. Clicking a top-level entry like
 * `System Settings` swaps the sidebar to a contextual workspace —
 * with a `← Back to Dashboard` affordance — instead of stacking the
 * sub-navigation inside the root tree.
 *
 * Architecture:
 *   - View resolution + filtering: {@link useSidebarView}
 *   - View registry: `layout/lib/sidebar-view-registry.ts`
 *   - Per-view header: {@link SidebarViewHeader}
 *
 * Adding a new nested view only requires registering a {@link SidebarView}
 * in the registry; this component requires no changes.
 */
export function AppSidebar() {
  const { t } = useTranslation()
  const { collapsible, variant, setCollapsible } = useLayout()
  const { isMobile, open } = useSidebar()
  const { resolvedTheme, setTheme } = useTheme()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const themeLabel = nextTheme === 'dark' ? t('Dark mode') : t('Light mode')
  const ThemeIcon = nextTheme === 'dark' ? Moon : Sun
  const toggleLabel = open ? t('Collapse') : t('Expand')
  const ToggleIcon = open ? ChevronsLeft : ChevronsRight
  const { key, view, navGroups } = useSidebarView()
  const shouldReduce = useReducedMotion()
  const supportConfig = useCustomerSupport('sidebar')
  const supportItem =
    !view && supportConfig
      ? {
          afterUrl: '/wallet',
          element: (
            <CustomerSupportSidebarItem
              key='customer-support'
              config={supportConfig}
            />
          ),
        }
      : undefined

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader className='console-sidebar-brand hidden'>
        <SystemBrand variant='inline' size='large' />
      </SidebarHeader>
      {view && <SidebarViewHeader view={view} />}

      <SidebarContent className='py-2'>
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={key}
            initial={
              shouldReduce ? false : MOTION_VARIANTS.sidebarSlide.initial
            }
            animate={MOTION_VARIANTS.sidebarSlide.animate}
            exit={shouldReduce ? undefined : MOTION_VARIANTS.sidebarSlide.exit}
            transition={MOTION_TRANSITION.fast}
            className='flex flex-col'
          >
            {navGroups.map((props) => (
              <NavGroup
                key={props.id || props.title}
                {...props}
                extraItem={props.id === 'personal' ? supportItem : undefined}
              />
            ))}
            {supportItem &&
              !navGroups.some((group) => group.id === 'personal') && (
                <NavGroup
                  key='personal'
                  title={t('Personal')}
                  items={[]}
                  extraItem={supportItem}
                />
              )}
          </motion.div>
        </AnimatePresence>
      </SidebarContent>

      <SidebarSeparator className='mx-0 md:-mx-(--console-sidebar-padding) md:data-horizontal:w-[calc(100%+2*var(--console-sidebar-padding))]' />
      <SidebarFooter className='shrink-0 px-0 pt-2 pb-3 max-md:px-2'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label={themeLabel}
              tooltip={themeLabel}
              onClick={() => setTheme(nextTheme)}
              className='text-muted-foreground h-8 gap-2.5 rounded-lg px-3 text-xs font-normal group-data-[collapsible=icon]:mx-auto [&_svg]:size-3.5'
            >
              <ThemeIcon aria-hidden='true' strokeWidth={1.5} />
              <span className='group-data-[collapsible=icon]:hidden'>
                {themeLabel}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isMobile && collapsible !== 'none' && (
          <SidebarTrigger
            onClick={() => {
              if (open && collapsible === 'offcanvas') setCollapsible('icon')
            }}
            size={open ? 'sm' : 'icon-sm'}
            aria-label={toggleLabel}
            aria-expanded={open}
            title={open ? undefined : toggleLabel}
            className={cn(
              'console-sidebar-toggle',
              open
                ? 'h-8 w-full justify-start gap-2.5 px-3 text-xs font-normal aria-expanded:not-hover:bg-transparent'
                : 'size-8 self-center',
              !open && collapsible === 'offcanvas' && 'fixed start-3 bottom-3'
            )}
          >
            <ToggleIcon
              aria-hidden='true'
              className='size-3.5 rtl:rotate-180'
            />
            {open && <span>{toggleLabel}</span>}
          </SidebarTrigger>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
