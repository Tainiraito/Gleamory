import type { Project } from '@/types'
import ProjectCard from '@/components/ProjectCard'

interface ProjectGridProps {
  projects: Project[]
}

const ProjectGrid = ({ projects }: ProjectGridProps) => {
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="font-display text-lg" style={{ color: 'var(--text-muted)' }}>
          暂无项目
        </p>
      </div>
    )
  }

  const featured = projects[0]
  const secondary = projects[1]
  const rest = projects.slice(2)

  return (
    <>
      {/* Magazine grid: featured (7 cols) + secondary (5 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7">
          {featured && <ProjectCard project={featured} index={0} variant="featured" />}
        </div>
        <div className="md:col-span-5 flex flex-col gap-8">
          {secondary && <ProjectCard project={secondary} index={1} variant="secondary" />}
          <div
            className="rounded-sm flex flex-col items-center justify-center py-12 flex-1"
            style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <div style={{ height: '1px', background: 'var(--accent-pink)', width: '48px', marginBottom: '16px' }} />
            <p
              className="font-display text-sm text-center leading-relaxed px-8"
              style={{ color: 'var(--text-muted)' }}
            >
              更多项目筹备中...
            </p>
            <span
              className="text-[0.6rem] uppercase tracking-widest mt-2"
              style={{ color: 'var(--border-line)' }}
            >
              Coming Soon
            </span>
          </div>
        </div>
      </div>

      {/* Additional projects in compact list */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-8 mt-8">
          {rest.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i + 2} variant="secondary" />
          ))}
        </div>
      )}
    </>
  )
}

export default ProjectGrid
