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
  const rest = projects.slice(1)

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Featured project — full width, prominent */}
      <div className="w-full">
        <ProjectCard project={featured} index={0} variant="featured" />
      </div>

      {/* Rest projects — simple list, one per row */}
      {rest.length > 0 ? (
        <div className="space-y-4">
          {rest.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i + 1} variant="list" />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default ProjectGrid
