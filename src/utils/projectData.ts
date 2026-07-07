import projectsData from '@/data/projects.json'

interface Project {
  id: string
  name: string
  description: string
  url: string
  status: string
  tags: string[]
  cover?: string
  version: string
  updatedAt: string
}

const projects: Project[] = projectsData.projects

export function getProjectById(id: string): Project | undefined {
  return projects.find(p => p.id === id)
}

export function getProjectVersion(id: string): string | undefined {
  return getProjectById(id)?.version?.replace(/^v/, '') // strip leading 'v'
}
