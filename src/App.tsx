import type { ProjectsData, UpdatesData } from '@/types'
import FloatingLogo from '@/components/FloatingLogo'
import ProjectGrid from '@/components/ProjectGrid'
import Timeline from '@/components/Timeline'
import Footer from '@/components/Footer'
import projectsData from '@/data/projects.json'
import updatesData from '@/data/timeline.json'

const { projects } = projectsData as ProjectsData
const { updates } = updatesData as UpdatesData

const App = () => (
  <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
    <FloatingLogo />
    <main className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
      <ProjectGrid projects={projects} />
      <section className="mt-32 sm:mt-48">
        <Timeline updates={updates} />
      </section>
    </main>
    <Footer />
  </div>
)

export default App
