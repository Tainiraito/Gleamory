import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from '@/components/SiteHeader'
import { ProjectPageHeader } from '@/components/ProjectPageHeader'
import { Metronome } from '@/components/metronome/Metronome'

const MetronomePage = () => {
  useEffect(() => { document.title = '节拍器 | Gleamory 微光集' }, [])
  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <main className="px-4 sm:px-[15%] pt-20 sm:pt-24 pb-36 sm:pb-24">
        <ProjectPageHeader
          name="节拍器"
          englishName="Metronome"
          description="Tiktok♪Tiktok♪~动次打次♪动次打次♪~"
          version="1.0.0"
        />

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