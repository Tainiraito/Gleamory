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
    if (slideCount <= 1 || shouldReduceMotion || autoplayPaused || interactionPaused) {
      return
    }

    const intervalId = window.setInterval(showNext, AUTOPLAY_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [autoplayPaused, interactionPaused, shouldReduceMotion, showNext, slideCount])

  if (!activeSlide) return null

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="微光集图片轮播"
      className="relative isolate h-[22rem] overflow-hidden border sm:h-[24rem]"
      style={{ background: 'var(--ink-stamp)', borderColor: 'rgba(44,42,48,0.12)' }}
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
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setInteractionPaused(false)
        }
      }}
    >
      <motion.img
        key={activeSlide.id}
        src={activeSlide.src}
        alt={activeSlide.alt}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: activeSlide.objectPosition }}
        initial={shouldReduceMotion ? false : { opacity: 0.35, scale: 1.025 }}
        animate={{ opacity: 1, scale: shouldReduceMotion ? 1 : 1.015 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.7, ease: 'easeOut' }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,8,14,0.78) 0%, rgba(10,8,14,0.4) 42%, rgba(10,8,14,0.05) 74%), linear-gradient(0deg, rgba(10,8,14,0.62) 0%, rgba(10,8,14,0) 52%)',
        }}
      />

      {slideCount > 1 && (
        <div className="absolute top-5 right-5 z-20 flex items-center gap-2 sm:top-6 sm:right-6">
          <span className="mr-1 font-mono text-[0.62rem] tracking-[0.14em] text-white/75">
            {formatSlideNumber(activeIndex)} / {String(slideCount).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={showPrevious}
            aria-label="上一张图片"
            className="flex size-9 items-center justify-center border border-white/25 bg-black/25 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/45 focus-visible:outline-none"
          >
            <ChevronLeft size={16} strokeWidth={1.6} />
          </button>
          {!shouldReduceMotion && (
            <button
              type="button"
              onClick={() => setAutoplayPaused((paused) => !paused)}
              aria-label={autoplayPaused ? '继续自动轮播' : '暂停自动轮播'}
              className="flex size-9 items-center justify-center border border-white/25 bg-black/25 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/45 focus-visible:outline-none"
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
            className="flex size-9 items-center justify-center border border-white/25 bg-black/25 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/45 focus-visible:outline-none"
          >
            <ChevronRight size={16} strokeWidth={1.6} />
          </button>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 p-6 pb-8 sm:p-9 sm:pb-10">
        <div className="max-w-xl">
          <h1 className="font-display text-4xl font-semibold leading-tight text-[#f4f0e9] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/78 sm:text-base">
            {description}
          </p>
        </div>
      </div>

      {slideCount > 1 && (
        <div className="absolute right-6 bottom-3 left-6 z-20 flex gap-1.5 sm:right-9 sm:left-9">
          {HOME_HERO_SLIDES.map((slide, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={slide.id}
                type="button"
                aria-label={`切换到第 ${index + 1} 张图片`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
                className="group/indicator flex h-4 flex-1 items-end focus-visible:outline-none"
              >
                <span
                  className="block h-px w-full transition-colors"
                  style={{
                    background: isActive ? 'var(--accent-amber)' : 'rgba(255,255,255,0.36)',
                  }}
                />
              </button>
            )
          })}
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        第 {activeIndex + 1} 张，共 {slideCount} 张：{activeSlide.alt}
      </span>
    </section>
  )
}

export default HomeHeroCarousel
