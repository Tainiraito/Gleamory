import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

const TitleProbe = () => {
  useDocumentTitle('工具页 | Gleamory 微光集')
  return null
}

describe('useDocumentTitle', () => {
  it('组件卸载后恢复挂载前的网页标题', () => {
    document.title = 'Gleamory 微光集'

    const view = render(<TitleProbe />)

    expect(document.title).toBe('工具页 | Gleamory 微光集')
    view.unmount()
    expect(document.title).toBe('Gleamory 微光集')
  })
})
