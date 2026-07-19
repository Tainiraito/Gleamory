import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Activity,
  AlertCircle,
  FileAudio,
  Maximize2,
  Mic,
  MonitorSpeaker,
  MousePointer2,
  MoveHorizontal,
  Pause,
  Play,
  RotateCcw,
  Upload,
  Volume2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import SiteHeader from '@/components/SiteHeader'
import { PageMain } from '@/components/PageContainer'
import BackFooter from '@/components/BackFooter'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePianoAudio } from '@/hooks/usePianoAudio'
import { decodeAudioFile, toMono, validateDuration, validateFileSize } from '@/lib/audio/decode'
import {
  analyzePitchTrack,
  createLivePitchStabilizerState,
  detectPitch,
  stabilizeLivePitch,
  type PitchDetection,
  type PitchTrackPoint,
} from '@/lib/audio/pitch'
import {
  chartYFromFrequency,
  clampPitchView,
  noteTicksForFrequencyRange,
  panPitchView,
  spaceFrequencyTicks,
  svgXFromClientX,
  timeFromChartX,
  zoomPitchView,
  type PitchViewport,
} from '@/lib/audio/pitchView'
import { consumePitchTransfer, type PitchSource } from '@/lib/audio/pitchTransfer'
import { formatNoteNameForDisplay } from '@/utils/music'
import { getProjectById } from '@/utils/projectData'

type PitchTab = 'live' | 'upload'
type LiveStatus = 'idle' | 'running' | 'paused'
type UploadStatus = 'idle' | 'analyzing' | 'done' | 'error'

const LIVE_FRAME_SIZE = 4096
const LIVE_HOP_SECONDS = 0.08
const LIVE_HISTORY_SECONDS = 180
const DEFAULT_VIEWPORT: PitchViewport = { startTime: 0, endTime: 20 }
const CHART_WIDTH = 960
const CHART_HEIGHT = 360
const CHART_PLOT = { left: 48, right: 10, top: 18, bottom: 30 }
const PANEL_INSET_STYLE = {
  background: 'rgba(255,255,255,0.46)',
  border: '0.5px solid var(--border-line)',
}

const EMPTY_DETECTION: PitchDetection = {
  frequencyHz: null,
  midi: null,
  noteName: null,
  cents: null,
  confidence: 0,
  isVoiced: false,
}

