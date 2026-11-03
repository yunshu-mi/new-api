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
import { useEffect, useRef } from 'react'

export function useHomeSlideScroll(enabled: boolean) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!enabled || !container) return

    const root = document.documentElement
    let scrolling = false
    let capturedGesture = false
    let lastWheelAt = -Infinity
    let lastDirection = 0
    let timer: number | undefined
    let snapType: string | undefined

    const stopScrolling = (event?: Event): void => {
      if (event?.type === 'scrollend' && event.target !== document) return
      if (scrolling && event?.type !== 'scrollend') {
        window.scrollTo({ top: window.scrollY, behavior: 'instant' })
      }
      window.clearTimeout(timer)
      if (snapType !== undefined) {
        root.style.scrollSnapType = snapType
        snapType = undefined
      }
      scrolling = false
    }

    const handleWheel = (event: WheelEvent): void => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.shiftKey ||
        Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      ) {
        return
      }

      const direction = Math.sign(event.deltaY)
      const now = performance.now()
      if (now - lastWheelAt > 120 || direction !== lastDirection) {
        capturedGesture = false
      }
      lastWheelAt = now
      lastDirection = direction

      // 动画期间只拦截事件，不反复测量布局，也不延长切页锁定。
      if (scrolling || capturedGesture) {
        event.preventDefault()
        return
      }

      // 代码块、展开答案等内部滚动区域先消耗自身的滚动。
      let target = event.target instanceof Element ? event.target : null
      while (target && target !== container) {
        const overflow = getComputedStyle(target).overflowY
        const canScroll =
          direction > 0
            ? target.scrollTop + target.clientHeight < target.scrollHeight - 1
            : target.scrollTop > 1
        if (/(auto|scroll)/.test(overflow) && canScroll) return
        target = target.parentElement
      }

      const slides = [...container.children]
      const index = slides.findIndex(
        (slide) => slide.getBoundingClientRect().bottom > 1
      )
      const slide = slides[index]
      if (!slide) return
      const bounds = slide.getBoundingClientRect()
      // 小屏幕或长答案超过一屏时，先完整滚过当前页。
      if (direction > 0 && bounds.bottom > window.innerHeight + 1) return
      if (direction < 0 && bounds.top < -1) return

      const next = slides[index + direction]
      if (!next) return
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
      event.preventDefault()
      capturedGesture = true
      if (reducedMotion) {
        next.scrollIntoView({ block: 'start', behavior: 'auto' })
        return
      }

      scrolling = true
      snapType = root.style.scrollSnapType
      // 整段过渡只由浏览器执行平滑滚动，结束前不参与吸附校正。
      root.style.scrollSnapType = 'none'
      timer = window.setTimeout(stopScrolling, 1500)
      next.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('scrollend', stopScrolling)
    window.addEventListener('resize', stopScrolling)
    document.addEventListener('visibilitychange', stopScrolling)
    return () => {
      container.removeEventListener('wheel', handleWheel)
      document.removeEventListener('scrollend', stopScrolling)
      window.removeEventListener('resize', stopScrolling)
      document.removeEventListener('visibilitychange', stopScrolling)
      stopScrolling()
    }
  }, [enabled])

  return ref
}
