import type { ProjectsData, UpdatesData } from '@/types'
import FloatingLogo from '@/components/FloatingLogo'
import ProjectGrid from '@/components/ProjectGrid'
import CalendarCard from '@/components/CalendarCard'
import PoemCard from '@/components/PoemCard'
import Timeline from '@/components/Timeline'
import Footer from '@/components/Footer'
import projectsData from '@/data/projects.json'
import updatesData from '@/data/timeline.json'

const { projects } = projectsData as ProjectsData
const { updates } = updatesData as UpdatesData

const App = () => (
  <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
    <FloatingLogo />
    <main className="max-w-5xl mx-auto px-6 py-20 sm:py-24">
      {/* Magazine grid for projects */}
      <ProjectGrid projects={projects} />

      {/* Decorative divider */}
      <div className="flex justify-center my-16 sm:my-20">
        <div style={{ width: '48px', height: '1px', background: 'var(--accent-pink)' }} />
      </div>

      {/* Daily section: calendar + poem */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5">
          <CalendarCard />
        </div>
        <div className="md:col-span-7">
          <PoemCard />
        </div>
      </div>

      {/* Timeline (full width) */}
      <section className="mt-24 sm:mt-32">
        <Timeline updates={updates} />
      </section>
    </main>
    <Footer />
  </div>
)

export default App
