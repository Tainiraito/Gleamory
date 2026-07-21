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
  LocateFixed,
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
  buildPitchPath,
  chartYFromFrequency,
  clampPitchView,
  followPitchViewport,
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
type MicrophoneOption = Pick<MediaDeviceInfo, 'deviceId' | 'label'>
type LiveRecordingSegment = {
  url: string
  startTime: number
  endTime: number
}

const LIVE_FRAME_SIZE = 4096
const LIVE_HOP_SECONDS = 0.04
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
  const [liveFollowingPlayback, setLiveFollowingPlayback] = useState(false)
  const [microphones, setMicrophones] = useState<MicrophoneOption[]>([])
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('')

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
  const [uploadFollowingPlayback, setUploadFollowingPlayback] = useState(false)

  const uploadAudioRef = useRef<HTMLAudioElement | null>(null)
  const livePlaybackAudioRef = useRef<HTMLAudioElement | null>(null)
  const uploadAudioUrlRef = useRef<string | null>(null)
  const liveAudioContextRef = useRef<AudioContext | null>(null)
  const liveStreamRef = useRef<MediaStream | null>(null)
  const liveSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const liveFilterNodesRef = useRef<AudioNode[]>([])
  const liveRecorderRef = useRef<MediaRecorder | null>(null)
  const liveRecordingSegmentsRef = useRef<LiveRecordingSegment[]>([])
  const activeLiveRecordingSegmentRef = useRef<LiveRecordingSegment | null>(null)
  const discardedLiveRecordersRef = useRef(new WeakSet<MediaRecorder>())
  const pendingLiveSeekRef = useRef<number | null>(null)
  const livePitchStabilizerRef = useRef(createLivePitchStabilizerState())
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const livePlaybackFrameRef = useRef<number | null>(null)
  const uploadPlaybackFrameRef = useRef<number | null>(null)
  const liveStartMsRef = useRef(0)
  const liveBaseSecondsRef = useRef(0)
  const lastLiveSampleMsRef = useRef(0)
  const liveStartPendingRef = useRef(false)
  const pointerFocusedButtonRef = useRef<HTMLButtonElement | null>(null)

  const appendUploadLog = useCallback((message: string) => {
    setUploadLogs((prev) => [...prev.slice(-7), `${formatClockTime(new Date())} ${message}`])
  }, [])

  const refreshMicrophones = useCallback(async () => {
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices || typeof mediaDevices.enumerateDevices !== 'function') return
    try {
      const devices = await mediaDevices.enumerateDevices()
      const audioInputs = devices
        .filter(
          (device): device is MediaDeviceInfo =>
            device.kind === 'audioinput' &&
            Boolean(device.deviceId) &&
            device.deviceId !== 'default',
        )
        .map(({ deviceId, label }) => ({ deviceId, label }))
      setMicrophones(audioInputs)
      setSelectedMicrophoneId((current) =>
        current && audioInputs.some((device) => device.deviceId === current) ? current : '',
      )
    } catch {
      // Device enumeration can be blocked before permission; the system-default option remains usable.
    }
  }, [])

  const playLiveAudioAt = useCallback(
    (audio: HTMLAudioElement, segment: LiveRecordingSegment, time: number) => {
      const startPlayback = () => {
        try {
          const duration = Number.isFinite(audio.duration)
            ? audio.duration
            : segment.endTime - segment.startTime
          const localTime = Math.max(0, Math.min(time - segment.startTime, duration))
          audio.currentTime = localTime
          void audio.play().catch(() => {
            setLivePlaying(false)
            setLiveError('浏览器没有成功开始回放，请再次点击“播放回放”。')
          })
        } catch {
          setLivePlaying(false)
          setLiveError('录音仍在生成索引，请稍等片刻后再次点击曲线。')
        }
      }

      activeLiveRecordingSegmentRef.current = segment
      setLivePlaybackUrl(segment.url)
      setLivePlaybackTime(time)
      setLiveCursorTime(time)
      audio.src = segment.url
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
      const segments = liveRecordingSegmentsRef.current
      if (segments.length === 0) {
        setLiveRecordingAvailable(false)
        setLiveError('还没有可回放的录音片段，请先检测至少一秒。')
        return
      }
      const segment =
        time == null ? segments[segments.length - 1] : findRecordingSegment(segments, time)
      if (!segment) {
        setLiveError('该时间点没有对应的录音片段，请点击有曲线的区域重试。')
        return
      }
      activeLiveRecordingSegmentRef.current = segment
      setLivePlaybackUrl(segment.url)
      setLiveRecordingAvailable(true)
      if (time == null) setLivePlaybackTime(segment.startTime)
      if (time != null && livePlaybackAudioRef.current) {
        playLiveAudioAt(livePlaybackAudioRef.current, segment, time)
      }
    },
    [playLiveAudioAt],
  )

  const stopLiveInput = useCallback((discardRecording = false) => {
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    const recorder = liveRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      if (discardRecording) discardedLiveRecordersRef.current.add(recorder)
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
      const time = liveBaseSecondsRef.current + (now - liveStartMsRef.current) / 1000
      setLiveCursorTime(time)
      setLiveViewport((prev) => preserveViewportReference(prev, followPitchViewport(prev, time)))
      if (now - lastLiveSampleMsRef.current >= LIVE_HOP_SECONDS * 1000) {
        analyser.getFloatTimeDomainData(frame)
        const rawDetection = detectPitch(
          frame,
          audioContext.sampleRate,
          liveNoiseReduction
            ? { rmsThreshold: 0.008, confidenceThreshold: 0.8 }
            : { rmsThreshold: 0.006, confidenceThreshold: 0.78 },
        )
        const detection = stabilizeLivePitch(rawDetection, livePitchStabilizerRef.current)
        setLiveCurrent(detection)
        setLivePoints((prev) => {
          const next = [...prev, { time, ...detection }]
          const minTime = Math.max(0, time - LIVE_HISTORY_SECONDS)
          return next.filter((point) => point.time >= minTime)
        })
        lastLiveSampleMsRef.current = now
      }
      animationFrameRef.current = requestAnimationFrame(tick)
    }
    animationFrameRef.current = requestAnimationFrame(tick)
  }, [liveNoiseReduction])

  const startLiveRecorder = useCallback(
    (stream: MediaStream, startTime: number) => {
      if (typeof MediaRecorder === 'undefined') {
        setLiveError('当前浏览器不支持录制实时输入，因此曲线点击回放不可用。音高检测仍可继续。')
        return
      }
      try {
        const recorder = new MediaRecorder(stream)
        const recordingChunks: Blob[] = []
        const recordingStartedAt = performance.now()
        recorder.ondataavailable = (event) => {
          if (!discardedLiveRecordersRef.current.has(recorder) && event.data.size > 0) {
            recordingChunks.push(event.data)
            setLiveRecordingAvailable(true)
          }
        }
        recorder.onstop = () => {
          if (discardedLiveRecordersRef.current.has(recorder)) return
          const pendingTime = pendingLiveSeekRef.current
          pendingLiveSeekRef.current = null
          if (recordingChunks.length === 0) {
            setLiveError('本次采集没有生成可回放音频，请重新检测一小段时间。')
            return
          }
          const blob = new Blob(recordingChunks, {
            type: recordingChunks[0]?.type || 'audio/webm',
          })
          const segment: LiveRecordingSegment = {
            url: URL.createObjectURL(blob),
            startTime,
            endTime: Math.max(
              startTime + LIVE_HOP_SECONDS,
              startTime + (performance.now() - recordingStartedAt) / 1000,
            ),
          }
          liveRecordingSegmentsRef.current.push(segment)
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
      if (liveStartPendingRef.current) return
      liveStartPendingRef.current = true
      stopLiveInput()
      if (livePlaying) livePlaybackAudioRef.current?.pause()
      setLivePlaying(false)
      setLiveFollowingPlayback(false)
      setLiveError(null)
      setLiveSource(source)
      try {
        const mediaDevices = requireMediaDevices(source)
        const stream =
          source === 'display-audio'
            ? await mediaDevices.getDisplayMedia!({ video: true, audio: true })
            : await mediaDevices.getUserMedia({
                audio: buildMicrophoneConstraints(selectedMicrophoneId),
              })

        if (stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach((track) => track.stop())
          throw new Error('没有捕获到音频轨道。分享屏幕或标签页时，请在浏览器弹窗中勾选音频。')
        }
        if (source === 'microphone') void refreshMicrophones()

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
          highPass.frequency.value = 55
          const lowPass = audioContext.createBiquadFilter()
          lowPass.type = 'lowpass'
          lowPass.frequency.value = 2000
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
        setLiveCursorTime(liveBaseSecondsRef.current)
        setLiveViewport((prev) => followPitchViewport(prev, liveBaseSecondsRef.current))
        lastLiveSampleMsRef.current = 0
        if (livePoints.length === 0) {
          livePitchStabilizerRef.current = createLivePitchStabilizerState()
        }
        setLiveStatus('running')
        startLiveRecorder(stream, liveBaseSecondsRef.current)
        runLiveLoop()
      } catch (error) {
        stopLiveInput()
        setLiveStatus(livePoints.length > 0 ? 'paused' : 'idle')
        setLiveError(error instanceof Error ? error.message : String(error))
      } finally {
        liveStartPendingRef.current = false
      }
    },
    [
      liveNoiseReduction,
      livePoints,
      livePlaying,
      refreshMicrophones,
      runLiveLoop,
      selectedMicrophoneId,
      startLiveRecorder,
      stopLiveInput,
    ],
  )

  const pauseLive = useCallback(() => {
    stopLiveInput()
    setLiveStatus(livePoints.length > 0 ? 'paused' : 'idle')
  }, [livePoints.length, stopLiveInput])

  const clearLive = useCallback(() => {
    pendingLiveSeekRef.current = null
    stopLiveInput(true)
    if (livePlaying) livePlaybackAudioRef.current?.pause()
    setLiveStatus('idle')
    setLivePoints([])
    setLiveCursorTime(0)
    setLivePlaybackTime(0)
    setLiveCurrent(EMPTY_DETECTION)
    setLiveRecordingAvailable(false)
    setLivePlaying(false)
    setLiveFollowingPlayback(false)
    setLiveError(null)
    setLiveViewport(DEFAULT_VIEWPORT)
    liveRecordingSegmentsRef.current.forEach((segment) => URL.revokeObjectURL(segment.url))
    liveRecordingSegmentsRef.current = []
    activeLiveRecordingSegmentRef.current = null
    livePitchStabilizerRef.current = createLivePitchStabilizerState()
    setLivePlaybackUrl(null)
  }, [livePlaying, stopLiveInput])

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
      if (liveRecordingSegmentsRef.current.length === 0) {
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
      setUploadFollowingPlayback(false)
      setUploadAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        uploadAudioUrlRef.current = null
        return null
      })
      appendUploadLog('已选择音频文件')

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
            rmsThreshold: 0.006,
            confidenceThreshold: 0.82,
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
        void audio.play().catch(() => {
          setUploadPlaying(false)
          setUploadError('浏览器没有成功开始播放，请再次点击播放按钮。')
        })
      }
      setUploadCurrentTime(nextTime)
    },
    [uploadVolume],
  )

  const toggleUploadPlayback = useCallback(() => {
    const audio = uploadAudioRef.current
    if (!audio || !uploadAudioUrl) return
    audio.volume = uploadVolume
    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0
      void audio.play().catch(() => {
        setUploadPlaying(false)
        setUploadError('浏览器没有成功开始播放，请再次点击播放按钮。')
      })
    } else {
      audio.pause()
    }
  }, [uploadAudioUrl, uploadVolume])

  const toggleLivePlayback = useCallback(() => {
    const audio = livePlaybackAudioRef.current
    if (liveStatus === 'running' || !livePlaybackUrl) {
      seekLivePlayback(livePlaybackTime)
      return
    }
    if (!audio) return
    audio.volume = liveVolume
    if (audio.paused) {
      const activeSegment = activeLiveRecordingSegmentRef.current
      if (audio.ended && activeSegment) {
        playLiveAudioAt(audio, activeSegment, activeSegment.startTime)
        return
      }
      void audio.play().catch(() => {
        setLivePlaying(false)
        setLiveError('浏览器没有成功开始回放，请再次点击“播放回放”。')
      })
    } else {
      audio.pause()
    }
  }, [livePlaybackTime, livePlaybackUrl, liveStatus, liveVolume, playLiveAudioAt, seekLivePlayback])

  const handleLivePlaybackEnded = useCallback(() => {
    const activeSegment = activeLiveRecordingSegmentRef.current
    const audio = livePlaybackAudioRef.current
    const segments = liveRecordingSegmentsRef.current
    const activeIndex = activeSegment ? segments.indexOf(activeSegment) : -1
    const nextSegment = activeIndex >= 0 ? segments[activeIndex + 1] : undefined
    if (audio && nextSegment) {
      playLiveAudioAt(audio, nextSegment, nextSegment.startTime)
      return
    }
    if (activeSegment) {
      setLivePlaybackTime(activeSegment.endTime)
      setLiveCursorTime(activeSegment.endTime)
    }
    setLivePlaying(false)
  }, [playLiveAudioAt])

  useEffect(() => {
    const rememberPointerFocusedButton = (event: PointerEvent) => {
      const target = event.target
      pointerFocusedButtonRef.current =
        target instanceof Element ? target.closest<HTMLButtonElement>('button') : null
    }
    const clearStalePointerFocus = (event: FocusEvent) => {
      if (event.target !== pointerFocusedButtonRef.current) {
        pointerFocusedButtonRef.current = null
      }
    }
    const handlePlaybackShortcut = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      const focusedButton = findKeyboardButton(event.target)
      const isPointerFocusedButton =
        focusedButton != null && focusedButton === pointerFocusedButtonRef.current
      if (isInteractiveKeyboardTarget(event.target) && !isPointerFocusedButton) return
      event.preventDefault()
      if (event.repeat) return
      if (activeTab === 'live') {
        if (liveStatus === 'running') pauseLive()
        else void startLive(liveSource)
        return
      }
      if (uploadStatus === 'done') toggleUploadPlayback()
    }

    window.addEventListener('pointerdown', rememberPointerFocusedButton, true)
    window.addEventListener('focusin', clearStalePointerFocus)
    window.addEventListener('keydown', handlePlaybackShortcut)
    return () => {
      window.removeEventListener('pointerdown', rememberPointerFocusedButton, true)
      window.removeEventListener('focusin', clearStalePointerFocus)
      window.removeEventListener('keydown', handlePlaybackShortcut)
    }
  }, [
    activeTab,
    liveSource,
    liveStatus,
    pauseLive,
    startLive,
    toggleUploadPlayback,
    uploadStatus,
  ])

  useEffect(() => {
    void refreshMicrophones()
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices || typeof mediaDevices.addEventListener !== 'function') return
    mediaDevices.addEventListener('devicechange', refreshMicrophones)
    return () => mediaDevices.removeEventListener('devicechange', refreshMicrophones)
  }, [refreshMicrophones])

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
    if (!livePlaying) return
    const syncPlaybackCursor = () => {
      const audio = livePlaybackAudioRef.current
      const segment = activeLiveRecordingSegmentRef.current
      if (audio && segment && !audio.paused && !audio.ended) {
        const timelineTime = Math.min(segment.endTime, segment.startTime + audio.currentTime)
        setLivePlaybackTime(timelineTime)
        setLiveCursorTime(timelineTime)
        if (liveFollowingPlayback) {
          setLiveViewport((prev) =>
            preserveViewportReference(prev, followPitchViewport(prev, timelineTime, 1)),
          )
        }
      }
      livePlaybackFrameRef.current = requestAnimationFrame(syncPlaybackCursor)
    }
    livePlaybackFrameRef.current = requestAnimationFrame(syncPlaybackCursor)
    return () => {
      if (livePlaybackFrameRef.current != null) {
        cancelAnimationFrame(livePlaybackFrameRef.current)
        livePlaybackFrameRef.current = null
      }
    }
  }, [liveFollowingPlayback, livePlaying])

  useEffect(() => {
    if (!uploadPlaying) return
    const syncPlaybackCursor = () => {
      const audio = uploadAudioRef.current
      if (audio && !audio.paused && !audio.ended) {
        const timelineTime = audio.currentTime
        setUploadCurrentTime(timelineTime)
        if (uploadFollowingPlayback) {
          setUploadViewport((prev) => {
            const nextViewport = clampPitchView(followPitchViewport(prev, timelineTime, 1), {
              minTime: 0,
              maxTime: Math.max(1, uploadDuration),
              minSpan: 1,
            })
            return preserveViewportReference(prev, nextViewport)
          })
        }
      }
      uploadPlaybackFrameRef.current = requestAnimationFrame(syncPlaybackCursor)
    }
    uploadPlaybackFrameRef.current = requestAnimationFrame(syncPlaybackCursor)
    return () => {
      if (uploadPlaybackFrameRef.current != null) {
        cancelAnimationFrame(uploadPlaybackFrameRef.current)
        uploadPlaybackFrameRef.current = null
      }
    }
  }, [uploadDuration, uploadFollowingPlayback, uploadPlaying])

  useEffect(() => {
    if (livePlaybackAudioRef.current) livePlaybackAudioRef.current.volume = liveVolume
  }, [liveVolume])

  useEffect(() => {
    return () => {
      stopLiveInput(true)
      if (uploadPlaybackFrameRef.current != null) {
        cancelAnimationFrame(uploadPlaybackFrameRef.current)
        uploadPlaybackFrameRef.current = null
      }
      if (livePlaybackFrameRef.current != null) {
        cancelAnimationFrame(livePlaybackFrameRef.current)
        livePlaybackFrameRef.current = null
      }
      if (uploadAudioUrlRef.current) URL.revokeObjectURL(uploadAudioUrlRef.current)
      liveRecordingSegmentsRef.current.forEach((segment) => URL.revokeObjectURL(segment.url))
      liveRecordingSegmentsRef.current = []
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
                className="grid border-b xl:grid-cols-[18.5rem_minmax(0,1fr)]"
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
                    if (livePlaying) return
                    const segment = activeLiveRecordingSegmentRef.current
                    const timelineTime = (segment?.startTime ?? 0) + event.currentTarget.currentTime
                    setLivePlaybackTime(timelineTime)
                    setLiveCursorTime(timelineTime)
                  }}
                  onPlay={() => setLivePlaying(true)}
                  onPause={() => setLivePlaying(false)}
                  onEnded={handleLivePlaybackEnded}
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
                  microphones={microphones}
                  selectedMicrophoneId={selectedMicrophoneId}
                  error={liveError}
                  onViewportChange={setLiveViewport}
                  onSeek={seekLivePlayback}
                  onVolumeChange={setLiveVolume}
                  onNoiseReductionChange={setLiveNoiseReduction}
                  onMicrophoneChange={setSelectedMicrophoneId}
                  onStart={() => startLive(liveSource)}
                  onSelectSource={setLiveSource}
                  onTogglePlayback={toggleLivePlayback}
                  onPause={pauseLive}
                  onClear={clearLive}
                  playbackAvailable={liveRecordingAvailable || Boolean(livePlaybackUrl)}
                  playing={livePlaying}
                  followingPlayback={liveFollowingPlayback}
                  onFollowingPlaybackChange={setLiveFollowingPlayback}
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
                    onTimeUpdate={(event) => {
                      if (!uploadPlaying) setUploadCurrentTime(event.currentTarget.currentTime)
                    }}
                    onPlay={() => setUploadPlaying(true)}
                    onPause={() => setUploadPlaying(false)}
                    onEnded={(event) => {
                      setUploadCurrentTime(event.currentTarget.duration || uploadDuration)
                      setUploadPlaying(false)
                    }}
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
                  followingPlayback={uploadFollowingPlayback}
                  onFile={analyzeUploadFile}
                  onSeek={seekUploadPlayback}
                  onTimeChange={setUploadCurrentTime}
                  onViewportChange={setUploadViewport}
                  onTogglePlayback={toggleUploadPlayback}
                  onVolumeChange={setUploadVolume}
                  onFollowingPlaybackChange={setUploadFollowingPlayback}
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
  microphones,
  selectedMicrophoneId,
  error,
  onViewportChange,
  onSeek,
  onVolumeChange,
  onNoiseReductionChange,
  onMicrophoneChange,
  onStart,
  onSelectSource,
  onTogglePlayback,
  onPause,
  onClear,
  playbackAvailable,
  playing,
  followingPlayback,
  onFollowingPlaybackChange,
}: {
  status: LiveStatus
  source: PitchSource
  points: PitchTrackPoint[]
  current: PitchDetection
  cursorTime: number
  viewport: PitchViewport
  volume: number
  noiseReduction: boolean
  microphones: MicrophoneOption[]
  selectedMicrophoneId: string
  error: string | null
  onViewportChange: (viewport: PitchViewport) => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onNoiseReductionChange: (enabled: boolean) => void
  onMicrophoneChange: (deviceId: string) => void
  onStart: () => void
  onSelectSource: (source: PitchSource) => void
  onTogglePlayback: () => void
  onPause: () => void
  onClear: () => void
  playbackAvailable: boolean
  playing: boolean
  followingPlayback: boolean
  onFollowingPlaybackChange: (following: boolean) => void
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
          {source === 'microphone' && (
            <div className="min-w-0">
              <label
                htmlFor="pitch-microphone-device"
                className="mb-1.5 block text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                输入设备
              </label>
              <select
                id="pitch-microphone-device"
                aria-label="麦克风设备"
                value={selectedMicrophoneId}
                onChange={(event) => onMicrophoneChange(event.target.value)}
                disabled={status === 'running'}
                className="h-10 w-full min-w-0 rounded-lg border bg-white/45 px-3 text-xs outline-none transition focus-visible:border-[var(--accent-amber)] focus-visible:ring-2 focus-visible:ring-[var(--accent-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: 'var(--border-line)', color: 'var(--text-primary)' }}
              >
                <option value="">系统默认麦克风</option>
                {microphones.map((microphone, index) => (
                  <option key={microphone.deviceId} value={microphone.deviceId}>
                    {microphone.label || `麦克风 ${index + 1}`}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {microphones.length > 0
                  ? '开始前可指定输入；检测中需先暂停再切换。'
                  : '首次允许麦克风权限后会显示可用设备名称。'}
              </p>
            </div>
          )}
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
            <Button
              type="button"
              aria-keyshortcuts="Space"
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
          <p className="text-xs leading-[1.125rem]" style={{ color: 'var(--text-muted)' }}>
            快捷键：空格开始或暂停录制（输入、下拉或滑块操作时除外）。
          </p>
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
            使用本地带通滤波减少风噪与高频杂声；检测很弱或范围外的乐器音时可关闭。
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
      pathMaxTimeGap={LIVE_HOP_SECONDS * 3}
      pathMaxPitchJumpSemitones={3}
      timelineMaxTime={0}
      playbackAvailable={playbackAvailable}
      followingPlayback={followingPlayback}
      onFollowingPlaybackChange={onFollowingPlaybackChange}
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
  followingPlayback,
  onFile,
  onSeek,
  onTimeChange,
  onViewportChange,
  onTogglePlayback,
  onVolumeChange,
  onFollowingPlaybackChange,
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
  followingPlayback: boolean
  onFile: (file: File) => void
  onSeek: (time: number) => void
  onTimeChange: (time: number) => void
  onViewportChange: (viewport: PitchViewport) => void
  onTogglePlayback: () => void
  onVolumeChange: (volume: number) => void
  onFollowingPlaybackChange: (following: boolean) => void
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
            title={fileName ?? undefined}
          >
            <span
              className="flex size-11 items-center justify-center rounded-lg"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent-amber)' }}
            >
              <Upload size={26} strokeWidth={1.7} />
            </span>
            <span
              className="w-full min-w-0 truncate text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
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
              onTogglePlayback={onTogglePlayback}
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
        pathMaxTimeGap={0.22}
        pathMaxPitchJumpSemitones={5}
        timelineMaxTime={duration}
        playbackAvailable={duration > 0}
        followingPlayback={followingPlayback}
        onFollowingPlaybackChange={onFollowingPlaybackChange}
        onViewportChange={onViewportChange}
        onSeek={onSeek}
      />
    </WorkbenchLayout>
  )
}

const WorkbenchLayout = ({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) => (
  <div className="grid w-full min-w-0 max-w-full grid-cols-1 xl:grid-cols-[18.5rem_minmax(0,1fr)]">
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
  pathMaxTimeGap,
  pathMaxPitchJumpSemitones,
  timelineMaxTime,
  playbackAvailable,
  followingPlayback,
  onFollowingPlaybackChange,
  onViewportChange,
  onSeek,
}: {
  title: string
  points: PitchTrackPoint[]
  current: PitchDetection
  cursorTime: number
  viewport: PitchViewport
  emptyText: string
  pathMaxTimeGap: number
  pathMaxPitchJumpSemitones: number
  timelineMaxTime: number
  playbackAvailable: boolean
  followingPlayback: boolean
  onFollowingPlaybackChange: (following: boolean) => void
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
      pathMaxTimeGap={pathMaxTimeGap}
      pathMaxPitchJumpSemitones={pathMaxPitchJumpSemitones}
      timelineMaxTime={timelineMaxTime}
      playbackAvailable={playbackAvailable}
      followingPlayback={followingPlayback}
      onFollowingPlaybackChange={onFollowingPlaybackChange}
      onViewportChange={onViewportChange}
      onSeek={onSeek}
    />
  </div>
)

const PitchReadout = ({ current }: { current: PitchDetection }) => {
  const cents =
    current.isVoiced && current.cents != null ? Math.max(-50, Math.min(50, current.cents)) : null
  const markerPosition = cents == null ? 50 : cents + 50
  const hasPitch = current.isVoiced && current.frequencyHz != null
  const noteName = hasPitch ? formatNoteNameForDisplay(current.noteName) : '—'

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
        <div className="mt-4 flex min-h-16 min-w-0 items-center justify-between gap-4">
          <p
            className={`min-w-0 whitespace-nowrap font-display font-semibold leading-none ${
              hasPitch ? 'text-5xl tracking-[-0.06em] sm:text-6xl' : 'text-4xl tracking-normal'
            }`}
            style={{ color: 'var(--text-primary)' }}
          >
            {noteName}
          </p>
          <div className="flex min-h-14 shrink-0 flex-col justify-center text-right">
            <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              {hasPitch ? `${current.frequencyHz!.toFixed(1)} Hz` : '— Hz'}
            </p>
            <p className="mt-2 text-xs leading-[1.125rem]" style={{ color: 'var(--text-muted)' }}>
              置信度 {Math.round(current.confidence * 100)}%
            </p>
          </div>
        </div>
      </div>
      <div className="flex min-h-40 flex-col justify-center px-5 py-5 sm:px-7">
        <div className="mb-4 flex min-h-16 items-center justify-between gap-4">
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
          <p className="max-w-28 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
            {cents == null
              ? '等待稳定音高'
              : Math.abs(cents) <= 5
                ? '音高准确'
                : cents < 0
                  ? '音高偏低'
                  : '音高偏高'}
          </p>
        </div>
        <div className="relative mx-3 h-10" aria-label="音高偏差刻度">
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
              className="absolute top-2 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${tick + 50}%` }}
            >
              <span className="block h-3 w-px" style={{ background: 'rgba(44,42,48,0.28)' }} />
              <span
                className="mt-1 block font-mono text-[11px] leading-4"
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
          className="mx-3 mt-1 flex justify-between text-xs"
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
  pathMaxTimeGap,
  pathMaxPitchJumpSemitones,
  timelineMaxTime,
  playbackAvailable,
  followingPlayback,
  onFollowingPlaybackChange,
  onViewportChange,
  onSeek,
}: {
  points: PitchTrackPoint[]
  cursorTime: number
  viewport: PitchViewport
  emptyText: string
  pathMaxTimeGap: number
  pathMaxPitchJumpSemitones: number
  timelineMaxTime: number
  playbackAvailable: boolean
  followingPlayback: boolean
  onFollowingPlaybackChange: (following: boolean) => void
  onViewportChange: (viewport: PitchViewport) => void
  onSeek: (time: number) => void
}) => {
  const { playNote } = usePianoAudio()
  const chartRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ x: number; viewport: PitchViewport; moved: boolean } | null>(null)
  const timelineRangeRef = useRef<HTMLDivElement | null>(null)
  const timelineDragRef = useRef<{
    pointerId: number
    x: number
    viewport: PitchViewport
  } | null>(null)
  const referenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeReferenceFrequency, setActiveReferenceFrequency] = useState<number | null>(null)
  const [hover, setHover] = useState<{
    x: number
    y: number
    time: number
    point: PitchTrackPoint | null
  } | null>(null)
  const lastPointTime = points.length > 0 ? points[points.length - 1].time : 0
  const emptyTimelineCursor = points.length === 0 ? cursorTime : 0
  const timelineBounds = useMemo(
    () => ({
      minTime: 0,
      maxTime: Math.max(
        20,
        lastPointTime,
        timelineMaxTime,
        viewport.endTime,
        emptyTimelineCursor,
      ),
      minSpan: 1,
    }),
    [emptyTimelineCursor, lastPointTime, timelineMaxTime, viewport.endTime],
  )
  const visibleViewport = useMemo(
    () => clampPitchView(viewport, timelineBounds),
    [timelineBounds, viewport],
  )
  const visiblePoints = useMemo(
    () => pointsInTimeRange(points, visibleViewport.startTime, visibleViewport.endTime),
    [points, visibleViewport],
  )
  const { minFrequency, maxFrequency } = useMemo(() => {
    let detectedMin = Number.POSITIVE_INFINITY
    let detectedMax = Number.NEGATIVE_INFINITY
    for (const point of visiblePoints) {
      if (!point.isVoiced || point.frequencyHz == null) continue
      detectedMin = Math.min(detectedMin, point.frequencyHz)
      detectedMax = Math.max(detectedMax, point.frequencyHz)
    }
    if (!Number.isFinite(detectedMin) || !Number.isFinite(detectedMax)) {
      return { minFrequency: 65, maxFrequency: 1200 }
    }
    return {
      minFrequency: Math.max(65, detectedMin - 40),
      maxFrequency: Math.min(1200, detectedMax + 40),
    }
  }, [visiblePoints])
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
  const path = useMemo(
    () =>
      buildPitchPath(visiblePoints, {
        minTime: visibleViewport.startTime,
        timeSpan,
        minFrequency,
        maxFrequency,
        chartWidth: CHART_WIDTH,
        chartHeight: CHART_HEIGHT,
        plot: CHART_PLOT,
        maxTimeGap: pathMaxTimeGap,
        maxPitchJumpSemitones: pathMaxPitchJumpSemitones,
      }),
    [
      maxFrequency,
      minFrequency,
      pathMaxPitchJumpSemitones,
      pathMaxTimeGap,
      timeSpan,
      visiblePoints,
      visibleViewport.startTime,
    ],
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
    if (Math.abs(deltaX) > 3) {
      drag.moved = true
      onFollowingPlaybackChange(false)
    }
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

  const resizeTimeline = (value: number | readonly number[]) => {
    if (!Array.isArray(value)) return
    const [startTime, endTime] = value
    if (startTime == null || endTime == null) return
    onFollowingPlaybackChange(false)
    onViewportChange(clampPitchView({ startTime, endTime }, timelineBounds))
  }

  const handleTimelinePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof Element) || !target.closest('[data-slot="slider-range"]')) return
    if (timeSpan >= timelineBounds.maxTime - timelineBounds.minTime - 0.001) return
    event.preventDefault()
    event.stopPropagation()
    onFollowingPlaybackChange(false)
    timelineDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      viewport: visibleViewport,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleTimelinePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = timelineDragRef.current
    const rect = timelineRangeRef.current?.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId || !rect) return
    const totalTime = timelineBounds.maxTime - timelineBounds.minTime
    const deltaTime = ((event.clientX - drag.x) / Math.max(1, rect.width)) * totalTime
    onViewportChange(panPitchView(drag.viewport, deltaTime, timelineBounds))
  }

  const finishTimelineDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (timelineDragRef.current?.pointerId !== event.pointerId) return
    timelineDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
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
                  aria-label="跟随播放位置"
                  aria-pressed={followingPlayback}
                  disabled={!playbackAvailable}
                  className={
                    followingPlayback
                      ? 'border-[var(--accent-amber)] bg-[var(--accent-glow)] text-[var(--accent-amber)]'
                      : undefined
                  }
                  onClick={() => onFollowingPlaybackChange(!followingPlayback)}
                >
                  <LocateFixed />
                </Button>
              }
            />
            <TooltipContent>{followingPlayback ? '关闭播放跟随' : '开启播放跟随'}</TooltipContent>
          </Tooltip>
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
      <div
        className="border-t px-4 py-3"
        style={{ borderColor: 'rgba(44,42,48,0.09)', background: 'rgba(255,255,255,0.24)' }}
      >
        <div
          className="mb-2 flex items-center justify-between gap-3 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>时间轴浏览</span>
          <span className="font-mono">
            {formatTime(visibleViewport.startTime)} — {formatTime(visibleViewport.endTime)}
          </span>
        </div>
        <div
          ref={timelineRangeRef}
          role="group"
          aria-label="时间轴可视范围"
          className="touch-none py-1"
          onPointerDownCapture={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={finishTimelineDrag}
          onPointerCancel={finishTimelineDrag}
        >
          <Slider
            min={timelineBounds.minTime}
            max={timelineBounds.maxTime}
            step={0.01}
            minStepsBetweenValues={100}
            thumbCollisionBehavior="none"
            value={[visibleViewport.startTime, visibleViewport.endTime]}
            onValueChange={resizeTimeline}
            thumbAriaLabels={['可视范围起点', '可视范围终点']}
            getThumbAriaValueText={(_, value) => formatTime(value)}
            aria-label="时间轴范围滚动条"
            className="[&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-range]]:cursor-grab [&_[data-slot=slider-range]]:bg-[var(--accent-amber)] [&_[data-slot=slider-range]]:active:cursor-grabbing [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:rounded-sm [&_[data-slot=slider-thumb]]:border-[var(--text-primary)]"
          />
          <div
            className="mt-1.5 flex items-center justify-between text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>拖动左侧手柄调整起点</span>
            <span className="hidden sm:inline">拖动中间移动范围</span>
            <span>拖动右侧手柄调整终点</span>
          </div>
        </div>
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
      <ScrollArea className="max-h-32 pr-3">
        {logs.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            上传后会显示处理日志。
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {logs.map((log) => (
              <li
                key={log}
                className="text-xs leading-relaxed [overflow-wrap:anywhere]"
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
  onTogglePlayback,
  onVolumeChange,
}: {
  audioRef: RefObject<HTMLAudioElement | null>
  duration: number
  currentTime: number
  playing: boolean
  volume: number
  onTimeChange: (time: number) => void
  onTogglePlayback: () => void
  onVolumeChange: (volume: number) => void
}) => {
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
                onClick={onTogglePlayback}
                aria-label={playing ? '暂停播放' : '播放音频'}
                aria-keyshortcuts="Space"
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
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            空格播放或暂停
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

function preserveViewportReference(current: PitchViewport, next: PitchViewport): PitchViewport {
  return current.startTime === next.startTime && current.endTime === next.endTime ? current : next
}

function pointsInTimeRange(
  points: PitchTrackPoint[],
  startTime: number,
  endTime: number,
): PitchTrackPoint[] {
  let start = 0
  let end = points.length
  while (start < end) {
    const middle = Math.floor((start + end) / 2)
    if (points[middle].time < startTime) start = middle + 1
    else end = middle
  }
  const startIndex = start

  end = points.length
  while (start < end) {
    const middle = Math.floor((start + end) / 2)
    if (points[middle].time <= endTime) start = middle + 1
    else end = middle
  }

  if (startIndex === 0 && start === points.length) return points
  return points.slice(startIndex, start)
}

function findRecordingSegment(
  segments: LiveRecordingSegment[],
  time: number,
): LiveRecordingSegment | null {
  const matching = segments.find(
    (segment) => time >= segment.startTime - 0.05 && time <= segment.endTime + 0.05,
  )
  if (matching) return matching
  return (
    segments.reduce<LiveRecordingSegment | null>((nearest, segment) => {
      if (!nearest) return segment
      const distance = Math.min(
        Math.abs(time - segment.startTime),
        Math.abs(time - segment.endTime),
      )
      const nearestDistance = Math.min(
        Math.abs(time - nearest.startTime),
        Math.abs(time - nearest.endTime),
      )
      return distance < nearestDistance ? segment : nearest
    }, null) ?? null
  )
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

function requireMediaDevices(source: PitchSource): MediaDevices {
  const mediaDevices = navigator.mediaDevices
  if (window.isSecureContext === false || !mediaDevices) {
    throw new Error(
      '浏览器已在当前页面禁用媒体采集。请确认地址使用有效的 HTTPS 证书；HTTP 页面只能在 localhost 环境访问麦克风或电脑音频。',
    )
  }
  if (source === 'display-audio' && typeof mediaDevices.getDisplayMedia !== 'function') {
    throw new Error('当前浏览器不支持采集电脑音频，请改用桌面版 Chrome 或 Edge。')
  }
  if (source === 'microphone' && typeof mediaDevices.getUserMedia !== 'function') {
    throw new Error('当前浏览器不支持麦克风采集，请升级浏览器后重试。')
  }
  return mediaDevices
}

function buildMicrophoneConstraints(deviceId: string): MediaTrackConstraints {
  return {
    channelCount: { ideal: 1 },
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  }
}

function isInteractiveKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'button, input, select, textarea, a, [contenteditable="true"], [role="button"], [role="slider"], [role="tab"]',
    ),
  )
}

function findKeyboardButton(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLButtonElement>('button')
}

export default PitchDetectorPage
