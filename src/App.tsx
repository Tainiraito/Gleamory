import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import type { ProjectsData, UpdatesData } from '@/types'
import SiteHeader from '@/components/SiteHeader'
import ProjectGrid from '@/components/ProjectGrid'
import CalendarCard from '@/components/CalendarCard'
import PoemCard from '@/components/PoemCard'
import Timeline from '@/components/Timeline'
import Footer from '@/components/Footer'
import projectsData from '@/data/projects.json'
import updatesData from '@/data/timeline.json'

const GachaSimulator = lazy(() => import('@/pages/GachaSimulator'))
const PianoPage = lazy(() => import('@/pages/PianoPage'))
const MetronomePage = lazy(() => import('@/pages/MetronomePage'))
const NeteaseCoverPage = lazy(() => import('@/pages/NeteaseCoverPage'))
const PixivCoverPage = lazy(() => import('@/pages/PixivCoverPage'))
const AudioSeparatorPage = lazy(() => import('@/pages/AudioSeparatorPage'))

const GachaSimulator = lazy(() => import('@/pages/GachaSimulator'))
const PianoPage = lazy(() => import('@/pages/PianoPage'))
const MetronomePage = lazy(() => import('@/pages/MetronomePage'))
const NeteaseCoverPage = lazy(() => import('@/pages/NeteaseCoverPage'))
const PixivCoverPage = lazy(() => import('@/pages/PixivCoverPage'))

const { projects } = projectsData as ProjectsData
const { updates } = updatesData as UpdatesData

const HomePage = () => (
  <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
    <SiteHeader />
    <main className="px-6 sm:px-[15%] py-20 sm:py-24">
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
      </Routes>
    </Suspense>
  </HashRouter>
)

export default App
