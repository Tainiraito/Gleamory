import { useMemo } from 'react'

const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
]

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']

interface CalendarCell {
  day: number
  type: 'prev' | 'current' | 'next'
}

const useCalendar = () => {
  return useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const todayDate = today.getDate()

    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const cells: CalendarCell[] = []

    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, type: 'prev' })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, type: 'current' })
    }
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        cells.push({ day: i, type: 'next' })
      }
    }

    return { year, month, todayDate, cells }
  }, [])
}

const CalendarCard = () => {
  const { year, month, todayDate, cells } = useCalendar()
  const monthLabel = `${MONTH_NAMES[month]} ${year}`

  return (
    <div
      className="rounded-sm p-6 sm:p-8 h-full flex flex-col justify-center"
      style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Month title */}
      <h2
        className="font-display text-lg sm:text-xl mb-6 tracking-wide"
        style={{ color: 'var(--text-primary)', fontWeight: 600 }}
      >
        {monthLabel}
      </h2>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <span
            key={d}
            className="text-center text-[0.65rem] uppercase tracking-wider py-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7" style={{ rowGap: 2 }}>
        {cells.map((cell, i) => {
          const isToday = cell.type === 'current' && cell.day === todayDate
          const isDimmed = cell.type !== 'current'

          return (
            <span
              key={i}
              className="flex items-center justify-center text-sm"
              style={{
                height: 32,
                color: isDimmed ? 'var(--text-dimmed)' : isToday ? 'var(--accent-pink)' : 'var(--text-primary)',
                fontWeight: isToday ? 600 : 400,
              }}
            >
              {isToday ? (
                <span
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 26,
                    height: 26,
                    border: '1px solid var(--accent-pink)',
                    background: 'var(--accent-glow)',
                  }}
                >
                  {cell.day}
                </span>
              ) : (
                cell.day
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarCard
