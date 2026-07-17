import { useMemo } from 'react'

const MONTH_NAMES = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
]

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']

interface CalendarCell {
  day: number
  type: 'prev' | 'current' | 'next'
}

const useCalendar = () =>
  useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const todayDate = today.getDate()
    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const cells: CalendarCell[] = []

    for (let index = startOffset - 1; index >= 0; index -= 1) {
      cells.push({ day: daysInPrevMonth - index, type: 'prev' })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, type: 'current' })
    }

    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let day = 1; day <= remaining; day += 1) {
        cells.push({ day, type: 'next' })
      }
    }

    return { year, month, todayDate, cells }
  }, [])

const CalendarCard = () => {
  const { year, month, todayDate, cells } = useCalendar()

  return (
    <section
      aria-labelledby="calendar-heading"
      className="h-full px-6 py-7 sm:px-8 sm:py-9 min-[1760px]:px-0"
    >
      <header className="mb-5 flex items-end justify-between border-b pb-4">
        <div>
          <p
            className="mb-1 font-mono text-[0.6rem] tracking-[0.16em]"
            style={{ color: 'var(--accent-amber)' }}
          >
            今日日历
          </p>
          <h2
            id="calendar-heading"
            className="font-display text-2xl font-semibold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {MONTH_NAMES[month]}
          </h2>
        </div>
        <span
          className="font-mono text-xs tracking-[0.12em]"
          style={{ color: 'var(--text-muted)' }}
        >
          {year}
        </span>
      </header>

      <div className="mb-2 grid grid-cols-7">
        {WEEK_DAYS.map((day) => (
          <span
            key={day}
            className="py-1 text-center text-[0.62rem] tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, index) => {
          const isToday = cell.type === 'current' && cell.day === todayDate
          const isDimmed = cell.type !== 'current'

          return (
            <span
              key={`${cell.type}-${cell.day}-${index}`}
              className="flex h-8 items-center justify-center font-mono text-xs"
              style={{
                color: isDimmed ? 'rgba(74,69,80,0.34)' : 'var(--text-primary)',
              }}
            >
              {isToday ? (
                <time
                  dateTime={`${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`}
                  className="inline-flex size-7 items-center justify-center font-semibold"
                  style={{ background: 'var(--accent-amber)', color: 'var(--bg-card)' }}
                >
                  {cell.day}
                </time>
              ) : (
                cell.day
              )}
            </span>
          )
        })}
      </div>
    </section>
  )
}

export default CalendarCard
