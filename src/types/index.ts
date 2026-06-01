export type ProjectStatus = '开发中' | '已上线' | '已下线' | '在线'

export interface Project {
  id: string
  name: string
  description: string
  url: string
  status: ProjectStatus
  tags: string[]
  cover?: string
  /**
   * 无 cover 图时的占位渐变色，格式 'from,to'（CSS color）
   * 例如 'rgba(124,131,255,0.25),rgba(124,131,255,0.05)'
   */
  placeholderGradient?: string
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
