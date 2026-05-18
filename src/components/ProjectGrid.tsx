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

  // Fill to multiple of 3 with placeholders
  const itemsPerRow = 3
  const restWithPlaceholders = [...rest]
  const remainder = rest.length % itemsPerRow
  if (remainder > 0) {
    const placeholdersNeeded = itemsPerRow - remainder
    for (let i = 0; i < placeholdersNeeded; i++) {
      restWithPlaceholders.push(null as unknown as Project)
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Featured project — full width */}
      <div className="w-full">
        <ProjectCard project={featured} index={0} variant="featured" />
      </div>

      {/* Rest projects — 3-column grid with placeholders */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restWithPlaceholders.map((project, i) => {
            if (project === null) {
              // Placeholder card
              return (
                <div
                  key={`placeholder-${i}`}
                  className="flex items-center justify-center p-6 sm:p-8 min-h-[120px]"
                  style={{
                    background: 'var(--bg-card)',
                    border: '0.5px dashed var(--border-line)',
                    opacity: 0.4,
                  }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    敬请期待
                  </span>
                </div>
              )
            }
            return (
              <ProjectCard key={project.id} project={project} index={i + 1} variant="list" />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProjectGrid
