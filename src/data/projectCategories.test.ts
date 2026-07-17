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

  it('使用约定的古典命名与功能简介', () => {
    expect(PROJECT_CATEGORIES.map(({ title, description }) => ({ title, description }))).toEqual([
      { title: '弦歌有声', description: '宫商迭奏，安放乐器、节拍与听辨练习' },
      { title: '丹青拾光', description: '丹青不老，收录图像与内容的灵光' },
      { title: '浮生半日', description: '偷得片刻闲，容一场偶遇与欢喜' },
    ])
  })
})
