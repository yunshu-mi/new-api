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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { act } from 'react'
import { afterEach, assert, expect, test, vi } from 'vitest'

import { Footer } from '@/components/layout/components/footer'
import { ThemeProvider } from '@/context/theme-provider'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { THEME_STORAGE_KEYS } from '@/lib/theme-storage'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { Home } from '../../..'
import { Features } from '../features'
import { Hero } from '../hero'
import { HowItWorks } from '../how-it-works'
import { Providers } from '../providers'

const clients: QueryClient[] = []
const initialSystemConfig = useSystemConfigStore.getState()

test.each([
  { direction: 1, current: 0, next: 1 },
  { direction: -1, current: 1, next: 0 },
])(
  '分屏首页滚轮方向 $direction 时切换相邻页，并阻止惯性连续跳页',
  async (item) => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: '' },
    })
    await renderHero({}, false, true, true)
    vi.useFakeTimers()
    vi.stubGlobal('innerHeight', 900)
    const main = screen.getByRole('main')
    const slides = [...main.children]
    for (const [index, slide] of slides.entries()) {
      vi.spyOn(slide, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, (index - item.current) * 900, 1440, 900)
      )
    }
    const scroll = vi.spyOn(slides[item.next], 'scrollIntoView')

    fireEvent.wheel(main, { deltaY: item.direction * 100 })
    fireEvent.wheel(main, { deltaY: item.direction * 30 })

    expect(scroll).toHaveBeenCalledExactlyOnceWith({
      block: 'start',
      behavior: 'auto',
    })
    vi.advanceTimersByTime(150)
    fireEvent.wheel(main, { deltaY: item.direction * 100 })
    expect(scroll).toHaveBeenCalledTimes(2)
  }
)

test.each(['scrollend', 'resize', 'visibilitychange', 'timeout'] as const)(
  '分屏首页使用原生平滑滚动，在 %s 后恢复吸附并允许继续切页',
  async (completion) => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: '' },
    })
    await renderHero({}, false, true, true)
    vi.useFakeTimers()
    vi.stubGlobal('innerHeight', 900)
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      ...window.matchMedia('(prefers-reduced-motion: reduce)'),
      matches: false,
    })
    const main = screen.getByRole('main')
    for (const [index, slide] of [...main.children].entries()) {
      vi.spyOn(slide, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, index * 900, 1440, 900)
      )
    }
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const scroll = vi.spyOn(main.children[1], 'scrollIntoView')
    const root = document.documentElement
    const originalSnapType = root.style.scrollSnapType

    fireEvent.wheel(main, { deltaY: 100 })
    expect(root.style.scrollSnapType).toBe('none')
    expect(scroll).toHaveBeenCalledExactlyOnceWith({
      block: 'start',
      behavior: 'smooth',
    })
    fireEvent.wheel(main, { deltaY: 30 })
    expect(scroll).toHaveBeenCalledTimes(1)

    if (completion === 'scrollend') {
      fireEvent(main.children[0], new Event('scrollend', { bubbles: true }))
      expect(root.style.scrollSnapType).toBe('none')
      fireEvent(document, new Event('scrollend'))
    } else if (completion === 'resize') {
      fireEvent(window, new Event('resize'))
    } else if (completion === 'visibilitychange') {
      fireEvent(document, new Event('visibilitychange'))
    } else {
      vi.advanceTimersByTime(900)
      fireEvent.wheel(main, { deltaY: 100 })
      expect(scroll).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(600)
    }
    expect(root.style.scrollSnapType).toBe(originalSnapType)
    vi.advanceTimersByTime(150)
    fireEvent.wheel(main, { deltaY: 100 })
    expect(root.style.scrollSnapType).toBe('none')
    expect(scroll).toHaveBeenCalledTimes(2)
  }
)

