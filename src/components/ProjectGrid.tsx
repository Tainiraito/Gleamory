import type { Project } from '@/types'
import ProjectListItem from '@/components/ProjectListItem'
import { FEATURED_PROJECT_ID, PROJECT_CATEGORIES } from '@/data/projectCategories'

interface ProjectGridProps {
  projects: Project[]
}

interface ProjectSection {
  id: string
  title: string
  description: string
  projects: Project[]
}

const CHAPTER_MARKS = ['一', '二', '三', '四', '五', '六']

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

  const featured = projects.find((project) => project.id === FEATURED_PROJECT_ID) ?? projects[0]
  const regularProjects = new Map(
    projects
      .filter((project) => project.id !== featured.id)
      .map((project) => [project.id, project]),
  )
  const categorizedProjectIds = new Set<string>(
    PROJECT_CATEGORIES.flatMap((category) => category.projectIds),
  )
  const sections: ProjectSection[] = PROJECT_CATEGORIES.map((category) => ({
    ...category,
    projects: category.projectIds.flatMap((projectId) => {
      const project = regularProjects.get(projectId)
      return project ? [project] : []
    }),
  })).filter((category) => category.projects.length > 0)
  const uncategorizedProjects = projects.filter(
    (project) => project.id !== featured.id && !categorizedProjectIds.has(project.id),
  )

  if (uncategorizedProjects.length > 0) {
    sections.push({
      id: 'other',
      title: '其他项目',
      description: '等待进一步整理的微光',
      projects: uncategorizedProjects,
    })
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          aria-labelledby={`project-category-${section.id}`}
          className="grid gap-4 lg:grid-cols-[11.5rem_minmax(0,1fr)] lg:gap-5"
        >
          <div
            className="border-b pb-3 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0"
            style={{ borderColor: 'rgba(44,42,48,0.11)' }}
          >
            <div className="min-w-0">
              <span
                aria-hidden="true"
                className="font-kai text-xs tracking-[0.16em]"
                style={{ color: 'var(--accent-amber)' }}
              >
                卷 {CHAPTER_MARKS[sectionIndex] ?? sectionIndex + 1}
              </span>
              <div className="mt-2 min-w-0">
                <h2
                  id={`project-category-${section.id}`}
                  className="font-display text-xl font-semibold leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {section.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {section.description}
                </p>
              </div>
            </div>
          </div>

          <ol
            aria-label={`${section.title}项目列表`}
            className="min-w-0 border-y"
            style={{ borderColor: 'rgba(44,42,48,0.1)' }}
          >
            {section.projects.map((project) => (
              <ProjectListItem key={project.id} project={project} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

export default ProjectGrid
