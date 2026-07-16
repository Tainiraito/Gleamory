import { describe, expect, it } from 'vitest'

import { FEATURED_PROJECT_ID, PROJECT_CATEGORIES } from './projectCategories'
import projectsData from './projects.json'

describe('首页项目分类', () => {
  it('让每个普通项目恰好归入一个分类', () => {
    const categorizedIds = PROJECT_CATEGORIES.flatMap((category) => category.projectIds)
    const regularProjectIds = projectsData.projects
      .map((project) => project.id)
      .filter((projectId) => projectId !== FEATURED_PROJECT_ID)

    expect(new Set(categorizedIds).size).toBe(categorizedIds.length)
    expect([...categorizedIds].sort()).toEqual([...regularProjectIds].sort())
  })

  it('分类标题与标识保持唯一', () => {
    const categoryIds = PROJECT_CATEGORIES.map((category) => category.id)
    const categoryTitles = PROJECT_CATEGORIES.map((category) => category.title)

    expect(new Set(categoryIds).size).toBe(categoryIds.length)
    expect(new Set(categoryTitles).size).toBe(categoryTitles.length)
  })
})