test('分屏首页切页完成后反向滚轮立即返回上一页', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: '' } })
  await renderHero({}, false, true, true)
  vi.stubGlobal('innerHeight', 900)
  const main = screen.getByRole('main')
  let active = 0
  for (const [index, slide] of [...main.children].entries()) {
    vi.spyOn(slide, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, (index - active) * 900, 1440, 900)
    )
  }
  const forward = vi.spyOn(main.children[1], 'scrollIntoView')
  const back = vi.spyOn(main.children[0], 'scrollIntoView')

  fireEvent.wheel(main, { deltaY: 100 })
  expect(forward).toHaveBeenCalledOnce()
  active = 1
  fireEvent.wheel(main, { deltaY: -100 })

  expect(back).toHaveBeenCalledExactlyOnceWith({
    block: 'start',
    behavior: 'auto',
  })
})

test('分屏首页正常动画偏好下文字不依赖入场动画才显示', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: '' } })
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    ...window.matchMedia('(prefers-reduced-motion: reduce)'),
    matches: false,
  })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  )
  await renderHero({}, false, true, true)

  const main = screen.getByRole('main')
  expect(main.querySelector('.opacity-0')).toBeNull()
  expect(main.querySelector('[style*="animation-delay"]')).toBeNull()
})

test('分屏首页当前页超出视口时允许先滚动阅读剩余内容', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: '' },
  })
  await renderHero({}, false, true, true)
  vi.stubGlobal('innerHeight', 720)
  const main = screen.getByRole('main')
  vi.spyOn(main.children[0], 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 390, 1200)
  )
  const scroll = vi.spyOn(main.children[1], 'scrollIntoView')
  const wheel = new WheelEvent('wheel', {
    deltaY: 100,
    bubbles: true,
    cancelable: true,
  })

  fireEvent(main, wheel)

  expect(wheel.defaultPrevented).toBe(false)
  expect(scroll).not.toHaveBeenCalled()
})

test('分屏首页依次展示四页内容，页脚包含在最后一页', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: '' },
  })
  await renderHero({}, false, true, true)

  const main = screen.getByRole('main')
  const slides = [...main.children] as HTMLElement[]
  expect(slides).toHaveLength(4)
  for (const slide of slides) expect(slide).toHaveClass('home-slide')
  expect(
    within(slides[0]).getByRole('heading', { level: 1 })
  ).toHaveTextContent('One endpoint,')
  expect(
    within(slides[1]).getByRole('heading', { level: 2 })
  ).toHaveTextContent('Core capabilities built for developers')
  expect(
    within(slides[2]).getByRole('heading', { level: 2 })
  ).toHaveTextContent('One account, the whole model ecosystem')
  expect(
    within(slides[3]).getByRole('heading', { level: 2 })
  ).toHaveTextContent('Everything you want to know')
  expect(within(slides[3]).getByRole('contentinfo')).toBeVisible()
  for (const slide of slides.slice(1)) {
    expect(slide.querySelector('section')).toHaveClass(
      'mx-auto',
      'w-full',
      'max-w-5xl',
      'px-6'
    )
    const heading = within(slide).getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('text-[36px]', 'font-bold', 'text-[#0F131A]')
    expect(heading.parentElement?.querySelector('span')).toHaveClass(
      'font-sans',
      'text-[13px]',
      'font-medium',
      'text-[#3D5BFF]'
    )
    expect(heading.parentElement?.querySelector('span')).not.toHaveClass(
      'font-mono'
    )
    expect(heading.parentElement?.querySelector('p')).toHaveClass(
      'text-[16px]',
      'font-normal',
      'text-[#5A6370]'
    )
  }
  expect(within(slides[3]).getByRole('contentinfo')).toHaveClass(
    '[&>div]:max-w-5xl',
    '[&>div]:py-2'
  )

  const css = readFileSync(
    resolve(import.meta.dirname, '../../../../../styles/index.css'),
    'utf8'
  )
  expect(css).toMatch(
    /html:has\(\.home-slides\)\s*\{\s*scroll-snap-type: y mandatory;/
  )
  const slideStyles = css.match(/\.home-slide\s*\{([^}]+)\}/)?.[1]
  expect(slideStyles).toContain('min-height: 100svh')
  expect(slideStyles).toContain('scroll-snap-align: start')
  expect(slideStyles).toContain('scroll-snap-stop: always')
  expect(slideStyles).not.toMatch(/overflow:\s*hidden|(?:^|;)\s*height:/)
  expect(css).not.toMatch(
    /html:has\(\.home-slides\)\s*\{[^}]*scroll-behavior: smooth;/
  )
})

