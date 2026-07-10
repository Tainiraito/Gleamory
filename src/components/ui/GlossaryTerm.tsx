import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { glossaryById, tokenizeGlossaryText } from '@/data/glossary'

interface GlossaryTermProps {
  termId: string
  children?: ReactNode
  depth?: number
  path?: string[]
}

interface GlossaryTextProps {
  text: string
}

const MAX_NESTING_DEPTH = 3
const CLOSE_DELAY_MS = 120

export function GlossaryTerm({ termId, children, depth = 0, path = [] }: GlossaryTermProps) {
  const entry = glossaryById.get(termId)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<CSSProperties>({})
  const isBlocked = depth >= MAX_NESTING_DEPTH || path.includes(termId)

  const clearCloseTimer = () => {
    if (closeTimerRef.current === null) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }

  const open = () => {
    clearCloseTimer()
    setIsOpen(true)
  }

  const scheduleClose = () => {
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

  useEffect(() => () => clearCloseTimer(), [])

  if (!entry || isBlocked) return <>{children ?? entry?.label ?? termId}</>

  return (
    <>
      <span
        ref={triggerRef}
        className="glossary-term"
        tabIndex={0}
        aria-expanded={isOpen}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        onFocus={open}
        onBlur={scheduleClose}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            clearCloseTimer()
            setIsOpen(false)
          }
        }}
      >
        {children ?? entry.label}
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
                  <GlossaryTerm key={relatedId} termId={relatedId} depth={depth + 1} path={[...path, termId]} />
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

export function GlossaryText({ text }: GlossaryTextProps) {
  return tokenizeGlossaryText(text).map((token, index) =>
    token.type === 'term' ? (
      <GlossaryTerm key={`${token.termId}-${index}`} termId={token.termId}>
        {token.value}
      </GlossaryTerm>
    ) : (
      <span key={`text-${index}`}>{token.value}</span>
    ),
  )
}
