import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { glossaryById, tokenizeGlossaryText } from '@/data/glossary'

interface GlossaryTermProps {
  termId: string
  children?: ReactNode
  path?: string[]
  interactive?: boolean
}

interface GlossaryTextProps {
  text: string
  interactive?: boolean
}

const HOVER_OPEN_DELAY_MS = 500
const CLOSE_DELAY_MS = 120

export function GlossaryTerm({ termId, children, path = [], interactive = true }: GlossaryTermProps) {
  const entry = glossaryById.get(termId)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isHoverPending, setIsHoverPending] = useState(false)
  const [position, setPosition] = useState<CSSProperties>({})
  const isBlocked = path.includes(termId)

  const clearOpenTimer = () => {
    if (openTimerRef.current === null) return
    window.clearTimeout(openTimerRef.current)
    openTimerRef.current = null
    setIsHoverPending(false)
  }

  const clearCloseTimer = () => {
    if (closeTimerRef.current === null) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }

  const openImmediately = () => {
    clearOpenTimer()
    clearCloseTimer()
    setIsOpen(true)
  }

  const scheduleOpen = () => {
    clearCloseTimer()
    if (isOpen || openTimerRef.current !== null) return
    setIsHoverPending(true)
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null
      setIsHoverPending(false)
      setIsOpen(true)
    }, HOVER_OPEN_DELAY_MS)
  }

  const scheduleClose = () => {
    clearOpenTimer()
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS)
  }

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(320, window.innerWidth - 24)
      const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12))
      setPosition({ left, top: Math.min(rect.bottom + 8, window.innerHeight - 180), width })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => () => {
    if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current)
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  if (!entry || isBlocked) return <>{children ?? entry?.label ?? termId}</>

  return (
    <>
      <span
        ref={triggerRef}
        className="glossary-term"
        tabIndex={interactive ? 0 : undefined}
        aria-expanded={isOpen}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={interactive ? openImmediately : undefined}
        onBlur={interactive ? scheduleClose : undefined}
        onClick={interactive ? () => (isOpen ? setIsOpen(false) : openImmediately()) : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            clearOpenTimer()
            clearCloseTimer()
            setIsOpen(false)
          } else if (interactive && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            openImmediately()
          }
        }}
      >
        {children ?? entry.label}
        {isHoverPending && (
          <svg className="glossary-hover-progress" data-testid="glossary-hover-progress" viewBox="0 0 16 16" aria-hidden="true">
            <circle className="glossary-hover-track" cx="8" cy="8" r="6" />
            <circle className="glossary-hover-value" cx="8" cy="8" r="6" />
          </svg>
        )}
      </span>
      {isOpen &&
        createPortal(
          <div
            className="glossary-popover"
            role="tooltip"
            style={position}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
          >
            <strong>{entry.label}</strong>
            <p>{entry.summary}</p>
            <small>{entry.example}</small>
            {entry.relatedTerms.length > 0 && (
              <div className="glossary-related">
                <span>相关词条</span>
                {entry.relatedTerms.map((relatedId) => (
                  <GlossaryTerm key={relatedId} termId={relatedId} path={[...path, termId]} />
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

export function GlossaryText({ text, interactive = true }: GlossaryTextProps) {
  return tokenizeGlossaryText(text).map((token, index) =>
    token.type === 'term' ? (
      <GlossaryTerm key={`${token.termId}-${index}`} termId={token.termId} interactive={interactive}>
        {token.value}
      </GlossaryTerm>
    ) : (
      <span key={`text-${index}`}>{token.value}</span>
    ),
  )
}
