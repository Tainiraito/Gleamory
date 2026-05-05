export interface Project {
  id: string
  name: string
  description: string
  url: string
  status: '开发中' | '已上线' | '已下线'
  tags: string[]
  cover?: string
  version?: string
  updatedAt?: string
}

export interface Update {
  id: string
  projectId: string
  content: string
  date: string
}

export interface ProjectsData {
  projects: Project[]
}

export interface UpdatesData {
  updates: Update[]
}