test('分屏首页共用固定的网格柔光背景，切页时背景不随内容滚动', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: '' } })
  await renderHero({}, false, true, true)

  expect(screen.getByRole('main')).toHaveClass('home-grid')
  const css = readFileSync(
    resolve(import.meta.dirname, '../../../../../styles/index.css'),
    'utf8'
  )
  const surface = css.match(
    /\.home-slides(?=\s*[,{])[^{}]*\{([^}]+)\}/
  )?.[1]
  expect(surface).toContain('isolation: isolate')
  const background = css.match(
    /\.home-slides::before,\s*\.home-slides::after[^{}]*\{([^}]+)\}/
  )?.[1]
  expect(background).toContain('position: fixed')
  expect(background).toContain('pointer-events: none')
  expect(css).toMatch(
    /\.home-slides::after(?=\s*[,{])[^{}]*\{[^}]*background-image:\s*radial-gradient\(/
  )
})

test('分屏首页 API 地址栏收紧上下留白并保留复制按钮尺寸', async () => {
  await renderHero()

  const address = screen.getByRole('group', { name: 'API Base URL' })
  expect(address).toHaveClass('px-4', 'py-[0.2rem]')
  expect(
    within(address).getByText('API endpoint · OpenAI-compatible').parentElement
  ).toHaveClass('gap-0.5')
  expect(
    within(address).getByRole('button', { name: 'Copy base URL' })
  ).toHaveClass('size-8', 'shrink-0')
})

test('分屏首页核心能力以较窄内容区和紧凑卡片保留四项能力', async () => {
  await renderHero()

  const features = screen.getByRole('region', {
    name: 'Core capabilities built for developers',
  })
  expect(features).toHaveClass('w-full', 'max-w-5xl')
  expect(within(features).getByRole('heading', { level: 2 })).toHaveClass(
    'text-[36px]',
    'font-bold'
  )
  expect(features.querySelector('.grid')).toHaveClass(
    'grid-cols-1',
    'sm:grid-cols-2',
    'lg:grid-cols-3',
    'gap-4'
  )
  const headings = within(features).getAllByRole('heading', { level: 3 })
  expect(headings).toHaveLength(4)
  for (const heading of headings) {
    expect(heading).toHaveClass('text-lg')
    expect(heading.parentElement).toHaveClass('p-6', 'gap-3')
    expect(heading.parentElement?.querySelector('svg')).toHaveClass('size-6')
    const tag = heading.parentElement?.querySelector('span')
    expect(tag).toHaveClass('text-xs', 'font-bold', 'text-[#2F4FD0]')
    expect(tag).not.toHaveClass('font-mono')
  }
})

test('分屏首页模型广场按参考顺序以 32 像素展示八个品牌图标', async () => {
  await renderHero()

  const providers = screen.getByRole('region', {
    name: 'One account, the whole model ecosystem',
  })
  expect(providers).toHaveClass('w-full', 'max-w-5xl')
  expect(within(providers).getByRole('heading', { level: 2 })).toHaveClass(
    'text-[36px]',
    'font-bold'
  )
  expect(within(providers).getByRole('list')).toHaveClass(
    'grid-cols-2',
    'md:grid-cols-4',
    'gap-3'
  )
  const brands = [
    'DeepSeek',
    'Zhipu GLM',
    'Kimi',
    'OpenAI',
    'Claude',
    'Gemini',
    'Seedance',
    'MiniMax',
  ]
  const items = within(providers).getAllByRole('listitem')
  expect(items).toHaveLength(brands.length)
  for (const [index, item] of items.entries()) {
    expect(item).toHaveTextContent(brands[index])
    expect(item.firstElementChild).toHaveClass('px-4', 'py-5', 'gap-2')
  }
  await waitFor(() =>
    expect(providers.querySelectorAll('svg, img')).toHaveLength(8)
  )
  for (const icon of providers.querySelectorAll('svg, img')) {
    expect(icon).toHaveAttribute('width', '32')
    expect(icon).toHaveAttribute('height', '32')
    expect(icon.parentElement).toHaveClass('size-8')
  }
})