const PitchDetectorPage = () => {
  useDocumentTitle('音高检测 | Gleamory 微光集')
  const project = getProjectById('pitch-detector')!
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<PitchTab>('live')

  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle')
  const [liveSource, setLiveSource] = useState<PitchSource>('microphone')
  const [livePoints, setLivePoints] = useState<PitchTrackPoint[]>([])
  const [liveCurrent, setLiveCurrent] = useState<PitchDetection>(EMPTY_DETECTION)
  const [liveCursorTime, setLiveCursorTime] = useState(0)
  const [liveViewport, setLiveViewport] = useState<PitchViewport>(DEFAULT_VIEWPORT)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [livePlaybackUrl, setLivePlaybackUrl] = useState<string | null>(null)
  const [livePlaybackTime, setLivePlaybackTime] = useState(0)
  const [livePlaying, setLivePlaying] = useState(false)
  const [liveVolume, setLiveVolume] = useState(0.9)
  const [liveNoiseReduction, setLiveNoiseReduction] = useState(true)
  const [liveRecordingAvailable, setLiveRecordingAvailable] = useState(false)

  const [uploadFileName, setUploadFileName] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadLogs, setUploadLogs] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadPoints, setUploadPoints] = useState<PitchTrackPoint[]>([])
  const [uploadAudioUrl, setUploadAudioUrl] = useState<string | null>(null)
  const [uploadCurrentTime, setUploadCurrentTime] = useState(0)
  const [uploadDuration, setUploadDuration] = useState(0)
  const [uploadViewport, setUploadViewport] = useState<PitchViewport>(DEFAULT_VIEWPORT)
  const [uploadPlaying, setUploadPlaying] = useState(false)
  const [uploadVolume, setUploadVolume] = useState(0.9)

  const uploadAudioRef = useRef<HTMLAudioElement | null>(null)
  const livePlaybackAudioRef = useRef<HTMLAudioElement | null>(null)
  const uploadAudioUrlRef = useRef<string | null>(null)
  const livePlaybackUrlRef = useRef<string | null>(null)
  const liveAudioContextRef = useRef<AudioContext | null>(null)
  const liveStreamRef = useRef<MediaStream | null>(null)
  const liveSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const liveFilterNodesRef = useRef<AudioNode[]>([])
  const liveRecorderRef = useRef<MediaRecorder | null>(null)
  const liveRecordingChunksRef = useRef<Blob[]>([])
  const liveRecordingDiscardRef = useRef(false)
  const pendingLiveSeekRef = useRef<number | null>(null)
  const livePitchStabilizerRef = useRef(createLivePitchStabilizerState())
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const liveStartMsRef = useRef(0)
  const liveBaseSecondsRef = useRef(0)
  const lastLiveSampleMsRef = useRef(0)

  const appendUploadLog = useCallback((message: string) => {
    setUploadLogs((prev) => [...prev.slice(-7), `${formatClockTime(new Date())} ${message}`])
  }, [])

  const setLivePlaybackObjectUrl = useCallback((url: string | null) => {
    setLivePlaybackUrl((prev) => {
      if (prev && prev !== url) URL.revokeObjectURL(prev)
      livePlaybackUrlRef.current = url
      return url
    })
  }, [])

  const playLiveAudioAt = useCallback(
    (audio: HTMLAudioElement, url: string, time: number) => {
      const startPlayback = () => {
        try {
          const duration = Number.isFinite(audio.duration) ? audio.duration : time
          audio.currentTime = Math.max(0, Math.min(time, duration))
          void audio.play().catch(() => {
            setLivePlaying(false)
            setLiveError('浏览器没有成功开始回放，请再次点击“播放回放”。')
          })
        } catch {
          setLivePlaying(false)
          setLiveError('录音仍在生成索引，请稍等片刻后再次点击曲线。')
        }
      }

      audio.src = url
      audio.volume = liveVolume
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) startPlayback()
      else {
        audio.addEventListener('loadedmetadata', startPlayback, { once: true })
        audio.load()
      }
    },
    [liveVolume],
  )

  const prepareLivePlayback = useCallback(
    (time?: number) => {
      if (liveRecordingChunksRef.current.length === 0) {
        setLiveRecordingAvailable(false)
        setLiveError('还没有可回放的录音片段，请先检测至少一秒。')
        return
      }
      const blob = new Blob(liveRecordingChunksRef.current, {
        type: liveRecordingChunksRef.current[0]?.type || 'audio/webm',
      })
      const url = URL.createObjectURL(blob)
      setLivePlaybackObjectUrl(url)
      setLiveRecordingAvailable(true)
      if (time != null && livePlaybackAudioRef.current) {
        playLiveAudioAt(livePlaybackAudioRef.current, url, time)
      }
    },
    [playLiveAudioAt, setLivePlaybackObjectUrl],
  )

  const stopLiveInput = useCallback(() => {
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    const recorder = liveRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.requestData()
        recorder.stop()
      } catch {
        // MediaRecorder may reject requestData while shutting down; recorded chunks collected so far remain usable.
      }
    }
    liveRecorderRef.current = null
    liveStreamRef.current?.getTracks().forEach((track) => track.stop())
    liveStreamRef.current = null
    liveSourceNodeRef.current?.disconnect()
    liveSourceNodeRef.current = null
    liveFilterNodesRef.current.forEach((node) => node.disconnect())
    liveFilterNodesRef.current = []
    analyserRef.current?.disconnect()
    analyserRef.current = null
  }, [])

  const runLiveLoop = useCallback(() => {
    const analyser = analyserRef.current
    const audioContext = liveAudioContextRef.current
    if (!analyser || !audioContext) return

    const frame = new Float32Array(analyser.fftSize)
    const tick = () => {
      const now = performance.now()
      if (now - lastLiveSampleMsRef.current >= LIVE_HOP_SECONDS * 1000) {
        analyser.getFloatTimeDomainData(frame)
        const rawDetection = detectPitch(
          frame,
          audioContext.sampleRate,
          liveNoiseReduction ? { rmsThreshold: 0.016, confidenceThreshold: 0.9 } : {},
        )
        const detection = stabilizeLivePitch(rawDetection, livePitchStabilizerRef.current)
        const time = liveBaseSecondsRef.current + (now - liveStartMsRef.current) / 1000
        setLiveCurrent(detection)
        setLiveCursorTime(time)
        setLivePoints((prev) => {
          const next = [...prev, { time, ...detection }]
          const minTime = Math.max(0, time - LIVE_HISTORY_SECONDS)
          return next.filter((point) => point.time >= minTime)
        })
        setLiveViewport((prev) => {
          const span = Math.max(12, prev.endTime - prev.startTime)
          if (prev.endTime < time - LIVE_HOP_SECONDS * 4 && prev.endTime > 1) return prev
          return { startTime: Math.max(0, time - span), endTime: Math.max(span, time + 1) }
        })
        lastLiveSampleMsRef.current = now
      }
      animationFrameRef.current = requestAnimationFrame(tick)
    }
    animationFrameRef.current = requestAnimationFrame(tick)
  }, [liveNoiseReduction])

  const startLiveRecorder = useCallback(
    (stream: MediaStream) => {
      if (typeof MediaRecorder === 'undefined') {
        setLiveError('当前浏览器不支持录制实时输入，因此曲线点击回放不可用。音高检测仍可继续。')
        return
      }
      try {
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (event) => {
          if (!liveRecordingDiscardRef.current && event.data.size > 0) {
            liveRecordingChunksRef.current.push(event.data)
            setLiveRecordingAvailable(true)
          }
        }
        recorder.onstop = () => {
          if (liveRecordingDiscardRef.current) return
          const pendingTime = pendingLiveSeekRef.current
          pendingLiveSeekRef.current = null
          prepareLivePlayback(pendingTime ?? undefined)
        }
        recorder.start(1000)
        liveRecorderRef.current = recorder
      } catch {
        setLiveError('实时输入已开始，但浏览器无法录制该音频流，曲线点击回放不可用。')
      }
    },
    [prepareLivePlayback],
  )

  const startLive = useCallback(
    async (source: PitchSource) => {
      stopLiveInput()
      setLiveError(null)
      setLiveSource(source)
      try {
        const stream =
          source === 'display-audio'
            ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            : await navigator.mediaDevices.getUserMedia({
                audio: liveNoiseReduction
                  ? {
                      channelCount: 1,
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: false,
                    }
                  : { channelCount: 1 },
              })

        if (stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach((track) => track.stop())
          throw new Error('没有捕获到音频轨道。分享屏幕或标签页时，请在浏览器弹窗中勾选音频。')
        }

        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const audioContext = liveAudioContextRef.current ?? new AudioContextCtor()
        await audioContext.resume()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = LIVE_FRAME_SIZE
        analyser.smoothingTimeConstant = 0
        const sourceNode = audioContext.createMediaStreamSource(stream)
        if (source === 'microphone' && liveNoiseReduction) {
          const highPass = audioContext.createBiquadFilter()
          highPass.type = 'highpass'
          highPass.frequency.value = 70
          const lowPass = audioContext.createBiquadFilter()
          lowPass.type = 'lowpass'
          lowPass.frequency.value = 1600
          sourceNode.connect(highPass)
          highPass.connect(lowPass)
          lowPass.connect(analyser)
          liveFilterNodesRef.current = [highPass, lowPass]
        } else {
          sourceNode.connect(analyser)
        }

        liveStreamRef.current = stream
        liveSourceNodeRef.current = sourceNode
        liveAudioContextRef.current = audioContext
        analyserRef.current = analyser
        liveStartMsRef.current = performance.now()
        liveBaseSecondsRef.current =
          livePoints.length > 0 ? livePoints[livePoints.length - 1].time : 0
        lastLiveSampleMsRef.current = 0
        liveRecordingDiscardRef.current = false
        if (livePoints.length === 0) {
          livePitchStabilizerRef.current = createLivePitchStabilizerState()
        }
        setLiveStatus('running')
        startLiveRecorder(stream)
        runLiveLoop()
      } catch (error) {
        stopLiveInput()
        setLiveStatus(livePoints.length > 0 ? 'paused' : 'idle')
        setLiveError(error instanceof Error ? error.message : String(error))
      }
    },
    [liveNoiseReduction, livePoints, runLiveLoop, startLiveRecorder, stopLiveInput],
  )

  const pauseLive = useCallback(() => {
    stopLiveInput()
    setLiveStatus(livePoints.length > 0 ? 'paused' : 'idle')
  }, [livePoints.length, stopLiveInput])

  const clearLive = useCallback(() => {
    liveRecordingDiscardRef.current = true
    pendingLiveSeekRef.current = null
    stopLiveInput()
    setLiveStatus('idle')
    setLivePoints([])
    setLiveCursorTime(0)
    setLivePlaybackTime(0)
    setLiveCurrent(EMPTY_DETECTION)
    setLiveRecordingAvailable(false)
    setLiveError(null)
    setLiveViewport(DEFAULT_VIEWPORT)
    liveRecordingChunksRef.current = []
    livePitchStabilizerRef.current = createLivePitchStabilizerState()
    setLivePlaybackObjectUrl(null)
  }, [setLivePlaybackObjectUrl, stopLiveInput])

  const seekLivePlayback = useCallback(
    (time: number) => {
      setLiveCursorTime(time)
      setLivePlaybackTime(time)
      setLiveError(null)
      if (liveStatus === 'running') {
        const recorder = liveRecorderRef.current
        const finalizingRecording = recorder?.state === 'recording'
        if (finalizingRecording) pendingLiveSeekRef.current = time
        stopLiveInput()
        setLiveStatus(livePoints.length > 0 ? 'paused' : 'idle')
        if (finalizingRecording) return
      }
      if (liveRecordingChunksRef.current.length === 0) {
        setLiveError('还没有可回放的实时录音片段。开始检测一小段时间后，再点击曲线定位播放。')
        return
      }
      prepareLivePlayback(time)
    },
    [livePoints.length, liveStatus, prepareLivePlayback, stopLiveInput],
  )

  const analyzeUploadFile = useCallback(
    (file: File, source: PitchSource = 'upload') => {
      setActiveTab('upload')
      setUploadStatus('analyzing')
      setUploadProgress(4)
      setUploadLogs([])
      setUploadError(null)
      setUploadFileName(file.name)
      setUploadPoints([])
      setUploadCurrentTime(0)
      setUploadDuration(0)
      setUploadViewport(DEFAULT_VIEWPORT)
      setUploadPlaying(false)
      setUploadAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        uploadAudioUrlRef.current = null
        return null
      })
      appendUploadLog(`已选择 ${file.name}`)

      void (async () => {
        try {
          validateFileSize(file, 100)
          setUploadProgress(16)
          appendUploadLog('文件大小校验通过')
          await nextFrame()

          const audioBuffer = await decodeAudioFile(file)
          validateDuration(audioBuffer, 10)
          setUploadProgress(42)
          appendUploadLog(`解码完成，时长 ${formatTime(audioBuffer.duration)}`)
          await nextFrame()

          const mono = toMono(audioBuffer)
          setUploadProgress(58)
          appendUploadLog('已转换为单声道分析数据')
          await nextFrame()

          const track = analyzePitchTrack(mono, audioBuffer.sampleRate, {
            frameSize: 4096,
            hopSize: 1024,
          })
          setUploadProgress(86)
          appendUploadLog(`完成 ${track.length} 个检测帧`)

          const url = URL.createObjectURL(file)
          setUploadAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            uploadAudioUrlRef.current = url
            return url
          })
          setUploadDuration(audioBuffer.duration)
          setUploadViewport({ startTime: 0, endTime: Math.max(1, audioBuffer.duration) })
          setUploadPoints(track)
          setUploadProgress(100)
          setUploadStatus('done')
          appendUploadLog(
            source === 'separator-result' ? '已载入音轨分离结果' : '分析完成，可以播放和定位曲线',
          )
        } catch (error) {
          setUploadStatus('error')
          setUploadProgress(100)
          const message = error instanceof Error ? error.message : String(error)
          setUploadError(message)
          appendUploadLog(`分析失败：${message}`)
        }
      })()
    },
    [appendUploadLog],
  )

  const seekUploadPlayback = useCallback(
    (time: number) => {
      const audio = uploadAudioRef.current
      const nextTime = Math.max(0, Math.min(time, audio?.duration || time))
      if (audio) {
        audio.currentTime = nextTime
        audio.volume = uploadVolume
        void audio.play()
        setUploadPlaying(true)
      }
      setUploadCurrentTime(nextTime)
    },
    [uploadVolume],
  )

  const toggleLivePlayback = useCallback(() => {
    const audio = livePlaybackAudioRef.current
    if (liveStatus === 'running' || !livePlaybackUrl) {
      seekLivePlayback(livePlaybackTime)
      return
    }
    if (!audio) return
    audio.volume = liveVolume
    if (audio.paused) {
      void audio.play().catch(() => {
        setLivePlaying(false)
        setLiveError('浏览器没有成功开始回放，请再次点击“播放回放”。')
      })
    } else {
      audio.pause()
    }
  }, [livePlaybackTime, livePlaybackUrl, liveStatus, liveVolume, seekLivePlayback])

  useEffect(() => {
    const transferId = searchParams.get('transfer')
    if (!transferId) return
    const transfer = consumePitchTransfer(transferId)
    if (!transfer) {
      setActiveTab('upload')
      setUploadStatus('error')
      setUploadError('没有找到音轨分离传来的临时音频。请下载分轨后在这里重新上传。')
      return
    }
    const file = new File([transfer.blob], transfer.metadata.fileName, {
      type: transfer.blob.type || 'audio/wav',
    })
    analyzeUploadFile(file, transfer.metadata.source)
  }, [analyzeUploadFile, searchParams])

  useEffect(() => {
    if (uploadAudioRef.current) uploadAudioRef.current.volume = uploadVolume
  }, [uploadVolume])

  useEffect(() => {
    if (livePlaybackAudioRef.current) livePlaybackAudioRef.current.volume = liveVolume
  }, [liveVolume])

  useEffect(() => {
    return () => {
      liveRecordingDiscardRef.current = true
      stopLiveInput()
      if (uploadAudioUrlRef.current) URL.revokeObjectURL(uploadAudioUrlRef.current)
      if (livePlaybackUrlRef.current) URL.revokeObjectURL(livePlaybackUrlRef.current)
      const audioContext = liveAudioContextRef.current
      liveAudioContextRef.current = null
      if (audioContext && audioContext.state !== 'closed') void audioContext.close()
    }
  }, [stopLiveInput])

  const uploadCurrentPoint = useMemo(
    () => findNearestPoint(uploadPoints, uploadCurrentTime),
    [uploadPoints, uploadCurrentTime],
  )
  const liveDisplayCurrent = useMemo(
    () => findNearestPoint(livePoints, liveCursorTime) ?? liveCurrent,
    [liveCurrent, liveCursorTime, livePoints],
  )

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: 'var(--bg-page)' }}
    >
      <SiteHeader width="wide" />
      <PageMain
        width="wide"
        className="max-w-full overflow-hidden pt-16 pb-28 sm:pt-20 sm:pb-24"
        innerClassName="min-w-0"
      >
        <section className="w-full min-w-0">
          <PitchPageHeader
            name={project.name}
            description="实时看见声音的音高、走向与细微偏差。"
            version={project.version}
          />
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PitchTab)}
            className="w-full min-w-0 max-w-full gap-0 overflow-hidden"
          >
            <div
              className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border shadow-[0_24px_70px_rgba(44,42,48,0.07)]"
              style={{ background: 'rgba(250,246,240,0.9)', borderColor: 'rgba(44,42,48,0.12)' }}
            >
              <div
                className="grid border-b xl:grid-cols-[17rem_minmax(0,1fr)]"
                style={{ borderColor: 'rgba(44,42,48,0.11)' }}
              >
                <div
                  className="border-b px-4 py-3 xl:border-b-0 xl:border-r"
                  style={{ borderColor: 'rgba(44,42,48,0.11)' }}
                >
                  <TabsList
                    variant="line"
                    className="grid !h-10 w-full min-w-0 grid-cols-2 rounded-none bg-transparent p-0"
                  >
                    <TabsTrigger
                      value="live"
                      className="!h-10 min-w-0 rounded-md border px-2 text-[0.78rem] text-[var(--text-secondary)] hover:bg-white/40 data-active:border-[var(--accent-amber)] data-active:bg-[var(--accent-glow)] data-active:font-semibold data-active:text-[var(--text-primary)] data-active:shadow-[inset_0_-2px_0_var(--accent-amber)] data-active:[&_svg]:text-[var(--accent-amber)] sm:px-3"
                    >
                      <Mic data-icon="inline-start" />
                      实时检测
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full bg-[var(--accent-amber)] transition-opacity ${activeTab === 'live' ? 'opacity-100' : 'opacity-0'}`}
                      />
                    </TabsTrigger>
                    <TabsTrigger
                      value="upload"
                      className="!h-10 min-w-0 rounded-md border px-2 text-[0.78rem] text-[var(--text-secondary)] hover:bg-white/40 data-active:border-[var(--accent-amber)] data-active:bg-[var(--accent-glow)] data-active:font-semibold data-active:text-[var(--text-primary)] data-active:shadow-[inset_0_-2px_0_var(--accent-amber)] data-active:[&_svg]:text-[var(--accent-amber)] sm:px-3"
                    >
                      <FileAudio data-icon="inline-start" />
                      上传分析
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full bg-[var(--accent-amber)] transition-opacity ${activeTab === 'upload' ? 'opacity-100' : 'opacity-0'}`}
                      />
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex min-h-12 items-center px-4 py-2 sm:px-6">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    音频仅在本机处理，不会上传
                  </p>
                </div>
              </div>

              <TabsContent value="live" className="w-full min-w-0 max-w-full overflow-hidden">
                <audio
                  ref={livePlaybackAudioRef}
                  src={livePlaybackUrl ?? undefined}
                  className="hidden"
                  onTimeUpdate={(event) => {
                    setLivePlaybackTime(event.currentTarget.currentTime)
                    setLiveCursorTime(event.currentTarget.currentTime)
                  }}
                  onPlay={() => setLivePlaying(true)}
                  onPause={() => setLivePlaying(false)}
                  onEnded={() => setLivePlaying(false)}
                />
                <LiveWorkbench
                  status={liveStatus}
                  source={liveSource}
                  points={livePoints}
                  current={liveDisplayCurrent}
                  cursorTime={livePlaying ? livePlaybackTime : liveCursorTime}
                  viewport={liveViewport}
                  volume={liveVolume}
                  noiseReduction={liveNoiseReduction}
                  error={liveError}
                  onViewportChange={setLiveViewport}
                  onSeek={seekLivePlayback}
                  onVolumeChange={setLiveVolume}
                  onNoiseReductionChange={setLiveNoiseReduction}
                  onStart={() => startLive(liveSource)}
                  onSelectSource={setLiveSource}
                  onTogglePlayback={toggleLivePlayback}
                  onPause={pauseLive}
                  onClear={clearLive}
                  playbackAvailable={liveRecordingAvailable || Boolean(livePlaybackUrl)}
                  playing={livePlaying}
                />
              </TabsContent>

              <TabsContent value="upload" className="w-full min-w-0 max-w-full overflow-hidden">
                {uploadAudioUrl && (
                  <audio
                    ref={uploadAudioRef}
                    src={uploadAudioUrl}
                    preload="metadata"
                    className="hidden"
                    onLoadedMetadata={(event) => {
                      setUploadDuration(event.currentTarget.duration || uploadDuration)
                      setUploadCurrentTime(
                        Math.min(uploadCurrentTime, event.currentTarget.duration || 0),
                      )
                    }}
                    onTimeUpdate={(event) => setUploadCurrentTime(event.currentTarget.currentTime)}
                    onPlay={() => setUploadPlaying(true)}
                    onPause={() => setUploadPlaying(false)}
                    onEnded={() => setUploadPlaying(false)}
                  />
                )}
                <UploadWorkbench
                  fileName={uploadFileName}
                  status={uploadStatus}
                  progress={uploadProgress}
                  logs={uploadLogs}
                  error={uploadError}
                  points={uploadPoints}
                  current={uploadCurrentPoint ?? EMPTY_DETECTION}
                  audioRef={uploadAudioRef}
                  duration={uploadDuration}
                  currentTime={uploadCurrentTime}
                  viewport={uploadViewport}
                  playing={uploadPlaying}
                  volume={uploadVolume}
                  onFile={analyzeUploadFile}
                  onSeek={seekUploadPlayback}
                  onTimeChange={setUploadCurrentTime}
                  onViewportChange={setUploadViewport}
                  onPlayingChange={setUploadPlaying}
                  onVolumeChange={setUploadVolume}
                />
              </TabsContent>
            </div>
          </Tabs>
        </section>
      </PageMain>
      <BackFooter />
    </div>
  )
}

