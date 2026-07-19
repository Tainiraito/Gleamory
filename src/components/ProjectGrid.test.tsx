import { render, screen, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import ProjectGrid from './ProjectGrid'
import projectsData from '@/data/projects.json'
import type { ProjectsData } from '@/types'

const { projects } = projectsData as ProjectsData

describe('ProjectGrid', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('按用户目标分组展示单列项目列表', () => {
    render(<ProjectGrid projects={projects} />)

    const musicSection = screen.getByRole('heading', { name: '弦歌有声' }).closest('section')
    const contentSection = screen.getByRole('heading', { name: '丹青拾光' }).closest('section')
    const leisureSection = screen.getByRole('heading', { name: '浮生半日' }).closest('section')
    const writingSection = screen.getByRole('heading', { name: '笺墨相助' }).closest('section')

    expect(musicSection).not.toBeNull()
    expect(contentSection).not.toBeNull()
    expect(leisureSection).not.toBeNull()
    expect(writingSection).not.toBeNull()

    expect(within(musicSection!).getByRole('heading', { name: '音高检测' })).toBeInTheDocument()
    expect(within(musicSection!).getByRole('heading', { name: '音轨分离' })).toBeInTheDocument()
    expect(
      within(contentSection!).getByRole('heading', { name: 'Pixiv 插画下载' }),
    ).toBeInTheDocument()
    expect(within(leisureSection!).getByRole('heading', { name: '抽卡模拟' })).toBeInTheDocument()
    expect(
      within(writingSection!).getByRole('heading', { name: 'Markdown 注音' }),
    ).toBeInTheDocument()
    expect(within(writingSection!).getByRole('link', { name: /Markdown 注音/ })).not.toHaveAttribute(
      'target',
    )
    expect(within(musicSection!).getAllByRole('listitem')).toHaveLength(5)
    expect(
      within(musicSection!).getByRole('list', { name: '弦歌有声项目列表' }),
    ).toBeInTheDocument()
    expect(within(musicSection!).queryByText('01')).not.toBeInTheDocument()
    expect(screen.queryByText('敬请期待')).not.toBeInTheDocument()
  })

  it('为未配置分类的项目提供其他项目回退分组', () => {
    render(
      <ProjectGrid
        projects={[
          projects[0],
          {
            id: 'new-project',
            name: '新项目',
            description: '尚未归类的项目',
            url: '',
            status: '开发中',
            tags: [],
          },
        ]}
      />,
    )

    const fallbackSection = screen.getByRole('heading', { name: '其他项目' }).closest('section')
    expect(fallbackSection).not.toBeNull()
    expect(within(fallbackSection!).getByRole('heading', { name: '新项目' })).toBeInTheDocument()
  })
})
