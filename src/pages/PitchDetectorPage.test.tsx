import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PitchDetectorPage from './PitchDetectorPage'

describe('PitchDetectorPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('switches from live detection to upload analysis', async () => {
    render(
      <MemoryRouter>
        <PitchDetectorPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '音高检测' })).toBeInTheDocument()
    expect(screen.getByLabelText('当前音高读数')).toBeInTheDocument()
    expect(screen.getByText('等待稳定音高')).toBeInTheDocument()
    expect(screen.getByText('音频仅在本机处理，不会上传')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '实时音高曲线' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '实时检测' })).toHaveAttribute('aria-selected', 'true')

    const microphoneButton = screen.getByRole('button', { name: '麦克风' })
    const displayAudioButton = screen.getByRole('button', { name: '电脑音频' })
    expect(microphoneButton).toHaveAttribute('aria-pressed', 'true')
    expect(displayAudioButton).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('麦克风输入')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '环境降噪 开' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(displayAudioButton)

    expect(microphoneButton).toHaveAttribute('aria-pressed', 'false')
    expect(displayAudioButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('屏幕或标签页音频')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '上传分析' }))

    expect(screen.getByRole('tab', { name: '上传分析' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('选择音频文件并检测音高')).toBeInTheDocument()
  })

  it('shows the microphone permission failure and stays recoverable', async () => {
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(new Error('麦克风权限被拒绝，请在浏览器设置中允许访问。'))
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia,
        getDisplayMedia: vi.fn(),
      },
    })

    render(
      <MemoryRouter>
        <PitchDetectorPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '开始' }))

    const errorMessage = await screen.findByText('麦克风权限被拒绝，请在浏览器设置中允许访问。')
    const errorAlert = errorMessage.closest('[data-slot="alert"]')
    expect(errorAlert).not.toBeNull()
    expect(errorAlert).toHaveClass('min-w-0')
    expect(errorAlert?.parentElement).toHaveClass('w-full', 'min-w-0', 'px-5')
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    })
    expect(screen.getByRole('button', { name: '开始' })).toBeEnabled()
  })

  it('prepares recorded audio on pause and starts playback from the explicit control', async () => {
    const stream = {
      getAudioTracks: () => [{}],
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream
    class FakeAudioContext {
      sampleRate = 44_100
      state = 'running'
      resume = vi.fn().mockResolvedValue(undefined)
      createAnalyser = () => ({
        fftSize: 0,
        smoothingTimeConstant: 0,
        disconnect: vi.fn(),
        getFloatTimeDomainData: vi.fn(),
      })
      createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: vi.fn() })
      createBiquadFilter = () => ({
        type: 'highpass',
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      })
      close = vi.fn().mockResolvedValue(undefined)
    }
    class FakeMediaRecorder {
      state: RecordingState = 'inactive'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: (() => void) | null = null
      start() {
        this.state = 'recording'
      }
      requestData() {
        this.ondataavailable?.({
          data: new Blob(['recorded'], { type: 'audio/webm' }),
        } as BlobEvent)
      }
      stop() {
        this.state = 'inactive'
        this.onstop?.()
      }
    }
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => HTMLMediaElement.HAVE_METADATA,
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      get: () => 8,
    })
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
        getDisplayMedia: vi.fn(),
      },
    })
    vi.stubGlobal('AudioContext', FakeAudioContext)
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 9),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:recording'),
      revokeObjectURL: vi.fn(),
    })

    render(
      <MemoryRouter>
        <PitchDetectorPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: '开始' }))
    expect(await screen.findByText('检测中')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    const playbackButton = await screen.findByRole('button', { name: '播放回放' })
    expect(playbackButton).toBeEnabled()

    fireEvent.click(playbackButton)
    expect(play).toHaveBeenCalledOnce()

    const chart = screen.getByRole('group', { name: '交互式音高曲线' })
    Object.defineProperty(chart, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 960, height: 360, right: 960, bottom: 360 }),
    })
    Object.defineProperty(chart, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
    fireEvent.pointerDown(chart, { clientX: 300, pointerId: 1 })
    fireEvent.pointerUp(chart, { clientX: 300, pointerId: 1 })
    expect(play).toHaveBeenCalledTimes(2)
  })

  it('plays a piano reference tone from a vertical-axis note', () => {
    const createOscillator = vi.fn(() => ({
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      detune: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }))
    class FakeReferenceAudioContext {
      state = 'running'
      currentTime = 0
      destination = {}
      createOscillator = createOscillator
      createGain = () => ({
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
      })
      createBiquadFilter = () => ({
        type: 'lowpass',
        frequency: { value: 0 },
        connect: vi.fn(),
      })
      resume = vi.fn().mockResolvedValue(undefined)
      close = vi.fn().mockResolvedValue(undefined)
    }
    vi.stubGlobal('AudioContext', FakeReferenceAudioContext)

    render(
      <MemoryRouter>
        <PitchDetectorPage />
      </MemoryRouter>,
    )
    const referenceButtons = screen.getAllByRole('button', { name: /播放标准音/ })
    expect(referenceButtons.length).toBeGreaterThan(4)

    fireEvent.click(referenceButtons[0])
    expect(createOscillator).toHaveBeenCalledTimes(2)
  })

  it('rejects oversized uploads with an actionable error', async () => {
    const { container } = render(
      <MemoryRouter>
        <PitchDetectorPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('tab', { name: '上传分析' }))
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    const file = new File(['audio'], 'too-large.wav', { type: 'audio/wav' })
    Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 })

    fireEvent.change(input!, { target: { files: [file] } })

    expect(await screen.findAllByText(/文件太大.*超过 100 MB 限制/)).toHaveLength(2)
    expect(screen.getByText('分析失败')).toBeInTheDocument()
  })

  it('releases live audio resources when leaving the page', async () => {
    const stopTrack = vi.fn()
    const disconnectSource = vi.fn()
    const disconnectAnalyser = vi.fn()
    const disconnectFilter = vi.fn()
    const closeAudioContext = vi.fn().mockResolvedValue(undefined)
    const cancelAnimationFrame = vi.fn()
    const stream = {
      getAudioTracks: () => [{}],
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream
    class FakeAudioContext {
      sampleRate = 44_100
      state = 'running'
      resume = vi.fn().mockResolvedValue(undefined)
      createAnalyser = () => ({
        fftSize: 0,
        smoothingTimeConstant: 0,
        disconnect: disconnectAnalyser,
        getFloatTimeDomainData: vi.fn(),
      })
      createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: disconnectSource })
      createBiquadFilter = () => ({
        type: 'highpass',
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: disconnectFilter,
      })
      close = closeAudioContext
    }
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
        getDisplayMedia: vi.fn(),
      },
    })
    vi.stubGlobal('AudioContext', FakeAudioContext)
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 7),
    )
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
    vi.stubGlobal('MediaRecorder', undefined)

    const { unmount } = render(
      <MemoryRouter>
        <PitchDetectorPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: '开始' }))
    expect(await screen.findByText('检测中')).toBeInTheDocument()

    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7)
    expect(stopTrack).toHaveBeenCalledOnce()
    expect(disconnectSource).toHaveBeenCalledOnce()
    expect(disconnectAnalyser).toHaveBeenCalledOnce()
    expect(disconnectFilter).toHaveBeenCalledTimes(2)
    expect(closeAudioContext).toHaveBeenCalledOnce()
  })
})