const PitchPageHeader = ({
  name,
  description,
  version,
}: {
  name: string
  description: string
  version: string
}) => (
  <header
    className="mb-7 grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
    style={{ borderColor: 'rgba(44,42,48,0.11)' }}
  >
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Pitch Detector
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--accent-amber)' }}>
          {version}
        </span>
      </div>
      <h1
        className="font-display text-4xl font-semibold leading-none sm:text-5xl"
        style={{ color: 'var(--text-primary)' }}
      >
        {name}
      </h1>
    </div>
    <p
      className="max-w-md text-sm leading-7 lg:text-right"
      style={{ color: 'var(--text-secondary)' }}
    >
      {description}
    </p>
  </header>
)

const LiveWorkbench = ({
  status,
  source,
  points,
  current,
  cursorTime,
  viewport,
  volume,
  noiseReduction,
  error,
  onViewportChange,
  onSeek,
  onVolumeChange,
  onNoiseReductionChange,
  onStart,
  onSelectSource,
  onTogglePlayback,
  onPause,
  onClear,
  playbackAvailable,
  playing,
}: {
  status: LiveStatus
  source: PitchSource
  points: PitchTrackPoint[]
  current: PitchDetection
  cursorTime: number
  viewport: PitchViewport
  volume: number
  noiseReduction: boolean
  error: string | null
  onViewportChange: (viewport: PitchViewport) => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onNoiseReductionChange: (enabled: boolean) => void
  onStart: () => void
  onSelectSource: (source: PitchSource) => void
  onTogglePlayback: () => void
  onPause: () => void
  onClear: () => void
  playbackAvailable: boolean
  playing: boolean
}) => (
  <WorkbenchLayout
    sidebar={
      <>
        <ControlPanel title="输入来源" headerRight={<StatusPill status={status} />}>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <Button
              type="button"
              variant="outline"
              aria-pressed={source === 'microphone'}
              className={`min-w-0 shrink justify-center rounded-lg px-2 ${
                source === 'microphone'
                  ? 'border-[var(--accent-amber)] bg-[var(--accent-glow)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_rgba(196,149,106,0.12)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              onClick={() => onSelectSource('microphone')}
              disabled={status === 'running'}
            >
              <Mic data-icon="inline-start" />
              麦克风
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full bg-[var(--accent-amber)] transition-opacity ${source === 'microphone' ? 'opacity-100' : 'opacity-0'}`}
              />
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-pressed={source === 'display-audio'}
              className={`min-w-0 shrink justify-center rounded-lg px-2 ${
                source === 'display-audio'
                  ? 'border-[var(--accent-amber)] bg-[var(--accent-glow)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_rgba(196,149,106,0.12)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              onClick={() => onSelectSource('display-audio')}
              disabled={status === 'running'}
            >
              <MonitorSpeaker data-icon="inline-start" />
              电脑音频
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full bg-[var(--accent-amber)] transition-opacity ${source === 'display-audio' ? 'opacity-100' : 'opacity-0'}`}
              />
            </Button>
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
            <Button
              type="button"
              className="min-w-0 shrink justify-center rounded-lg bg-[var(--text-primary)] px-2 text-[var(--bg-page)] hover:bg-[var(--accent-amber)] hover:text-white"
              onClick={status === 'running' ? onPause : onStart}
            >
              {status === 'running' ? (
                <Pause data-icon="inline-start" />
              ) : (
                <Play data-icon="inline-start" />
              )}
              {status === 'running' ? '暂停' : status === 'paused' ? '继续' : '开始'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-w-0 shrink rounded-lg px-2 text-[var(--text-secondary)]"
              onClick={onClear}
            >
              <RotateCcw data-icon="inline-start" />
              清空
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            aria-pressed={noiseReduction}
            className={
              noiseReduction
                ? 'w-full border-[var(--accent-amber)] bg-[var(--accent-glow)] text-[var(--text-primary)]'
                : 'w-full text-[var(--text-secondary)]'
            }
            onClick={() => onNoiseReductionChange(!noiseReduction)}
            disabled={status === 'running'}
          >
            <Activity data-icon="inline-start" />
            环境降噪 {noiseReduction ? '开' : '关'}
          </Button>
          <p className="text-xs leading-[1.125rem]" style={{ color: 'var(--text-muted)' }}>
            减少风噪、低频轰鸣和持续背景声；检测很弱的乐器音时可关闭。
          </p>
        </ControlPanel>
        <ControlPanel title="回放监听" description="点击已录制曲线后播放">
          <Button
            type="button"
            variant="outline"
            className="w-full min-w-0 shrink justify-center rounded-lg text-[var(--text-primary)]"
            onClick={onTogglePlayback}
            disabled={!playbackAvailable}
          >
            {playing ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {playing ? '暂停回放' : '播放回放'}
          </Button>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            音频仅在当前浏览器会话中处理。开始检测一小段时间后，可点击曲线从对应时刻回放。
          </p>
        </ControlPanel>
        {error && <ErrorMessage message={error} />}
      </>
    }
  >
    <ResultSurface
      title="实时音高曲线"
      points={points}
      current={current}
      cursorTime={cursorTime}
      viewport={viewport}
      emptyText="开始检测后，音高曲线会显示在这里。"
      onViewportChange={onViewportChange}
      onSeek={onSeek}
    />
  </WorkbenchLayout>
)

const UploadWorkbench = ({
  fileName,
  status,
  progress,
  logs,
  error,
  points,
  current,
  audioRef,
  duration,
  currentTime,
  viewport,
  playing,
  volume,
  onFile,
  onSeek,
  onTimeChange,
  onViewportChange,
  onPlayingChange,
  onVolumeChange,
}: {
  fileName: string | null
  status: UploadStatus
  progress: number
  logs: string[]
  error: string | null
  points: PitchTrackPoint[]
  current: PitchDetection
  audioRef: RefObject<HTMLAudioElement | null>
  duration: number
  currentTime: number
  viewport: PitchViewport
  playing: boolean
  volume: number
  onFile: (file: File) => void
  onSeek: (time: number) => void
  onTimeChange: (time: number) => void
  onViewportChange: (viewport: PitchViewport) => void
  onPlayingChange: (playing: boolean) => void
  onVolumeChange: (volume: number) => void
}) => {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <WorkbenchLayout
      sidebar={
        <>
          <label
            className="m-5 flex w-auto min-w-0 max-w-full cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed p-5 text-center transition hover:bg-white/35"
            style={{ borderColor: 'rgba(44,42,48,0.18)' }}
          >
            <span
              className="flex size-11 items-center justify-center rounded-lg"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent-amber)' }}
            >
              <Upload size={26} strokeWidth={1.7} />
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {fileName ?? '选择音频文件并检测音高'}
            </span>
            <span className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              支持浏览器可解码音频，本地解码与检测。
            </span>
            <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
          </label>

          <AnalysisStatus status={status} progress={progress} logs={logs} />
          {error && <ErrorMessage message={error} />}
          {duration > 0 && (
            <AudioTransport
              audioRef={audioRef}
              duration={duration}
              currentTime={currentTime}
              playing={playing}
              volume={volume}
              onTimeChange={onTimeChange}
              onPlayingChange={onPlayingChange}
              onVolumeChange={onVolumeChange}
            />
          )}
        </>
      }
    >
      <ResultSurface
        title="上传音频音高曲线"
        points={points}
        current={current}
        cursorTime={currentTime}
        viewport={viewport}
        emptyText={
          status === 'analyzing'
            ? '正在分析音频，完成后会显示完整曲线。'
            : '上传音频后，音高曲线会显示在这里。'
        }
        onViewportChange={onViewportChange}
        onSeek={onSeek}
      />
    </WorkbenchLayout>
  )
}

