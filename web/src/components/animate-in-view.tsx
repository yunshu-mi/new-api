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
import { useRef, useEffect, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface AnimateInViewProps {
  children: ReactNode
  className?: string
  delay?: number
  threshold?: number
  animation?: 'fade-up' | 'fade-in' | 'scale-in' | 'fade-left' | 'fade-right'
  once?: boolean
  as?: 'div' | 'section' | 'li' | 'span'
}

export function AnimateInView(props: AnimateInViewProps) {
  const {
    as: Tag = 'div',
    delay = 0,
    threshold = 0.15,
    animation = 'fade-up',
    once = true,
  } = props

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      el.classList.remove('opacity-0')
      return
    }

    // `will-change` promotes the element to its own compositor layer, where
    // Chrome drops subpixel antialiasing — permanent promotion leaves the text
    // looking soft until a repaint. Keep it only for the animation itself.
    const animationClass = `landing-animate-${animation}`
    const releaseLayer = () => {
      el.classList.remove(animationClass, 'will-change-[transform,opacity]')
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove('opacity-0')
          el.classList.add('will-change-[transform,opacity]', animationClass)
          el.addEventListener('animationend', releaseLayer, { once: true })
          if (once) observer.unobserve(el)
        } else if (!once) {
          el.classList.add('opacity-0')
          el.classList.remove(animationClass)
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      el.removeEventListener('animationend', releaseLayer)
    }
  }, [threshold, once, animation])

  return (
    <Tag
      ref={ref as never}
      className={cn('opacity-0', props.className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      {props.children}
    </Tag>
  )
}
