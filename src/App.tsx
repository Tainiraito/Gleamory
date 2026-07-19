import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import type { ProjectsData, UpdatesData } from '@/types'
import SiteHeader from '@/components/SiteHeader'
import { PageMain } from '@/components/PageContainer'
import HomeHeroCarousel from '@/components/HomeHeroCarousel'
import ProjectGrid from '@/components/ProjectGrid'
import CalendarCard from '@/components/CalendarCard'
import PoemCard from '@/components/PoemCard'
import Timeline from '@/components/Timeline'
import Footer from '@/components/Footer'
import projectsData from '@/data/projects.json'
import updatesData from '@/data/timeline.json'
import { FEATURED_PROJECT_ID } from '@/data/projectCategories'

const GachaSimulator = lazy(() => import('@/pages/GachaSimulator'))
const PianoPage = lazy(() => import('@/pages/PianoPage'))
const MetronomePage = lazy(() => import('@/pages/MetronomePage'))
const NeteaseCoverPage = lazy(() => import('@/pages/NeteaseCoverPage'))
const PixivCoverPage = lazy(() => import('@/pages/PixivCoverPage'))
const AudioSeparatorPage = lazy(() => import('@/pages/AudioSeparatorPage'))
const GuitarFretboardTrainerPage = lazy(() => import('@/pages/GuitarFretboardTrainerPage'))
const PitchDetectorPage = lazy(() => import('@/pages/PitchDetectorPage'))

const { projects } = projectsData as ProjectsData
const { updates } = updatesData as UpdatesData
const featuredProject =
  projects.find((project) => project.id === FEATURED_PROJECT_ID) ?? projects[0]

const HomePage = () => (
  <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
    <SiteHeader />
    <PageMain className="py-20 sm:py-24">
      {featuredProject && (
        <HomeHeroCarousel title={featuredProject.name} description={featuredProject.description} />
      )}

      <div className="mt-10 grid gap-16 sm:mt-12 min-[1760px]:grid-cols-[minmax(0,1fr)_18rem] min-[1760px]:gap-10">
        <ProjectGrid projects={projects} />

        <aside
          aria-label="今日与更新"
          className="grid md:grid-cols-2 min-[1760px]:block min-[1760px]:border-l min-[1760px]:pl-8"
          style={{ borderColor: 'rgba(44,42,48,0.11)' }}
        >
          <div
            className="border-y md:max-[1759px]:border-r"
            style={{ borderColor: 'rgba(44,42,48,0.11)' }}
          >
            <CalendarCard />
          </div>
          <div
            className="border-y min-[1760px]:border-t-0"
            style={{ borderColor: 'rgba(44,42,48,0.11)' }}
          >
            <PoemCard />
          </div>
          <div className="border-b md:col-span-2" style={{ borderColor: 'rgba(44,42,48,0.11)' }}>
            <Timeline updates={updates} />
          </div>
        </aside>
      </div>
    </PageMain>
    <Footer />
  </div>
)

const App = () => (
  <HashRouter>
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center text-sm"
          style={{ background: 'var(--bg-page)', color: 'var(--text-muted)' }}
        >
          加载中...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gacha-simulator" element={<GachaSimulator />} />
        <Route path="/piano" element={<PianoPage />} />
        <Route path="/metronome" element={<MetronomePage />} />
        <Route path="/netease-cover" element={<NeteaseCoverPage />} />
        <Route path="/pixiv-image-extractor" element={<PixivCoverPage />} />
        <Route path="/audio-separator" element={<AudioSeparatorPage />} />
        <Route path="/guitar-fretboard-trainer" element={<GuitarFretboardTrainerPage />} />
        <Route path="/pitch-detector" element={<PitchDetectorPage />} />
      </Routes>
    </Suspense>
  </HashRouter>
)

export default App