const WorkbenchLayout = ({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) => (
  <div className="grid w-full min-w-0 max-w-full grid-cols-1 xl:grid-cols-[17rem_minmax(0,1fr)]">
    <aside
      className="order-1 flex min-w-0 max-w-full flex-col border-b xl:border-b-0 xl:border-r"
      style={{ borderColor: 'rgba(44,42,48,0.11)', background: 'rgba(243,237,228,0.42)' }}
    >
      {sidebar}
    </aside>
    <section className="order-2 min-w-0 max-w-full">{children}</section>
  </div>
)

const ControlPanel = ({
  title,
  description,
  headerRight,
  children,
}: {
  title: string
  description?: string
  headerRight?: ReactNode
  children: ReactNode
}) => (
  <section
    className="w-full min-w-0 max-w-full border-b px-5 py-5 last:border-b-0"
    style={{ borderColor: 'rgba(44,42,48,0.11)' }}
  >
    <div className="mb-4 flex flex-row items-start justify-between gap-3">
      <div className="min-w-0">
        <h2
          className="font-display text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[0.72rem]" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        ) : null}
      </div>
      {headerRight}
    </div>
    <div className="flex flex-col gap-3">{children}</div>
  </section>
)

const StatusPill = ({ status }: { status: LiveStatus }) => {
  const label = status === 'running' ? '检测中' : status === 'paused' ? '已暂停' : '未开始'
  return (
    <Badge
      variant="secondary"
      className="max-w-[5rem] shrink-0 gap-1.5 truncate rounded-md px-2 py-1 text-xs"
      style={{ background: 'var(--accent-glow)', color: 'var(--accent-amber)' }}
    >
      <Activity data-icon="inline-start" />
      {label}
    </Badge>
  )
}

