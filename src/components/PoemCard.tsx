import { useEffect, useState } from 'react'

import poems from '@/data/poems.json'

interface PoemData {
  content: string
  origin: string
  author: string
}

const PoemCard = () => {
  const [poem, setPoem] = useState<PoemData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 8000)

    fetch('https://v1.jinrishici.com/all.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('API error')
        return response.json()
      })
      .then((data) => {
        if (cancelled) return
        if (!data?.content || !data?.origin || !data?.author) {
          throw new Error('Invalid response format')
        }
        setPoem({ content: data.content, origin: data.origin, author: data.author })
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        const index = (new Date().getDate() + 30) % poems.length
        setPoem(poems[index])
        setLoading(false)
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  return (
    <section
      aria-labelledby="poem-heading"
      className="flex h-full min-h-64 flex-col justify-center px-6 py-7 sm:px-8 sm:py-9 min-[1760px]:px-0"
    >
      <header className="mb-6 border-b pb-4">
        <p
          className="mb-1 text-xs tracking-[0.08em]"
          style={{ color: 'var(--accent-amber)' }}
        >
          每日诗笺
        </p>
        <h2
          id="poem-heading"
          className="font-display text-2xl font-semibold leading-none"
          style={{ color: 'var(--text-primary)' }}
        >
          今日一诗
        </h2>
      </header>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          正在展卷…
        </p>
      ) : poem ? (
        <>
          <blockquote
            className="max-w-[48ch] font-display text-xl font-medium leading-[1.85] sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {poem.content}
          </blockquote>
          <footer className="mt-6 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-px w-8 shrink-0"
              style={{ background: 'var(--accent-amber)' }}
            />
            <cite
              className="font-display text-xs font-medium not-italic"
              style={{ color: 'var(--text-muted)' }}
            >
              《{poem.origin}》 · {poem.author}
            </cite>
          </footer>
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          今日诗笺暂缺
        </p>
      )}
    </section>
  )
}

export default PoemCard
