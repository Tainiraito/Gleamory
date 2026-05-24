import { Link } from 'react-router-dom'
import SiteHeader from '@/components/SiteHeader'
import { Metronome } from '@/components/metronome/Metronome'

const MetronomePage = () => {
  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <main className="px-4 sm:px-[15%] pt-8 pb-36 sm:py-24">
        {/* Title section */}
        <h1
          className="font-display text-4xl sm:text-5xl tracking-tight mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          节拍器
        </h1>
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          Metronome
        </p>
        <p className="text-sm mb-8 max-w-lg" style={{ color: 'var(--text-muted)' }}>
          Tiktok♪Tiktok♪~动次打次♪动次打次♪~
        </p>

        {/* Metronome component */}
        <Metronome />
      </main>

      {/* Fixed footer — home link only */}
      <footer
        className="fixed bottom-0 left-0 right-0 flex justify-center py-4 z-40"
        style={{ background: 'var(--bg-page)', borderTop: '0.5px solid var(--border-line)' }}
      >
        <Link
          to="/"
          className="text-[0.6rem] uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          ← 返回首页
        </Link>
      </footer>
    </div>
  )
}

export default MetronomePage