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

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </div>
  )
}

export default ProjectGrid
