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
import {
  Children,
  isValidElement,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

import { Main } from './main'
import { PageFooterProvider } from './page-footer'
import { PageHeaderContext } from './page-header'

type SlotProps = { children?: ReactNode }

function SectionPageLayoutTitle(_props: SlotProps) {
  return null
}
SectionPageLayoutTitle.displayName = 'SectionPageLayout.Title'

function SectionPageLayoutActions(_props: SlotProps) {
  return null
}
SectionPageLayoutActions.displayName = 'SectionPageLayout.Actions'

function SectionPageLayoutContent(_props: SlotProps) {
  return null
}
SectionPageLayoutContent.displayName = 'SectionPageLayout.Content'

function SectionPageLayoutBreadcrumb(_props: SlotProps) {
  return null
}
SectionPageLayoutBreadcrumb.displayName = 'SectionPageLayout.Breadcrumb'

export type SectionPageLayoutProps = {
  children: ReactNode
  headerDescription?: ReactNode
  fixedContent?: boolean
  stackActionsOnMobile?: boolean
}

export function SectionPageLayout(props: SectionPageLayoutProps) {
  const headerContainer = useContext(PageHeaderContext)
  const titleInHeader =
    headerContainer !== null && props.headerDescription != null
  const [footerContainer, setFooterContainer] = useState<HTMLDivElement | null>(
    null
  )

  let title: ReactNode = null
  let actions: ReactNode = null
  let content: ReactNode = null
  let breadcrumb: ReactNode = null

  Children.forEach(props.children, (node) => {
    if (!isValidElement(node)) return
    const child = node as ReactElement<SlotProps>
    if (child.type === SectionPageLayoutTitle) title = child.props.children
    else if (child.type === SectionPageLayoutActions) {
      actions = child.props.children
    } else if (child.type === SectionPageLayoutContent) {
      content = child.props.children
    } else if (child.type === SectionPageLayoutBreadcrumb) {
      breadcrumb = child.props.children
    }
  })
  const hasActions = Children.toArray(actions).length > 0

  return (
    <PageFooterProvider container={footerContainer}>
      {titleInHeader &&
        createPortal(
          <div className='min-w-0'>
            <h1 className='truncate text-sm leading-5 font-semibold tracking-tight'>
              {title}
            </h1>
            <p className='text-muted-foreground truncate text-xs leading-4'>
              {props.headerDescription}
            </p>
          </div>,
          headerContainer
        )}
      <Main>
        {(!titleInHeader || breadcrumb != null || hasActions) && (
          <div className='shrink-0 px-3 pt-3 pb-2.5 sm:px-4 sm:pt-5 sm:pb-3'>
            {breadcrumb != null && (
              <div className='mb-2 sm:mb-3'>{breadcrumb}</div>
            )}
            <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:gap-x-4'>
              {!titleInHeader && (
                <div
                  className={
                    props.stackActionsOnMobile
                      ? 'min-w-0 flex-1 max-sm:basis-full'
                      : 'min-w-0 flex-1'
                  }
                >
                  <h2 className='truncate text-base font-bold tracking-tight sm:text-lg'>
                    {title}
                  </h2>
                </div>
              )}
              {hasActions && (
                <div
                  className={cn(
                    'flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-x-4',
                    titleInHeader && 'ms-auto'
                  )}
                >
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className={cn(
            'min-h-0 flex-1 px-3 pb-3 sm:px-4 sm:pb-4',
            props.fixedContent ? 'overflow-hidden' : 'overflow-auto',
            titleInHeader && breadcrumb == null && !hasActions
              ? 'pt-3 sm:pt-4'
              : 'pt-1 sm:pt-1.5'
          )}
        >
          {content}
        </div>

        <div
          ref={setFooterContainer}
          className='bg-background shrink-0 border-t px-3 py-2.5 empty:hidden sm:px-4 sm:py-3'
        />
      </Main>
    </PageFooterProvider>
  )
}

SectionPageLayout.Title = SectionPageLayoutTitle
SectionPageLayout.Actions = SectionPageLayoutActions
SectionPageLayout.Content = SectionPageLayoutContent
SectionPageLayout.Breadcrumb = SectionPageLayoutBreadcrumb