const ResultSurface = ({
  title,
  points,
  current,
  cursorTime,
  viewport,
  emptyText,
  onViewportChange,
  onSeek,
}: {
  title: string
  points: PitchTrackPoint[]
  current: PitchDetection
  cursorTime: number
  viewport: PitchViewport
  emptyText: string
  onViewportChange: (viewport: PitchViewport) => void
  onSeek: (time: number) => void
}) => (
  <div className="w-full min-w-0 max-w-full p-3 sm:p-4 lg:p-5">
    <h2 className="sr-only">{title}</h2>
    <div className="mb-3">
      <PitchReadout current={current} />
    </div>
    <PitchChart
      points={points}
      cursorTime={cursorTime}
      viewport={viewport}
      emptyText={emptyText}
      onViewportChange={onViewportChange}
      onSeek={onSeek}
    />
  </div>
)

const PitchReadout = ({ current }: { current: PitchDetection }) => {
  const cents =
    current.isVoiced && current.cents != null ? Math.max(-50, Math.min(50, current.cents)) : null
  const markerPosition = cents == null ? 50 : cents + 50
  const noteName = current.isVoiced ? formatNoteNameForDisplay(current.noteName) : '—'

  return (
    <section
      aria-label="当前音高读数"
      className="grid overflow-hidden rounded-lg border lg:grid-cols-[minmax(12rem,0.34fr)_minmax(0,1fr)]"
      style={{ borderColor: 'rgba(44,42,48,0.11)', background: 'rgba(255,255,255,0.38)' }}
    >
      <div
        className="flex min-h-40 flex-col justify-center border-b px-5 py-5 lg:border-b-0 lg:border-r lg:px-7"
        style={{ borderColor: 'rgba(44,42,48,0.11)' }}
      >
        <p
          className="text-xs uppercase tracking-[0.16em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Current pitch
        </p>
        <div className="mt-2 flex min-w-0 items-end justify-between gap-3">
          <p
            className="min-w-0 whitespace-nowrap font-display text-5xl font-semibold leading-none tracking-[-0.06em] sm:text-6xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {noteName}
          </p>
          <div className="shrink-0 pb-1 text-right">
            <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              {current.frequencyHz ? `${current.frequencyHz.toFixed(1)} Hz` : '— Hz'}
            </p>
            <p className="mt-2 text-xs leading-[1.125rem]" style={{ color: 'var(--text-muted)' }}>
              置信度 {Math.round(current.confidence * 100)}%
            </p>
          </div>
        </div>
      </div>
      <div className="flex min-h-40 flex-col justify-center px-5 py-5 sm:px-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase tracking-[0.16em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Tuning deviation
            </p>
            <p
              className="mt-1 font-display text-3xl font-semibold leading-none"
              style={{ color: 'var(--text-primary)' }}
            >
              {current.cents != null
                ? `${current.cents > 0 ? '+' : ''}${current.cents.toFixed(0)}`
                : '—'}
              <span
                className="ml-2 font-sans text-xs font-normal tracking-normal"
                style={{ color: 'var(--text-muted)' }}
              >
                cents
              </span>
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {cents == null
              ? '等待稳定音高'
              : Math.abs(cents) <= 5
                ? '音高准确'
                : cents < 0
                  ? '音高偏低'
                  : '音高偏高'}
          </p>
        </div>
        <div className="relative h-10" aria-label="音高偏差刻度">
          <div
            className="absolute left-0 right-0 top-3 h-px"
            style={{ background: 'rgba(44,42,48,0.18)' }}
          />
          <div
            className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2"
            style={{ background: 'var(--text-primary)' }}
          />
          {[-50, -25, 0, 25, 50].map((tick) => (
            <div
              key={tick}
              className="absolute top-2 -translate-x-1/2"
              style={{ left: `${tick + 50}%` }}
            >
              <span className="block h-3 w-px" style={{ background: 'rgba(44,42,48,0.28)' }} />
              <span
                className="mt-1 block -translate-x-1/2 font-mono text-[11px] leading-4"
                style={{ color: 'var(--text-muted)' }}
              >
                {tick}
              </span>
            </div>
          ))}
          {cents != null && (
            <span
              className="absolute top-0 block h-7 w-[3px] -translate-x-1/2 rounded-sm transition-[left] duration-200"
              style={{
                left: `${markerPosition}%`,
                background: 'var(--accent-amber)',
                boxShadow: 'var(--shadow-accent-sm)',
              }}
            />
          )}
        </div>
        <div
          className="mt-1 flex justify-between text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>偏低</span>
          <span>准确</span>
          <span>偏高</span>
        </div>
      </div>
    </section>
  )
}

