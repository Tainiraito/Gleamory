import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App routes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
  })

  it('renders the guitar fretboard trainer from its hash route', async () => {
    window.location.hash = '/guitar-fretboard-trainer'

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: '指板音训练' }, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main').firstElementChild).toHaveClass('max-w-[100rem]')
    expect(screen.getByRole('link', { name: 'Gleamory' }).parentElement).toHaveClass(
      'max-w-[100rem]',
    )
  })

  it('renders the pitch detector from its hash route', async () => {
    window.location.hash = '/pitch-detector'

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: '音高检测' }, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '实时检测' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '上传分析' })).toBeInTheDocument()
    expect(screen.getByRole('main').firstElementChild).toHaveClass('max-w-[100rem]')
    expect(screen.getByRole('link', { name: 'Gleamory' }).parentElement).toHaveClass(
      'max-w-[100rem]',
    )
  })

  it('首页内容在宽屏保持统一最大宽度', () => {
    window.location.hash = '/'

    render(<App />)

    const content = screen.getByRole('main').firstElementChild
    const headerContent = screen.getByRole('link', { name: 'Gleamory' }).parentElement
    expect(content).toHaveClass('mx-auto', 'w-full', 'max-w-[90rem]')
    expect(headerContent).toHaveClass('mx-auto', 'w-full', 'max-w-[90rem]')
    expect(headerContent?.parentElement).toHaveClass('px-6', 'sm:px-[5.5%]')
    expect(screen.getByRole('region', { name: '微光集图片轮播' }).parentElement).toBe(content)
  })
})
