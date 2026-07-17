import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import SiteHeader from './SiteHeader'

describe('SiteHeader', () => {
  it.each([
    ['standard', 'px-6', 'sm:px-[5.5%]', 'max-w-[90rem]'],
    ['wide', 'px-4', 'lg:px-8', 'max-w-[100rem]'],
  ] as const)('让 %s 布局与对应页面内容宽度一致', (width, mobile, desktop, inner) => {
    render(
      <MemoryRouter>
        <SiteHeader width={width} />
      </MemoryRouter>,
    )

    const headerContent = screen.getByRole('link', { name: 'Gleamory' }).parentElement
    expect(headerContent?.parentElement).toHaveClass(mobile, desktop)
    expect(headerContent).toHaveClass(inner)
  })
})