test('分屏首页第四页以较窄的内容区和紧凑的问题卡片展示 FAQ', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: '' },
  })
  await renderHero({}, false, true, true)

  const faq = screen.getByRole('region', {
    name: 'Everything you want to know',
  })
  expect(faq).toHaveClass('w-full', 'max-w-5xl')
  expect(within(faq).getByRole('heading', { level: 2 })).toHaveClass(
    'text-[36px]',
    'font-bold'
  )
  expect(faq.querySelector('[data-slot="accordion"]')).toHaveClass('gap-3')
  for (const question of within(faq).getAllByRole('button')) {
    expect(question).toHaveClass('px-5', 'py-4', 'text-sm')
  }
})

test('分屏首页展开 FAQ 后保留答案和同页页脚', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: '' },
  })
  await renderHero({}, false, true, true)

  const question = screen.getByRole('button', {
    name: 'Which models are supported?',
  })
  await userEvent.click(question)

  expect(question).toHaveAttribute('aria-expanded', 'true')
  const answer = screen.getByText(
    '20+ leading providers including OpenAI, Anthropic Claude, Google Gemini and DeepSeek, continuously updated - connect once, use any.'
  )
  expect(answer).toBeVisible()
  expect(answer.closest('.home-slide')).toContainElement(
    screen.getByRole('contentinfo')
  )
})

test('分屏首页样式不应用于自定义 Markdown 首页', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: '# Custom home' },
  })
  await renderHero({}, false, true, true)

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Custom home'
  )
  expect(document.querySelector('.home-slides')).not.toBeInTheDocument()
})

test('首页以浅色显示时，导航使用浅色 Logo，即使用户偏好深色', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: '' },
  })
  localStorage.setItem(THEME_STORAGE_KEYS.mode, 'dark')
  useSystemConfigStore.getState().setLoading(false)
  useSystemConfigStore.getState().setConfig({
    logo: '/light-logo.png',
    logoDark: '/dark-logo.png',
  })

  await renderHero({}, false, true, true)

  await waitFor(() => {
    expect(document.documentElement).toHaveClass('light')
    expect(
      within(screen.getByRole('banner')).getByRole('img', { name: 'logo' })
    ).toHaveAttribute('src', '/light-logo.png')
  })
})

afterEach(async () => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  cleanup()
  for (const client of clients) client.clear()
  clients.length = 0
  useSystemConfigStore.setState(initialSystemConfig)
  document.documentElement.classList.remove('light', 'dark')
  window.localStorage.clear()
  await i18next.changeLanguage('en')
  i18next.removeResourceBundle('zh', 'translation')
})

