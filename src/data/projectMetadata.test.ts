import { describe, expect, it } from 'vitest'
import projectsData from './projects.json'
import timelineData from './timeline.json'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

describe('项目元数据一致性', () => {
  it('项目和时间线 ID 保持唯一', () => {
    const projectIds = projectsData.projects.map((project) => project.id)
    const updateIds = timelineData.updates.map((update) => update.id)

    expect(new Set(projectIds).size).toBe(projectIds.length)
    expect(new Set(updateIds).size).toBe(updateIds.length)
  })

  it('时间线只引用已存在的项目', () => {
    const projectIds = new Set(projectsData.projects.map((project) => project.id))

    expect(
      timelineData.updates.filter((update) => !projectIds.has(update.projectId)),
    ).toEqual([])
  })

  it('项目更新时间与最新时间线日期一致', () => {
    for (const project of projectsData.projects) {
      const timelineDates = timelineData.updates
        .filter(
          (update) =>
            update.projectId === project.id && ISO_DATE_PATTERN.test(update.date),
        )
        .map((update) => update.date)
        .sort()

      if (timelineDates.length === 0) continue

      expect(project.updatedAt, project.id).toBe(
        timelineDates[timelineDates.length - 1],
      )
    }
  })
})
