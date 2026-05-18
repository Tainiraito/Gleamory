import { useState, useEffect } from 'react'
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
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    fetch('https://v1.jinrishici.com/all.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          if (data?.content && data?.origin && data?.author) {
            setPoem({ content: data.content, origin: data.origin, author: data.author })
          } else {
            throw new Error('Invalid response format')
          }
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          const idx = (new Date().getDate() + 30) % poems.length
          setPoem(poems[idx])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  return (
    <div
      className="rounded-sm p-6 sm:p-8 flex flex-col justify-center h-full"
      style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}
    >
      {loading ? (
        <div style={{ color: 'var(--text-muted)' }} className="text-sm">
          加载中...
        </div>
      ) : poem ? (
        <>
          <blockquote
            className="font-kai leading-relaxed mb-5"
            style={{
              color: 'var(--text-primary)',
              fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
              fontWeight: 500,
            }}
          >
            {poem.content}
          </blockquote>
          <div className="flex items-center gap-2">
            <span
              className="font-display text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              《{poem.origin}》
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {poem.author}
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          暂无诗句
        </p>
      )}
    </div>
  )
}

export default PoemCard