const PitchChart = ({
  points,
  cursorTime,
  viewport,
  emptyText,
  onViewportChange,
  onSeek,
}: {
  points: PitchTrackPoint[]
  cursorTime: number
  viewport: PitchViewport
  emptyText: string
  onViewportChange: (viewport: PitchViewport) => void
  onSeek: (time: number) => void
}) => {
  const { playNote } = usePianoAudio()
  const chartRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ x: number; viewport: PitchViewport; moved: boolean } | null>(null)
  const referenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeReferenceFrequency, setActiveReferenceFrequency] = useState<number | null>(null)
  const [hover, setHover] = useState<{
    x: number
    y: number
    time: number
    point: PitchTrackPoint | null
  } | null>(null)
  const timelineBounds = useMemo(() => {
    const lastTime = points.length > 0 ? points[points.length - 1].time : Math.max(20, cursorTime)
    return { minTime: 0, maxTime: Math.max(20, lastTime), minSpan: 1 }
  }, [cursorTime, points])
  const visibleViewport = useMemo(
    () => clampPitchView(viewport, timelineBounds),
    [timelineBounds, viewport],
  )
  const visiblePoints = useMemo(
    () =>
      points.filter(
        (point) => point.time >= visibleViewport.startTime && point.time <= visibleViewport.endTime,
      ),
    [points, visibleViewport],
  )
  const voiced = visiblePoints.filter((point) => point.isVoiced && point.frequencyHz != null)
  const minFrequency =
    voiced.length > 0
      ? Math.max(65, Math.min(...voiced.map((point) => point.frequencyHz as number)) - 40)
      : 65
  const maxFrequency =
    voiced.length > 0
      ? Math.min(1200, Math.max(...voiced.map((point) => point.frequencyHz as number)) + 40)
      : 1200
  const timeSpan = Math.max(0.1, visibleViewport.endTime - visibleViewport.startTime)
  const noteTicks = useMemo(
    () =>
      spaceFrequencyTicks(
        noteTicksForFrequencyRange(minFrequency, maxFrequency, 7),
        minFrequency,
        maxFrequency,
        CHART_HEIGHT,
        CHART_PLOT.top,
        CHART_PLOT.bottom,
      ),
    [maxFrequency, minFrequency],
  )
  const cursorX =
    CHART_PLOT.left +
    ((cursorTime - visibleViewport.startTime) / timeSpan) *
      (CHART_WIDTH - CHART_PLOT.left - CHART_PLOT.right)
  const path = buildPitchPath(
    visiblePoints,
    visibleViewport.startTime,
    timeSpan,
    minFrequency,
    maxFrequency,
  )
  const yFromFrequency = (frequencyHz: number) =>
    chartYFromFrequency(
      frequencyHz,
      minFrequency,
      maxFrequency,
      CHART_HEIGHT,
      CHART_PLOT.top,
      CHART_PLOT.bottom,
    )

  const playReferenceTone = (frequencyHz: number) => {
    playNote(frequencyHz)
    setActiveReferenceFrequency(frequencyHz)
    if (referenceTimeoutRef.current) clearTimeout(referenceTimeoutRef.current)
    referenceTimeoutRef.current = setTimeout(() => setActiveReferenceFrequency(null), 900)
  }

  useEffect(() => {
    return () => {
      if (referenceTimeoutRef.current) clearTimeout(referenceTimeoutRef.current)
    }
  }, [])

  const pointerPosition = (clientX: number) => {
    const rect = chartRef.current?.getBoundingClientRect()
    if (!rect) return { svgX: CHART_PLOT.left, time: visibleViewport.startTime }
    const svgX = svgXFromClientX(clientX, {
      rectLeft: rect.left,
      rectWidth: rect.width,
      rectHeight: rect.height,
      viewBoxWidth: CHART_WIDTH,
      viewBoxHeight: CHART_HEIGHT,
    })
    return {
      svgX,
      time: timeFromChartX(svgX, CHART_PLOT, CHART_WIDTH, visibleViewport),
    }
  }

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const { time: anchorTime } = pointerPosition(event.clientX)
    onViewportChange(
      zoomPitchView(visibleViewport, event.deltaY > 0 ? 1.18 : 0.82, anchorTime, timelineBounds),
    )
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = { x: event.clientX, viewport: visibleViewport, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    const rect = chartRef.current?.getBoundingClientRect()
    const { svgX, time } = pointerPosition(event.clientX)
    const point = findNearestPoint(visiblePoints, time)
    setHover({
      x: Math.min(CHART_WIDTH - 190, Math.max(CHART_PLOT.left + 4, svgX + 12)),
      y:
        point?.isVoiced && point.frequencyHz
          ? Math.max(CHART_PLOT.top + 8, yFromFrequency(point.frequencyHz) - 36)
          : CHART_PLOT.top + 16,
      time,
      point,
    })
    if (!drag || !rect) return
    const deltaX = event.clientX - drag.x
    if (Math.abs(deltaX) > 3) drag.moved = true
    const renderedPlotStart = (CHART_PLOT.left / CHART_WIDTH) * rect.width
    const renderedPlotEnd = ((CHART_WIDTH - CHART_PLOT.right) / CHART_WIDTH) * rect.width
    const drawableWidth = Math.max(1, renderedPlotEnd - renderedPlotStart)
    const deltaTime = -(deltaX / drawableWidth) * (drag.viewport.endTime - drag.viewport.startTime)
    onViewportChange(panPitchView(drag.viewport, deltaTime, timelineBounds))
  }

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag?.moved) onSeek(pointerPosition(event.clientX).time)
  }

  const resetView = () => {
    onViewportChange({ startTime: timelineBounds.minTime, endTime: timelineBounds.maxTime })
  }

  const zoomByButton = (scale: number) => {
    const anchor = (visibleViewport.startTime + visibleViewport.endTime) / 2
    onViewportChange(zoomPitchView(visibleViewport, scale, anchor, timelineBounds))
  }

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: 'rgba(44,42,48,0.11)', background: 'rgba(255,255,255,0.3)' }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4"
        style={{ borderColor: 'rgba(44,42,48,0.11)' }}
      >
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="flex items-center gap-2 font-mono">
            <MoveHorizontal size={14} />
            {formatTime(visibleViewport.startTime)} — {formatTime(visibleViewport.endTime)}
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <MousePointer2 size={13} />
            点击定位 · 滚轮缩放 · 拖拽时间轴
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            <Volume2 size={13} />
            点击纵轴音名试听
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => zoomByButton(0.75)}
                  aria-label="放大时间轴"
                >
                  <ZoomIn />
                </Button>
              }
            />
            <TooltipContent>放大时间轴</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => zoomByButton(1.35)}
                  aria-label="缩小时间轴"
                >
                  <ZoomOut />
                </Button>
              }
            />
            <TooltipContent>缩小时间轴</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={resetView}
                  aria-label="显示全部曲线"
                >
                  <Maximize2 />
                </Button>
              }
            />
            <TooltipContent>显示全部曲线</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="cursor-crosshair touch-none select-none">
        <svg
          ref={chartRef}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="group"
          aria-label="交互式音高曲线"
          className="block h-auto w-full font-sans"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            dragRef.current = null
            setHover(null)
          }}
        >
          <line
            x1={CHART_PLOT.left}
            y1={CHART_HEIGHT - CHART_PLOT.bottom}
            x2={CHART_WIDTH - CHART_PLOT.right}
            y2={CHART_HEIGHT - CHART_PLOT.bottom}
            stroke="rgba(44,42,48,0.18)"
          />
          <line
            x1={CHART_PLOT.left}
            y1={CHART_PLOT.top}
            x2={CHART_PLOT.left}
            y2={CHART_HEIGHT - CHART_PLOT.bottom}
            stroke="rgba(44,42,48,0.18)"
          />
          {noteTicks.map((tick) => {
            const y = yFromFrequency(tick.frequencyHz)
            const tickIndex = noteTicks.indexOf(tick)
            const nextTick = noteTicks[tickIndex + 1]
            const nextY = nextTick ? yFromFrequency(nextTick.frequencyHz) : CHART_PLOT.top
            const bandTop = Math.min(y, nextY)
            const bandHeight = Math.max(1, Math.abs(y - nextY))
            return (
              <g key={`${tick.noteName}-${tick.frequencyHz}`}>
                {tickIndex % 2 === 0 && (
                  <rect
                    x={CHART_PLOT.left}
                    y={bandTop}
                    width={CHART_WIDTH - CHART_PLOT.left - CHART_PLOT.right}
                    height={bandHeight}
                    fill="rgba(196,149,106,0.025)"
                  />
                )}
                <line
                  x1={CHART_PLOT.left}
                  y1={y}
                  x2={CHART_WIDTH - CHART_PLOT.right}
                  y2={y}
                  stroke="rgba(44,42,48,0.07)"
                />
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`播放标准音 ${tick.noteName}`}
                  className="cursor-pointer outline-none"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    playReferenceTone(tick.frequencyHz)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      playReferenceTone(tick.frequencyHz)
                    }
                  }}
                >
                  <rect
                    x={0}
                    y={Math.max(CHART_PLOT.top, y - 15)}
                    width={CHART_PLOT.left}
                    height={30}
                    rx={5}
                    fill={
                      activeReferenceFrequency === tick.frequencyHz
                        ? 'var(--accent-glow)'
                        : 'transparent'
                    }
                    stroke={
                      activeReferenceFrequency === tick.frequencyHz
                        ? 'var(--accent-amber)'
                        : 'transparent'
                    }
                  />
                  <text
                    x={8}
                    y={y - 2}
                    className="font-mono"
                    fontSize="11"
                    fontWeight={activeReferenceFrequency === tick.frequencyHz ? 500 : 400}
                    fill={
                      activeReferenceFrequency === tick.frequencyHz
                        ? 'var(--text-primary)'
                        : 'var(--text-muted)'
                    }
                    pointerEvents="none"
                  >
                    {tick.noteName}
                  </text>
                  <text
                    x={8}
                    y={y + 11}
                    className="font-mono"
                    fontSize="11"
                    fill="var(--text-muted)"
                    opacity={0.72}
                    pointerEvents="none"
                  >
                    {Math.round(tick.frequencyHz)}Hz
                  </text>
                </g>
              </g>
            )
          })}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="var(--accent-amber)"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {cursorX >= CHART_PLOT.left && cursorX <= CHART_WIDTH - CHART_PLOT.right && (
            <line
              x1={cursorX}
              y1={CHART_PLOT.top}
              x2={cursorX}
              y2={CHART_HEIGHT - CHART_PLOT.bottom}
              stroke="rgba(12,10,18,0.42)"
              strokeDasharray="5 6"
            />
          )}
          {hover && (
            <g transform={`translate(${hover.x} ${hover.y})`} pointerEvents="none">
              <rect
                width="178"
                height="76"
                rx="12"
                fill="rgba(250,246,240,0.96)"
                stroke="rgba(44,42,48,0.12)"
              />
              <text className="font-mono" x="12" y="20" fontSize="11" fontWeight="500" fill="var(--text-primary)">
                {formatTime(hover.time)}
              </text>
              {hover.point?.isVoiced && hover.point.frequencyHz != null ? (
                <>
                  <text className="font-mono" x="12" y="42" fontSize="18" fontWeight="500" fill="var(--text-primary)">
                    {formatNoteNameForDisplay(hover.point.noteName)}
                  </text>
                  <text className="font-mono" x="12" y="61" fontSize="11" fill="var(--text-muted)">
                    {hover.point.frequencyHz.toFixed(1)}Hz ·{' '}
                    {hover.point.cents != null
                      ? `${hover.point.cents > 0 ? '+' : ''}${hover.point.cents.toFixed(0)}c`
                      : '--'}{' '}
                    · {Math.round(hover.point.confidence * 100)}%
                  </text>
                </>
              ) : (
                <text x="12" y="49" fontSize="12" fill="var(--text-muted)">
                  无有效音高
                </text>
              )}
            </g>
          )}
          <text className="font-mono" x={CHART_PLOT.left} y={CHART_HEIGHT - 11} fontSize="12" fill="var(--text-muted)">
            {formatTime(visibleViewport.startTime)}
          </text>
          <text
            className="font-mono"
            x={CHART_WIDTH - CHART_PLOT.right}
            y={CHART_HEIGHT - 11}
            textAnchor="end"
            fontSize="12"
            fill="var(--text-muted)"
          >
            {formatTime(visibleViewport.endTime)}
          </text>
        </svg>
      </div>
      {points.length === 0 && (
        <p className="px-4 pb-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          {emptyText}
        </p>
      )}
    </div>
  )
}

