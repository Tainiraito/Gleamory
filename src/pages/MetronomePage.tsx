import SiteHeader from '@/components/SiteHeader'
import { ProjectPageHeader } from '@/components/ProjectPageHeader'
import { Metronome } from '@/components/metronome/Metronome'
import BackFooter from '@/components/BackFooter'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const MetronomePage = () => {
  useDocumentTitle('节拍器 | Gleamory 微光集')
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

      <BackFooter />
    </div>
  )
}

export default MetronomePage