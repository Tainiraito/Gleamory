import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

import { HOME_HERO_SLIDES } from '@/data/homeHeroSlides'

interface HomeHeroCarouselProps {
  title: string
  description: string
}

const AUTOPLAY_INTERVAL_MS = 7000

const formatSlideNumber = (index: number) => String(index + 1).padStart(2, '0')

const HomeHeroCarousel = ({ title, description }: HomeHeroCarouselProps) => {
  const shouldReduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoplayPaused, setAutoplayPaused] = useState(false)
  const [interactionPaused, setInteractionPaused] = useState(false)
  const slideCount = HOME_HERO_SLIDES.length
  const activeSlide = HOME_HERO_SLIDES[activeIndex]

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => (current - 1 + slideCount) % slideCount)
  }, [slideCount])

  const showNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % slideCount)
  }, [slideCount])

  useEffect(() => {
    if (slideCount <= 1 || shouldReduceMotion || autoplayPaused || interactionPaused) return

    const intervalId = window.setInterval(showNext, AUTOPLAY_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [autoplayPaused, interactionPaused, shouldReduceMotion, showNext, slideCount])

  if (!activeSlide) return null

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="微光集图片轮播"
      className="relative isolate w-full overflow-hidden border bg-[var(--bg-card)] md:grid md:grid-cols-[minmax(19rem,0.75fr)_minmax(0,1.65fr)]"
      style={{ borderColor: 'rgba(44,42,48,0.12)' }}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          showPrevious()
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          showNext()
        }
      }}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false)
      }}
    >
      <div className="order-2 flex min-h-[10.5rem] flex-col justify-center bg-[var(--bg-card)] p-6 sm:p-9 md:order-1 md:min-h-0 md:border-r md:p-8 lg:p-10">
        <span
          aria-hidden="true"
          className="mb-5 block h-px w-12"
          style={{ background: 'var(--accent-amber)' }}
        />
        <h1 className="font-display text-5xl font-semibold leading-none text-[var(--text-primary)] sm:text-[3.25rem] lg:text-6xl">
          {title}
        </h1>
        <p
          className="mt-3 max-w-sm text-sm leading-relaxed sm:text-[0.95rem]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>

        {slideCount > 1 && (
          <div
            role="group"
            aria-label="轮播控制"
            className="mt-9 flex w-full max-w-xs items-center sm:mt-11"
          >
            <span
              className="font-mono text-xs leading-[1.125rem] tracking-[0.08em]"
              style={{ color: 'var(--accent-amber)' }}
            >
              {formatSlideNumber(activeIndex)} / {String(slideCount).padStart(2, '0')}
            </span>
            <span
              aria-hidden="true"
              className="mx-4 h-px min-w-8 flex-1"
              style={{ background: 'var(--border-line)' }}
            />
            <button
              type="button"
              onClick={showPrevious}
              aria-label="上一张图片"
              className="flex size-8 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--accent-amber)] focus-visible:outline-none"
            >
              <ChevronLeft size={16} strokeWidth={1.6} />
            </button>
            {!shouldReduceMotion && (
              <button
                type="button"
                onClick={() => setAutoplayPaused((paused) => !paused)}
                aria-label={autoplayPaused ? '继续自动轮播' : '暂停自动轮播'}
                className="flex size-8 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--accent-amber)] focus-visible:outline-none"
              >
                {autoplayPaused ? (
                  <Play size={14} strokeWidth={1.6} />
                ) : (
                  <Pause size={14} strokeWidth={1.6} />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={showNext}
              aria-label="下一张图片"
              className="flex size-8 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--accent-amber)] focus-visible:outline-none"
            >
              <ChevronRight size={16} strokeWidth={1.6} />
            </button>
          </div>
        )}
      </div>

      <div className="relative order-1 aspect-video overflow-hidden bg-[var(--bg-card-warm)] md:order-2">
        <motion.img
          key={activeSlide.id}
          src={activeSlide.src}
          alt={activeSlide.alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: activeSlide.objectPosition }}
          initial={shouldReduceMotion ? false : { opacity: 0.35, scale: 1.012 }}
          animate={{ opacity: 1, scale: shouldReduceMotion ? 1 : 1.006 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.7, ease: 'easeOut' }}
        />
      </div>

      <span className="sr-only" aria-live="polite">
        第 {activeIndex + 1} 张，共 {slideCount} 张：{activeSlide.alt}
      </span>
    </section>
  )
}

export default HomeHeroCarousel