const AnalysisStatus = ({
  status,
  progress,
  logs,
}: {
  status: UploadStatus
  progress: number
  logs: string[]
}) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress))

  return (
    <section className="border-t px-5 py-5" style={{ borderColor: 'rgba(44,42,48,0.11)' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            分析状态
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {status === 'idle'
              ? '等待上传'
              : status === 'analyzing'
                ? '正在检测音高'
                : status === 'done'
                  ? '分析完成'
                  : '分析失败'}
          </p>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {Math.round(normalizedProgress)}%
        </span>
      </div>
      <Progress
        value={normalizedProgress}
        aria-label="音频分析进度"
        className="gap-0 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-[rgba(44,42,48,0.08)] [&_[data-slot=progress-indicator]]:bg-[var(--accent-amber)]"
      />
      <Separator className="my-3" />
      <ScrollArea className="max-h-40 pr-3">
        {logs.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            上传后会显示处理日志。
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {logs.map((log) => (
              <li
                key={log}
                className="text-xs leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {log}
              </li>
            ))}
          </ol>
        )}
      </ScrollArea>
    </section>
  )
}

const AudioTransport = ({
  audioRef,
  duration,
  currentTime,
  playing,
  volume,
  onTimeChange,
  onPlayingChange,
  onVolumeChange,
}: {
  audioRef: RefObject<HTMLAudioElement | null>
  duration: number
  currentTime: number
  playing: boolean
  volume: number
  onTimeChange: (time: number) => void
  onPlayingChange: (playing: boolean) => void
  onVolumeChange: (volume: number) => void
}) => {
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      onPlayingChange(true)
    } else {
      audio.pause()
      onPlayingChange(false)
    }
  }
  const seek = (value: number | readonly number[]) => {
    const nextTime = Array.isArray(value) ? (value[0] ?? 0) : value
    const audio = audioRef.current
    if (audio) audio.currentTime = nextTime
    onTimeChange(nextTime)
  }

  return (
    <section
      className="flex flex-col gap-4 border-t px-5 py-5"
      style={{ borderColor: 'rgba(44,42,48,0.11)' }}
    >
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-full bg-[var(--accent-glow)] text-[var(--accent-amber)]"
                onClick={togglePlay}
                aria-label={playing ? '暂停播放' : '播放音频'}
              >
                {playing ? <Pause /> : <Play />}
              </Button>
            }
          />
          <TooltipContent>{playing ? '暂停播放' : '播放音频'}</TooltipContent>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            播放器
          </p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </div>
      </div>
      <div className="rounded-lg px-3 py-4" style={PANEL_INSET_STYLE}>
        <Slider
          min={0}
          max={Math.max(0, duration)}
          step={0.01}
          value={[Math.min(currentTime, duration || 0)]}
          onValueChange={seek}
          aria-label="播放进度"
        />
      </div>
      <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
    </section>
  )
}

