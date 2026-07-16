import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HomeHeroCarousel from './HomeHeroCarousel'

describe('HomeHeroCarousel', () => {
  it('只展示站点标题与简介，不再展示项目元信息', () => {
    render(<HomeHeroCarousel title="微光集" description="个人项目展示首页" />)

    const carousel = screen.getByRole('region', { name: '微光集图片轮播' })
    expect(within(carousel).getByRole('heading', { name: '微光集', level: 1 })).toBeInTheDocument()
    expect(within(carousel).getByText('个人项目展示首页')).toBeInTheDocument()
    expect(within(carousel).queryByText('在线网站')).not.toBeInTheDocument()
    expect(within(carousel).queryByText('v1.0.0')).not.toBeInTheDocument()
    expect(within(carousel).queryByRole('link')).not.toBeInTheDocument()
  })

  it('可以通过按钮和键盘切换图片', () => {
    render(<HomeHeroCarousel title="微光集" description="个人项目展示首页" />)

    const carousel = screen.getByRole('region', { name: '微光集图片轮播' })
    expect(within(carousel).getByText('01 / 03')).toBeInTheDocument()
    expect(within(carousel).getByAltText('镜音铃与镜音连的彩色插画')).toBeInTheDocument()

    fireEvent.click(within(carousel).getByRole('button', { name: '下一张图片' }))
    expect(within(carousel).getByText('02 / 03')).toBeInTheDocument()
    expect(within(carousel).getByAltText('荧与月色主题插画')).toBeInTheDocument()

    fireEvent.click(within(carousel).getByRole('button', { name: '切换到第 3 张图片' }))
    expect(within(carousel).getByText('03 / 03')).toBeInTheDocument()
    expect(
      within(carousel).getByAltText('桑多涅与小动物在暖色光影中的插画'),
    ).toBeInTheDocument()

    fireEvent.keyDown(carousel, { key: 'ArrowLeft' })
    expect(within(carousel).getByText('02 / 03')).toBeInTheDocument()
  })
})