async function renderHero(
  status: Record<string, unknown> = {},
  isAuthenticated = false,
  compactFooter = true,
  homePage = false
): Promise<void> {
  useSystemConfigStore.getState().setConfig({ systemName: 'New API' })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, status)
  const router = createRouter({
    routeTree: createRootRoute({
      component: () =>
        homePage ? (
          <Home />
        ) : (
          <>
            <Hero isAuthenticated={isAuthenticated} />
            <Features />
            <HowItWorks />
            <Providers />
            <Footer compact={compactFooter} />
          </>
        ),
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
  await screen.findByRole('heading', { level: 1 })
}

test('首页首屏在宽屏并排展示介绍和可切换的 API 演示', async () => {
  await renderHero()

  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading).toHaveTextContent(/One endpoint,\s*for every large model/)
  const hero = heading.closest('section')
  assert(hero)
  expect(hero.firstElementChild).toHaveClass(
    'grid',
    'lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]'
  )
  expect(
    within(hero).getByRole('group', { name: 'API Base URL' })
  ).toHaveAccessibleDescription('API endpoint · OpenAI-compatible')

  expect(within(hero).getByText('/v1/chat/completions')).toBeVisible()
  await userEvent.click(within(hero).getByRole('button', { name: 'Responses' }))
  expect(await within(hero).findByText('/v1/responses')).toBeVisible()
  expect(within(hero).queryByText('/v1/chat/completions')).not.toBeInTheDocument()
})

test('未登录时获取密钥入口指向登录页', async () => {
  await renderHero()

  expect(screen.getByRole('button', { name: 'Get API Key' })).toHaveAttribute(
    'href',
    '/sign-in'
  )
})

test('紧凑页脚显示品牌图标和版权，保留法律链接并移除右侧署名', async () => {
  await renderHero({
    user_agreement_enabled: true,
    privacy_policy_enabled: true,
  })

  const footer = screen.getByRole('contentinfo')
  expect(footer.firstElementChild).toHaveClass('py-4', 'sm:flex-row')
  expect(
    within(footer).getByRole('img', { name: 'New API' })
  ).toBeInTheDocument()
  expect(
    within(footer).queryByRole('link', { name: 'New API' })
  ).not.toBeInTheDocument()
  expect(
    within(footer).getByRole('link', { name: 'User Agreement' })
  ).toHaveAttribute('href', '/user-agreement')
  expect(
    within(footer).getByRole('link', { name: 'Privacy Policy' })
  ).toHaveAttribute('href', '/privacy-policy')
})

test('未启用紧凑模式时页脚保留原有纵向间距', async () => {
  await renderHero({}, false, false)

  const footer = screen.getByRole('contentinfo')
  expect(footer.firstElementChild).toHaveClass('py-12', 'md:py-16')
  expect(within(footer).getByRole('img', { name: 'New API' })).toBeVisible()
})

test('承诺区展示三项服务承诺，宽屏下左右栏底部对齐', async () => {
  await renderHero()

  const commitments = screen.getByRole('region', { name: 'Our Commitments' })
  const [points, serviceItems] = within(commitments).getAllByRole('list')
  expect(within(points).getAllByRole('listitem')).toHaveLength(3)
  expect(within(serviceItems).getAllByRole('listitem')).toHaveLength(3)
  // 左栏核对项与标签成组贴底，右栏三条承诺等分列高，两栏下沿对齐。
  const leftColumn = commitments.querySelector("[data-slot='card-header']")
  expect(leftColumn).toHaveClass('flex', 'flex-col')
  expect(leftColumn?.lastElementChild).toHaveClass('mt-auto')
  for (const item of within(serviceItems).getAllByRole('listitem')) {
    expect(item).toHaveClass('flex-1')
  }
})

test('承诺区展示指定文案和标签，切换中文后与参考内容一致', async () => {
  const zh = await import('@/i18n/locales/zh.json')
  i18next.addResourceBundle('zh', 'translation', zh.translation)
  await renderHero()

  const commitments = screen.getByRole('region', { name: 'Our Commitments' })
  // 承诺区与优势卡共用同一内容宽度，宽屏下左右两栏排列，不再居中堆成窄列。
  const sheet = commitments.querySelector("[data-slot='card']")
  expect(sheet?.parentElement).toHaveClass('mx-auto', 'max-w-6xl')
  expect(sheet?.firstElementChild).toHaveClass(
    'lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]'
  )
  expect(
    within(commitments).queryByText('// core_promise')
  ).not.toBeInTheDocument()
  expect(
    within(commitments).queryByText('// core_promise')
  ).not.toBeInTheDocument()
  expect(
    within(commitments)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
  ).toEqual([
    'Full-Capability Official Channels',
    '1:1 Top-ups · Clear Balance',
    'Dedicated After-Sales Support',
  ])

  await act(() => i18next.changeLanguage('zh'))

  expect(commitments).toHaveAccessibleName('我们的承诺')
  for (const text of [
    '100%官方满血渠道 | 信誉为本，长久运营 | 售后专人解决报错',
    '高并发',
    '1:1充值',
    '<200ms',
    '多模型',
    '满血官方渠道',
    '100%原生渠道，带联网搜索，支持检测',
    '充值 1:1 · 余额直观',
    '充多少用多少，余额清晰可查',
    '售后专人响应',
    '报错问题专人解决，也会出教程',
  ]) {
    expect(within(commitments).getByText(text)).toBeVisible()
  }

  // 左栏三条短句各占一行，且与右栏服务承诺不重复。
  const [points] = within(commitments).getAllByRole('list')
  expect(
    within(points)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  ).toEqual(['只需改一行地址', '流式输出保持一致', '报错原因看得懂'])
})

test('配置 API 地址时显示并通过键盘复制基址，不包含示例接口路径', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  await renderHero({ server_address: ' https://gateway.example.com/proxy/ ' })

  const address = screen.getByRole('group', { name: 'API Base URL' })
  expect(
    within(address).getByText('https://gateway.example.com/proxy')
  ).toBeInTheDocument()
  expect(within(address).queryByText(/^\/v1\//)).not.toBeInTheDocument()
  const copyButton = within(address).getByRole('button', {
    name: 'Copy base URL',
  })
  copyButton.focus()
  await user.keyboard('{Enter}')

  expect(writeText).toHaveBeenCalledWith('https://gateway.example.com/proxy')
  expect(
    within(address).getByRole('button', { name: 'Copied' })
  ).toBeInTheDocument()
})

test.each([undefined, '', '   ', 123])(
  'API 地址为 %s 时回退到当前站点域名',
  async (serverAddress) => {
    await renderHero({ server_address: serverAddress })

    const address = screen.getByRole('group', { name: 'API Base URL' })
    expect(
      within(address).getByText(window.location.origin)
    ).toBeInTheDocument()
  }
)

test('超长 API 基址单行截断，且可复制完整地址', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  const address =
    'https://gateway.example.com/a-long-deployment-prefix/another-long-routing-prefix/public-api'
  await renderHero({ server_address: address })

  const group = screen.getByRole('group', { name: 'API Base URL' })
  const addressText = within(group).getByText(address)
  expect(addressText).toHaveClass('truncate')
  expect(addressText.parentElement).toHaveClass('min-w-0')

  const copyButton = within(group).getByRole('button', { name: 'Copy base URL' })
  expect(copyButton).toHaveClass('shrink-0')
  await user.click(copyButton)
  expect(writeText).toHaveBeenCalledWith(address)
})

test('获取密钥和查看文档按钮等高，按内容宽度并排', async () => {
  await renderHero()

  const getKey = screen.getByRole('button', { name: 'Get API Key' })
  const viewDocs = screen.getByRole('button', { name: 'View Docs' })
  expect(getKey.parentElement).toContainElement(viewDocs)
  expect(getKey.parentElement).toHaveClass('flex-wrap')
  for (const button of [getKey, viewDocs]) {
    expect(button).toHaveClass('h-8')
    expect(button).not.toHaveClass('w-full')
  }
})

test('登录用户可前往密钥页，且不显示注册入口', async () => {
  await renderHero({ docs_link: 'https://docs.example.com' }, true)

  expect(screen.getByRole('button', { name: 'Get API Key' })).toHaveAttribute(
    'href',
    '/keys'
  )
  expect(
    screen.queryByRole('button', { name: 'Get Started' })
  ).not.toBeInTheDocument()
})

test.each([undefined, 'https://docs.example.com', '/pricing'])(
  '文档地址为 %s 时，渠道说明仅展示文字，不提供点击入口',
  async (docsLink) => {
    await renderHero({ docs_link: docsLink })

    const commitments = screen.getByRole('region', { name: 'Our Commitments' })
    const description = within(commitments).getByText(
      '100% native channels, with web search and testing support'
    )
    expect(description).toBeVisible()
    expect(
      description.closest('a, button, [role="link"], [role="button"]')
    ).toBeNull()
    expect(within(commitments).queryByRole('link')).not.toBeInTheDocument()
  }
)