const VolumeControl = ({
  volume,
  onVolumeChange,
}: {
  volume: number
  onVolumeChange: (volume: number) => void
}) => (
  <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={PANEL_INSET_STYLE}>
    <Volume2 size={16} style={{ color: 'var(--text-muted)' }} />
    <Slider
      min={0}
      max={1}
      step={0.01}
      value={[volume]}
      onValueChange={(value) => onVolumeChange(Array.isArray(value) ? (value[0] ?? 0) : value)}
      aria-label="音量"
      className="flex-1"
    />
    <span className="w-10 text-right text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
      {Math.round(volume * 100)}
    </span>
  </div>
)

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="w-full min-w-0 px-5 py-5">
    <Alert
      variant="destructive"
      className="min-w-0 rounded-lg p-4 text-xs leading-relaxed [overflow-wrap:anywhere]"
      style={{
        background: 'var(--danger-bg)',
        border: '0.5px solid var(--danger-red)',
        color: 'var(--danger-red)',
      }}
    >
      <AlertCircle />
      <AlertDescription
        className="min-w-0 text-xs leading-relaxed"
        style={{ color: 'var(--danger-red)' }}
      >
        {message}
      </AlertDescription>
    </Alert>
  </div>
)

function findNearestPoint(points: PitchTrackPoint[], time: number): PitchTrackPoint | null {
  if (points.length === 0) return null
  let nearest = points[0]
  let nearestDistance = Math.abs(points[0].time - time)
  for (let i = 1; i < points.length; i++) {
    const distance = Math.abs(points[i].time - time)
    if (distance < nearestDistance) {
      nearest = points[i]
      nearestDistance = distance
    }
  }
  return nearest
}

function buildPitchPath(
  points: PitchTrackPoint[],
  minTime: number,
  timeSpan: number,
  minFrequency: number,
  maxFrequency: number,
): string {
  let path = ''
  let drawing = false
  for (const point of points) {
    if (!point.isVoiced || point.frequencyHz == null) {
      drawing = false
      continue
    }
    const x =
      CHART_PLOT.left +
      ((point.time - minTime) / timeSpan) * (CHART_WIDTH - CHART_PLOT.left - CHART_PLOT.right)
    const y = chartYFromFrequency(
      point.frequencyHz,
      minFrequency,
      maxFrequency,
      CHART_HEIGHT,
      CHART_PLOT.top,
      CHART_PLOT.bottom,
    )
    path += drawing ? ` L ${x.toFixed(1)} ${y.toFixed(1)}` : ` M ${x.toFixed(1)} ${y.toFixed(1)}`
    drawing = true
  }
  return path.trim()
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

function formatClockTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export default PitchDetectorPage
