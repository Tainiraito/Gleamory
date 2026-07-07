import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PitchDetectorPage from './PitchDetectorPage'

describe('PitchDetectorPage', () => {
  it('switches from live detection to upload analysis', async () => {
    render(
      <MemoryRouter>
        <PitchDetectorPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '上传分析' }))

    expect(await screen.findByText('选择音频文件并检测音高')).toBeInTheDocument()
  })
})
