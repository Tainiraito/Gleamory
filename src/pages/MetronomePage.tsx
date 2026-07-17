import SiteHeader from '@/components/SiteHeader'
import { PageMain } from '@/components/PageContainer'
import { ProjectPageHeader } from '@/components/ProjectPageHeader'
import { Metronome } from '@/components/metronome/Metronome'
import BackFooter from '@/components/BackFooter'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getProjectById } from '@/utils/projectData'

const MetronomePage = () => {
  useDocumentTitle('节拍器 | Gleamory 微光集')
  const project = getProjectById('metronome')!
  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <PageMain className="pt-20 pb-36 sm:pt-24 sm:pb-24">
        <ProjectPageHeader
          name={project.name}
          englishName="Metronome"
          description={project.description}
          version={project.version.replace(/^v/, '')}
        />

        {/* Metronome component */}
        <Metronome />
      </PageMain>

      <BackFooter />
    </div>
  )
}

export default MetronomePage
