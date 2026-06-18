import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Update } from '@/types'
import { sortUpdatesByDateDesc } from '@/utils/timeline'

interface TimelineProps {
  updates: Update[]
}

const INITIAL_COUNT = 5

const Timeline = ({ updates }: TimelineProps) => {
  const [expanded, setExpanded] = useState(false)
  // Most recent first
  const sortedUpdates = useMemo(() => sortUpdatesByDateDesc(updates), [updates])
  const visibleUpdates = expanded ? sortedUpdates : sortedUpdates.slice(0, INITIAL_COUNT)
  const hasMore = updates.length > INITIAL_COUNT

  return (
    <div>
      {/* Section header — 流光忆庭 */}
      <div className="flex items-center gap-4 mb-16">
        <div className="flex-1" style={{ height: '1px', background: 'var(--border-line)' }} />
        <span
          className="font-display text-xs uppercase tracking-[0.3em] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          流光忆庭
        </span>
        <div className="flex-1" style={{ height: '1px', background: 'var(--border-line)' }} />
      </div>

      {updates.length === 0 ? (
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          暂无记录
        </p>
      ) : (
        <>
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: '5.5px',
                width: '1px',
                background: 'var(--border-line)',
              }}
            />

            <div className="flex flex-col">
              {visibleUpdates.map((update, i) => (
                <motion.div
                  key={update.id}
                  className="flex gap-5 pb-8 last:pb-0"
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  {/* Dot */}
                  <div
                    className="relative flex-shrink-0 flex justify-center mt-0.5"
                    style={{ width: '12px' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        border: '2px solid var(--accent-pink)',
                        background: 'var(--bg-page)',
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <span
                      className="text-[0.6rem] uppercase tracking-widest block mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {update.date}
                    </span>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {update.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Toggle button */}
          {hasMore && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="mt-8 text-[0.6rem] uppercase tracking-widest transition-opacity duration-300 hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              {expanded ? '收起' : `显示全部 (${updates.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default Timeline
