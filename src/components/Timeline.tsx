import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import type { Update } from '@/types'
import { sortUpdatesByDateDesc } from '@/utils/timeline'

interface TimelineProps {
  updates: Update[]
}

interface TimelineEntryProps {
  update: Update
}

const INITIAL_COUNT = 5

const TimelineEntry = ({ update }: TimelineEntryProps) => (
  <article className="relative grid grid-cols-[0.5rem_minmax(0,1fr)] gap-3">
    <span
      aria-hidden="true"
      className="relative mt-1 size-[7px] rounded-full"
      style={{ background: 'var(--accent-amber)' }}
    />
    <div className="min-w-0">
      <time
        dateTime={update.date}
        className="mb-1 block font-mono text-xs leading-[1.125rem] tracking-[0.04em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {update.date}
      </time>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {update.content}
      </p>
    </div>
  </article>
)

const Timeline = ({ updates }: TimelineProps) => {
  const [expanded, setExpanded] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const sortedUpdates = useMemo(() => sortUpdatesByDateDesc(updates), [updates])
  const primaryUpdates = sortedUpdates.slice(0, INITIAL_COUNT)
  const extraUpdates = sortedUpdates.slice(INITIAL_COUNT)
  const hasMore = extraUpdates.length > 0
  const motionDuration = shouldReduceMotion ? 0 : 0.32

  return (
    <section
      aria-labelledby="timeline-heading"
      className="px-6 py-7 sm:px-8 sm:py-9 min-[1760px]:px-0"
    >
      <header className="mb-6 border-b pb-4">
        <p
          className="mb-1 text-xs tracking-[0.08em]"
          style={{ color: 'var(--accent-amber)' }}
        >
          更新札记
        </p>
        <h2
          id="timeline-heading"
          className="font-display text-2xl font-semibold leading-none"
          style={{ color: 'var(--text-primary)' }}
        >
          流光忆庭
        </h2>
      </header>

      {updates.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          暂无记录
        </p>
      ) : (
        <>
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute top-1 bottom-1 left-[3px] w-px"
              style={{ background: 'var(--border-line)' }}
            />

            <div className="flex flex-col gap-5">
              {primaryUpdates.map((update) => (
                <TimelineEntry key={update.id} update={update} />
              ))}
            </div>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="extra-updates"
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: motionDuration, ease: 'easeOut' }}
                >
                  <div className="flex flex-col gap-5 pt-5">
                    {extraUpdates.map((update) => (
                      <TimelineEntry key={update.id} update={update} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((previous) => !previous)}
              aria-expanded={expanded}
              className="mt-7 inline-flex items-center gap-1.5 border-b pb-1 text-xs tracking-[0.06em] transition-colors hover:text-[var(--accent-amber)]"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--accent-amber)' }}
            >
              {expanded ? '收起记录' : `展开全部 ${updates.length} 条`}
              <motion.span
                aria-hidden="true"
                className="inline-flex"
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: motionDuration }}
              >
                <ChevronDown size={12} strokeWidth={1.6} />
              </motion.span>
            </button>
          )}
        </>
      )}
    </section>
  )
}

export default Timeline
