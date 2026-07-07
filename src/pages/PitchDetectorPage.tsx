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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import SiteHeader from '@/components/SiteHeader'
import BackFooter from '@/components/BackFooter'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { decodeAudioFile, toMono, validateDuration, validateFileSize } from '@/lib/audio/decode'
import { analyzePitchTrack, detectPitch, type PitchDetection, type PitchTrackPoint } from '@/lib/audio/pitch'
import {
  clampPitchView,
  noteTicksForFrequencyRange,
  panPitchView,
  svgXFromClientX,
  timeFromChartX,
  zoomPitchView,
  type PitchViewport,
} from '@/lib/audio/pitchView'
import { consumePitchTransfer, type PitchSource } from '@/lib/audio/pitchTransfer'
import { formatNoteNameForDisplay } from '@/utils/music'

type PitchTab = 'live' | 'upload'
type LiveStatus = 'idle' | 'running' | 'paused'
type UploadStatus = 'idle' | 'analyzing' | 'done' | 'error'

const LIVE_FRAME_SIZE = 4096
const LIVE_HOP_SECONDS = 0.08
const LIVE_HISTORY_SECONDS = 180
const DEFAULT_VIEWPORT: PitchViewport = { startTime: 0, endTime: 20 }
const CHART_WIDTH = 960
const CHART_HEIGHT = 420
const CHART_PLOT = { left: 48, right: 10, top: 20, bottom: 34 }
const PANEL_STYLE = { background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }
const PANEL_INSET_STYLE = { background: 'rgba(255,255,255,0.46)', border: '0.5px solid var(--border-line)' }

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
  const liveAudioContextRef = useRef<AudioContext | null>(null)
  const liveStreamRef = useRef<MediaStream | null>(null)
  const liveSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const liveRecorderRef = useRef<MediaRecorder | null>(null)
  const liveRecordingChunksRef = useRef<Blob[]>([])
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
      return url
    })
  }, [])

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
        const detection = detectPitch(frame, audioContext.sampleRate)
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
  }, [])

  const startLiveRecorder = useCallback(
    (stream: MediaStream) => {
      if (typeof MediaRecorder === 'undefined') {
        setLiveError('当前浏览器不支持录制实时输入，因此曲线点击回放不可用。音高检测仍可继续。')
        return
      }
      try {
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) liveRecordingChunksRef.current.push(event.data)
        }
        recorder.start(1000)
        liveRecorderRef.current = recorder
      } catch {
        setLiveError('实时输入已开始，但浏览器无法录制该音频流，曲线点击回放不可用。')
      }
    },
    [],
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
            : await navigator.mediaDevices.getUserMedia({ audio: true })

        if (stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach((track) => track.stop())
          throw new Error('没有捕获到音频轨道。分享屏幕或标签页时，请在浏览器弹窗中勾选音频。')
        }

        const AudioContextCtor =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const audioContext = liveAudioContextRef.current ?? new AudioContextCtor()
        await audioContext.resume()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = LIVE_FRAME_SIZE
        analyser.smoothingTimeConstant = 0
        const sourceNode = audioContext.createMediaStreamSource(stream)
        sourceNode.connect(analyser)

        liveStreamRef.current = stream
        liveSourceNodeRef.current = sourceNode
        liveAudioContextRef.current = audioContext
        analyserRef.current = analyser
        liveStartMsRef.current = performance.now()
        liveBaseSecondsRef.current = livePoints.length > 0 ? livePoints[livePoints.length - 1].time : 0
        lastLiveSampleMsRef.current = 0
        setLiveStatus('running')
        startLiveRecorder(stream)
        runLiveLoop()
      } catch (error) {
        stopLiveInput()
        setLiveStatus(livePoints.length > 0 ? 'paused' : 'idle')
        setLiveError(error instanceof Error ? error.message : String(error))
      }
    },
    [livePoints, runLiveLoop, startLiveRecorder, stopLiveInput],
  )

  const pauseLive = useCallback(() => {
    stopLiveInput()
    setLiveStatus(livePoints.length > 0 ? 'paused' : 'idle')
  }, [livePoints.length, stopLiveInput])

  const clearLive = useCallback(() => {
    stopLiveInput()
    setLiveStatus('idle')
    setLivePoints([])
    setLiveCursorTime(0)
    setLivePlaybackTime(0)
    setLiveCurrent(EMPTY_DETECTION)
    setLiveError(null)
    setLiveViewport(DEFAULT_VIEWPORT)
    liveRecordingChunksRef.current = []
    setLivePlaybackObjectUrl(null)
  }, [setLivePlaybackObjectUrl, stopLiveInput])

  const seekLivePlayback = useCallback(
    (time: number) => {
      setLiveCursorTime(time)
      setLivePlaybackTime(time)
      if (liveRecordingChunksRef.current.length === 0) {
        setLiveError('还没有可回放的实时录音片段。开始检测一小段时间后，再点击曲线定位播放。')
        return
      }
      const blob = new Blob(liveRecordingChunksRef.current, {
        type: liveRecordingChunksRef.current[0]?.type || 'audio/webm',
      })
      const url = URL.createObjectURL(blob)
      setLivePlaybackObjectUrl(url)
      const audio = livePlaybackAudioRef.current
      if (!audio) return
      audio.src = url
      audio.volume = liveVolume
      audio.currentTime = Math.max(0, time)
      void audio.play()
      setLivePlaying(true)
    },
    [liveVolume, setLivePlaybackObjectUrl],
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
      setUploadPlaying(false)
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
            return url
          })
          setUploadDuration(audioBuffer.duration)
          setUploadViewport({ startTime: 0, endTime: Math.max(1, audioBuffer.duration) })
          setUploadPoints(track)
          setUploadProgress(100)
          setUploadStatus('done')
          appendUploadLog(source === 'separator-result' ? '已载入音轨分离结果' : '分析完成，可以播放和定位曲线')
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

  const seekUploadPlayback = useCallback((time: number) => {
    const audio = uploadAudioRef.current
    const nextTime = Math.max(0, Math.min(time, audio?.duration || time))
    if (audio) {
      audio.currentTime = nextTime
      audio.volume = uploadVolume
      void audio.play()
      setUploadPlaying(true)
    }
    setUploadCurrentTime(nextTime)
  }, [uploadVolume])

  const toggleLivePlayback = useCallback(() => {
    const audio = livePlaybackAudioRef.current
    if (!audio || !livePlaybackUrl) {
      setLiveError('请先点击已录制的音高曲线，再使用回放监听。')
      return
    }
    audio.volume = liveVolume
    if (audio.paused) {
      void audio.play()
      setLivePlaying(true)
    } else {
      audio.pause()
      setLivePlaying(false)
    }
  }, [livePlaybackUrl, liveVolume])

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
      stopLiveInput()
      if (uploadAudioUrl) URL.revokeObjectURL(uploadAudioUrl)
      if (livePlaybackUrl) URL.revokeObjectURL(livePlaybackUrl)
    }
  }, [livePlaybackUrl, stopLiveInput, uploadAudioUrl])

  const uploadCurrentPoint = useMemo(
    () => findNearestPoint(uploadPoints, uploadCurrentTime),
    [uploadPoints, uploadCurrentTime],
  )
  const liveDisplayCurrent = useMemo(
    () => findNearestPoint(livePoints, liveCursorTime) ?? liveCurrent,
    [liveCurrent, liveCursorTime, livePoints],
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />
      <main className="w-full max-w-full overflow-hidden px-4 sm:px-[15%] pt-16 sm:pt-20 pb-28 sm:pb-20">
        <section className="mx-auto w-full min-w-0 max-w-[20rem] sm:max-w-none">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PitchTab)} className="gap-5">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="font-display text-4xl sm:text-5xl leading-tight" style={{ color: 'var(--text-primary)' }}>
                  音高检测
                </h1>
                <p className="mt-2 w-full max-w-[min(42rem,100%)] text-sm leading-relaxed break-all [overflow-wrap:anywhere]" style={{ color: 'var(--text-secondary)' }}>
                  检测实时输入或上传音频的音高走势。曲线可缩放、拖动和点击定位，音频只在浏览器本地处理。
                </p>
              </div>
              <TabsList
                className="grid !h-auto w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-full p-1 shadow-[inset_0_0_0_0.5px_rgba(44,42,48,0.08)] lg:w-[21rem]"
                style={{ background: 'rgba(255,255,255,0.58)', border: '0.5px solid rgba(44,42,48,0.08)', backdropFilter: 'blur(18px)' }}
              >
                <TabsTrigger
                  value="live"
                  className="!h-10 min-w-0 rounded-full px-2 py-2.5 text-[0.82rem] data-active:bg-[rgba(255,255,255,0.92)] data-active:text-[var(--text-primary)] data-active:shadow-[0_6px_18px_rgba(44,42,48,0.08)] sm:px-4"
                >
                  <Mic data-icon="inline-start" />
                  实时检测
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  className="!h-10 min-w-0 rounded-full px-2 py-2.5 text-[0.82rem] data-active:bg-[rgba(255,255,255,0.92)] data-active:text-[var(--text-primary)] data-active:shadow-[0_6px_18px_rgba(44,42,48,0.08)] sm:px-4"
                >
                  <FileAudio data-icon="inline-start" />
                  上传分析
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="live">
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
                error={liveError}
                onViewportChange={setLiveViewport}
                onSeek={seekLivePlayback}
                onVolumeChange={setLiveVolume}
                onStart={() => startLive(liveSource)}
                onSelectSource={setLiveSource}
                onTogglePlayback={toggleLivePlayback}
                onPause={pauseLive}
                onClear={clearLive}
                playbackAvailable={Boolean(livePlaybackUrl)}
                playing={livePlaying}
              />
            </TabsContent>

            <TabsContent value="upload">
              {uploadAudioUrl && (
                <audio
                  ref={uploadAudioRef}
                  src={uploadAudioUrl}
                  preload="metadata"
                  className="hidden"
                  onLoadedMetadata={(event) => {
                    setUploadDuration(event.currentTarget.duration || uploadDuration)
                    setUploadCurrentTime(Math.min(uploadCurrentTime, event.currentTarget.duration || 0))
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
          </Tabs>
        </section>
      </main>
      <BackFooter />
    </div>
  )
}

const LiveWorkbench = ({
  status,
  source,
  points,
  current,
  cursorTime,
  viewport,
  volume,
  error,
  onViewportChange,
  onSeek,
  onVolumeChange,
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
  error: string | null
  onViewportChange: (viewport: PitchViewport) => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
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
        <ControlPanel
          title="输入来源"
          description={source === 'display-audio' ? '屏幕或标签页音频' : '麦克风输入'}
          headerRight={<StatusPill status={status} />}
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <Button
              type="button"
              variant={source === 'microphone' ? 'secondary' : 'outline'}
              className="min-w-0 shrink justify-center rounded-xl bg-white/45 px-2"
              onClick={() => onSelectSource('microphone')}
              disabled={status === 'running'}
            >
              <Mic data-icon="inline-start" />
              麦克风
            </Button>
            <Button
              type="button"
              variant={source === 'display-audio' ? 'secondary' : 'outline'}
              className="min-w-0 shrink justify-center rounded-xl bg-white/45 px-2"
              onClick={() => onSelectSource('display-audio')}
              disabled={status === 'running'}
            >
              <MonitorSpeaker data-icon="inline-start" />
              电脑音频
            </Button>
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
            <Button
              type="button"
              className="min-w-0 shrink justify-center rounded-xl border-[rgba(var(--accent-amber-rgb),0.42)] bg-[var(--accent-glow)] px-2 text-[var(--accent-amber)] hover:opacity-85"
              variant="outline"
              onClick={status === 'running' ? onPause : onStart}
            >
              {status === 'running' ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
              {status === 'running' ? '暂停' : status === 'paused' ? '继续' : '开始'}
            </Button>
            <Button type="button" variant="outline" className="min-w-0 shrink bg-white/45 px-2 text-[var(--text-secondary)]" onClick={onClear}>
              <RotateCcw data-icon="inline-start" />
              清空
            </Button>
          </div>
        </ControlPanel>
        <ControlPanel title="回放监听" description="点击已录制曲线后播放">
          <Button
            type="button"
            variant="outline"
            className="w-full min-w-0 shrink justify-center rounded-xl bg-white/45 text-[var(--text-primary)]"
            onClick={onTogglePlayback}
            disabled={!playbackAvailable}
          >
            {playing ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {playing ? '暂停回放' : '播放回放'}
          </Button>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            实时录音片段仅保存在当前浏览器会话中。开始检测一小段时间后，可点击曲线从对应时刻回放。
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
            className="flex w-full min-w-0 max-w-full cursor-pointer flex-col items-center gap-3 rounded-2xl p-6 text-center transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(44,42,48,0.08)]"
            style={PANEL_STYLE}
          >
            <span
              className="flex size-12 items-center justify-center rounded-2xl"
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
        emptyText={status === 'analyzing' ? '正在分析音频，完成后会显示完整曲线。' : '上传音频后，音高曲线会显示在这里。'}
        onViewportChange={onViewportChange}
        onSeek={onSeek}
      />
    </WorkbenchLayout>
  )
}

const WorkbenchLayout = ({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) => (
  <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
    <aside className="order-1 flex min-w-0 max-w-full flex-col gap-4 xl:sticky xl:top-20 xl:self-start">{sidebar}</aside>
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
  description: string
  headerRight?: ReactNode
  children: ReactNode
}) => (
  <Card
    className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl p-0"
    style={PANEL_STYLE}
  >
    <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pb-0 pt-4">
      <div className="min-w-0">
        <CardTitle className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </CardTitle>
        <CardDescription className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {description}
        </CardDescription>
      </div>
      {headerRight}
    </CardHeader>
    <CardContent className="flex flex-col gap-3 px-4 pb-4 pt-3">{children}</CardContent>
  </Card>
)

const StatusPill = ({ status }: { status: LiveStatus }) => {
  const label = status === 'running' ? '检测中' : status === 'paused' ? '已暂停' : '未开始'
  return (
    <Badge
      variant="secondary"
      className="max-w-[5rem] shrink-0 gap-1.5 truncate rounded-full px-2.5 py-1 text-[0.68rem]"
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
  <div
    className="w-full min-w-0 max-w-full rounded-2xl p-4 sm:p-5"
    style={PANEL_STYLE}
  >
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <MousePointer2 size={13} />
            点击定位播放，滚轮缩放，拖拽移动时间轴
          </p>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {formatTime(cursorTime)}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="音名" value={current.isVoiced ? formatNoteNameForDisplay(current.noteName) : '--'} />
        <Metric label="频率" value={current.frequencyHz ? `${current.frequencyHz.toFixed(1)} Hz` : '--'} />
        <Metric label="偏差" value={current.cents != null ? `${current.cents > 0 ? '+' : ''}${current.cents.toFixed(0)} cents` : '--'} />
        <Metric label="置信度" value={`${Math.round(current.confidence * 100)}%`} />
      </div>
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

const Metric = ({ label, value }: { label: string; value: string }) => (
  <Card className="flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 py-2.5" style={PANEL_INSET_STYLE}>
    <p className="shrink-0 text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>
      {label}
    </p>
    <p className="min-w-0 truncate text-right text-lg font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
      {value}
    </p>
  </Card>
)

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
  const chartRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ x: number; viewport: PitchViewport; moved: boolean } | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; time: number; point: PitchTrackPoint | null } | null>(null)
  const timelineBounds = useMemo(() => {
    const lastTime = points.length > 0 ? points[points.length - 1].time : Math.max(20, cursorTime)
    return { minTime: 0, maxTime: Math.max(20, lastTime), minSpan: 1 }
  }, [cursorTime, points])
  const visibleViewport = useMemo(
    () => clampPitchView(viewport, timelineBounds),
    [timelineBounds, viewport],
  )
  const visiblePoints = useMemo(
    () => points.filter((point) => point.time >= visibleViewport.startTime && point.time <= visibleViewport.endTime),
    [points, visibleViewport],
  )
  const voiced = visiblePoints.filter((point) => point.isVoiced && point.frequencyHz != null)
  const minFrequency = voiced.length > 0 ? Math.max(65, Math.min(...voiced.map((point) => point.frequencyHz as number)) - 40) : 65
  const maxFrequency = voiced.length > 0 ? Math.min(1200, Math.max(...voiced.map((point) => point.frequencyHz as number)) + 40) : 1200
  const timeSpan = Math.max(0.1, visibleViewport.endTime - visibleViewport.startTime)
  const frequencySpan = Math.max(1, maxFrequency - minFrequency)
  const noteTicks = useMemo(
    () => noteTicksForFrequencyRange(minFrequency, maxFrequency, 7),
    [maxFrequency, minFrequency],
  )
  const cursorX =
    CHART_PLOT.left +
    ((cursorTime - visibleViewport.startTime) / timeSpan) * (CHART_WIDTH - CHART_PLOT.left - CHART_PLOT.right)
  const path = buildPitchPath(visiblePoints, visibleViewport.startTime, timeSpan, minFrequency, frequencySpan)
  const yFromFrequency = (frequencyHz: number) =>
    CHART_HEIGHT -
    CHART_PLOT.bottom -
    ((frequencyHz - minFrequency) / frequencySpan) * (CHART_HEIGHT - CHART_PLOT.top - CHART_PLOT.bottom)

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
    onViewportChange(zoomPitchView(visibleViewport, event.deltaY > 0 ? 1.18 : 0.82, anchorTime, timelineBounds))
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
      y: point?.isVoiced && point.frequencyHz ? Math.max(CHART_PLOT.top + 8, yFromFrequency(point.frequencyHz) - 36) : CHART_PLOT.top + 16,
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
    <div className="overflow-hidden rounded-2xl" style={PANEL_INSET_STYLE}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--border-line)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <MoveHorizontal size={14} />
          <span>{formatTime(visibleViewport.startTime)} - {formatTime(visibleViewport.endTime)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="outline" size="icon-sm" onClick={() => zoomByButton(0.75)} aria-label="放大时间轴"><ZoomIn /></Button>} />
            <TooltipContent>放大时间轴</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="outline" size="icon-sm" onClick={() => zoomByButton(1.35)} aria-label="缩小时间轴"><ZoomOut /></Button>} />
            <TooltipContent>缩小时间轴</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="outline" size="icon-sm" onClick={resetView} aria-label="显示全部曲线"><Maximize2 /></Button>} />
            <TooltipContent>显示全部曲线</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="cursor-crosshair touch-none select-none">
        <svg
          ref={chartRef}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="音高曲线"
          className="block h-[24rem] w-full sm:h-[34rem]"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            dragRef.current = null
            setHover(null)
          }}
        >
          <line x1={CHART_PLOT.left} y1={CHART_HEIGHT - CHART_PLOT.bottom} x2={CHART_WIDTH - CHART_PLOT.right} y2={CHART_HEIGHT - CHART_PLOT.bottom} stroke="rgba(44,42,48,0.18)" />
          <line x1={CHART_PLOT.left} y1={CHART_PLOT.top} x2={CHART_PLOT.left} y2={CHART_HEIGHT - CHART_PLOT.bottom} stroke="rgba(44,42,48,0.18)" />
          {noteTicks.map((tick) => {
            const y = yFromFrequency(tick.frequencyHz)
            return (
              <g key={`${tick.noteName}-${tick.frequencyHz}`}>
                <line x1={CHART_PLOT.left} y1={y} x2={CHART_WIDTH - CHART_PLOT.right} y2={y} stroke="rgba(44,42,48,0.07)" />
                <text x={8} y={y - 2} fontSize="10" fill="var(--text-muted)">
                  {tick.noteName}
                </text>
                <text x={8} y={y + 11} fontSize="9" fill="var(--text-muted)" opacity={0.72}>
                  {Math.round(tick.frequencyHz)}Hz
                </text>
              </g>
            )
          })}
          {path && <path d={path} fill="none" stroke="var(--accent-amber)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />}
          {visiblePoints
            .filter((point) => point.isVoiced && point.frequencyHz != null)
            .map((point) => {
              const x = CHART_PLOT.left + ((point.time - visibleViewport.startTime) / timeSpan) * (CHART_WIDTH - CHART_PLOT.left - CHART_PLOT.right)
              const y = yFromFrequency(point.frequencyHz as number)
              return <circle key={`${point.time}-${point.frequencyHz}`} cx={x} cy={y} r={2.4} fill="var(--accent-amber)" opacity={0.7} />
            })}
          {cursorX >= CHART_PLOT.left && cursorX <= CHART_WIDTH - CHART_PLOT.right && (
            <line x1={cursorX} y1={CHART_PLOT.top} x2={cursorX} y2={CHART_HEIGHT - CHART_PLOT.bottom} stroke="rgba(12,10,18,0.42)" strokeDasharray="5 6" />
          )}
          {hover && (
            <g transform={`translate(${hover.x} ${hover.y})`} pointerEvents="none">
              <rect width="178" height="76" rx="12" fill="rgba(250,246,240,0.96)" stroke="rgba(44,42,48,0.12)" />
              <text x="12" y="20" fontSize="11" fontWeight="600" fill="var(--text-primary)">
                {formatTime(hover.time)}
              </text>
              {hover.point?.isVoiced && hover.point.frequencyHz != null ? (
                <>
                  <text x="12" y="42" fontSize="18" fontWeight="700" fill="var(--text-primary)">
                    {formatNoteNameForDisplay(hover.point.noteName)}
                  </text>
                  <text x="12" y="61" fontSize="11" fill="var(--text-muted)">
                    {hover.point.frequencyHz.toFixed(1)}Hz · {hover.point.cents != null ? `${hover.point.cents > 0 ? '+' : ''}${hover.point.cents.toFixed(0)}c` : '--'} · {Math.round(hover.point.confidence * 100)}%
                  </text>
                </>
              ) : (
                <text x="12" y="49" fontSize="12" fill="var(--text-muted)">
                  无有效音高
                </text>
              )}
            </g>
          )}
          <text x={CHART_PLOT.left} y={CHART_HEIGHT - 11} fontSize="12" fill="var(--text-muted)">
            {formatTime(visibleViewport.startTime)}
          </text>
          <text x={CHART_WIDTH - CHART_PLOT.right} y={CHART_HEIGHT - 11} textAnchor="end" fontSize="12" fill="var(--text-muted)">
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

const AnalysisStatus = ({ status, progress, logs }: { status: UploadStatus; progress: number; logs: string[] }) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress))

  return (
    <Card className="rounded-2xl p-4" style={PANEL_STYLE}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            分析状态
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {status === 'idle' ? '等待上传' : status === 'analyzing' ? '正在检测音高' : status === 'done' ? '分析完成' : '分析失败'}
          </p>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {Math.round(normalizedProgress)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(44,42,48,0.08)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${normalizedProgress}%`, background: 'var(--accent-amber)' }}
        />
      </div>
      <Separator className="my-3" />
      <ScrollArea className="max-h-40 pr-3">
        {logs.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>上传后会显示处理日志。</p>
        ) : (
          <ol className="space-y-1">
            {logs.map((log) => (
              <li key={log} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {log}
              </li>
            ))}
          </ol>
        )}
      </ScrollArea>
    </Card>
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
    const nextTime = Array.isArray(value) ? value[0] ?? 0 : value
    const audio = audioRef.current
    if (audio) audio.currentTime = nextTime
    onTimeChange(nextTime)
  }

  return (
    <Card
      className="flex flex-col gap-4 rounded-2xl p-4"
      style={PANEL_STYLE}
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
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>播放器</p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{formatTime(currentTime)} / {formatTime(duration)}</p>
        </div>
      </div>
      <div className="rounded-xl px-3 py-4" style={PANEL_INSET_STYLE}>
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
    </Card>
  )
}

const VolumeControl = ({ volume, onVolumeChange }: { volume: number; onVolumeChange: (volume: number) => void }) => (
  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={PANEL_INSET_STYLE}>
    <Volume2 size={16} style={{ color: 'var(--text-muted)' }} />
    <Slider
      min={0}
      max={1}
      step={0.01}
      value={[volume]}
      onValueChange={(value) => onVolumeChange(Array.isArray(value) ? value[0] ?? 0 : value)}
      aria-label="音量"
      className="flex-1"
    />
    <span className="w-10 text-right text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
      {Math.round(volume * 100)}
    </span>
  </div>
)

const ErrorMessage = ({ message }: { message: string }) => (
  <Alert
    variant="destructive"
    className="rounded-2xl p-4 text-xs leading-relaxed"
    style={{ background: 'var(--danger-bg)', border: '0.5px solid var(--danger-red)', color: 'var(--danger-red)' }}
  >
    <AlertCircle />
    <AlertDescription className="text-xs leading-relaxed" style={{ color: 'var(--danger-red)' }}>
      {message}
    </AlertDescription>
  </Alert>
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
  frequencySpan: number,
): string {
  let path = ''
  let drawing = false
  for (const point of points) {
    if (!point.isVoiced || point.frequencyHz == null) {
      drawing = false
      continue
    }
    const x = CHART_PLOT.left + ((point.time - minTime) / timeSpan) * (CHART_WIDTH - CHART_PLOT.left - CHART_PLOT.right)
    const y =
      CHART_HEIGHT -
      CHART_PLOT.bottom -
      ((point.frequencyHz - minFrequency) / frequencySpan) * (CHART_HEIGHT - CHART_PLOT.top - CHART_PLOT.bottom)
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
