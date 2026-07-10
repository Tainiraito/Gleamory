import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import SiteHeader from '@/components/SiteHeader'
import BackFooter from '@/components/BackFooter'
import { Fretboard } from '@/components/guitar-fretboard/Fretboard'
import { QuizPanel } from '@/components/guitar-fretboard/QuizPanel'
import { TuningSettings } from '@/components/guitar-fretboard/TuningSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useGuitarSampleAudio } from '@/hooks/useGuitarSampleAudio'
import { generateFretboard, getPositionKey } from '@/lib/guitarFretboard/fretboard'
import {
  DEFAULT_RANDOM_PRACTICE_SCOPE,
  INTERVAL_OPTIONS,
  MAJOR_SCALE_DEGREE_OPTIONS,
  judgeQuizAnswer,
  makeConfiguredPracticeQuestion,
  summarizePractice,
  summarizePracticeSessions,
} from '@/lib/guitarFretboard/quiz'
import { loadFretboardState, saveFretboardState } from '@/lib/guitarFretboard/storage'
import { getTuningPreset, transposeString, transposeTuning } from '@/lib/guitarFretboard/tuning'
import type {
  AccidentalPreference,
  FretRange,
  FretPosition,
  FretboardMode,
  IntervalId,
  MajorScaleDegree,
  NoteDisplayDurationMs,
  PitchClass,
  PracticeSession,
  PracticeSummary as PracticeSummaryModel,
  QuizAnswer,
  QuizQuestion,
  QuizType,
  RandomPracticeScope,
  TuningPreset,
} from '@/lib/guitarFretboard/types'

const tabs = ['今日练习', '指板地图', '设置'] as const
type TrainerTab = (typeof tabs)[number]
type MapPattern = 'all' | 'major-scale' | 'natural-minor' | 'minor-pentatonic' | 'major-triad' | 'minor-triad' | 'dominant7'
type MapRangeId = 'all' | 'open' | 'middle' | 'upper' | 'octave'
type PracticeRangeId = 'basic' | 'open' | 'middle' | 'upper'
type PracticeMode = 'random' | 'custom'

interface PracticeConfig {
  mode: PracticeMode
  type: QuizType
  rangeId: PracticeRangeId
  targetNote: PitchClass
  stringNumber: FretPosition['stringNumber']
  interval: IntervalId
  keyRoot: PitchClass
  degree: MajorScaleDegree
  randomScope: RandomPracticeScope
}

const pitchClasses: PitchClass[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const naturalNoteOptions: PitchClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const practiceRangeOptions: Array<{ value: PracticeRangeId; label: string; range: FretRange }> = [
  { value: 'basic', label: '基础 0-12 品', range: { minFret: 0, maxFret: 12 } },
  { value: 'open', label: '开放把位 0-4 品', range: { minFret: 0, maxFret: 4 } },
  { value: 'middle', label: '中把位 5-12 品', range: { minFret: 5, maxFret: 12 } },
  { value: 'upper', label: '高把位 12-24 品', range: { minFret: 12, maxFret: 24 } },
]
const practiceModeOptions: Array<{ value: PracticeMode; label: string }> = [
  { value: 'random', label: '随机混合' },
  { value: 'custom', label: '自选题目' },
]
const practiceTypeOptions: Array<{ value: QuizType; label: string }> = [
  { value: 'find-note', label: '找音' },
  { value: 'identify-note', label: '认音' },
  { value: 'octave', label: '八度' },
  { value: 'interval', label: '音程' },
  { value: 'scale-degree', label: '调内音' },
]
const stringOptions: Array<{ value: FretPosition['stringNumber']; label: string }> = [1, 2, 3, 4, 5, 6].map((stringNumber) => ({
  value: stringNumber as FretPosition['stringNumber'],
  label: `${stringNumber} 弦`,
}))
const defaultPracticeConfig: PracticeConfig = {
  mode: 'random',
  type: 'find-note',
  rangeId: 'basic',
  targetNote: 'C',
  stringNumber: 6,
  interval: 'perfect-fifth',
  keyRoot: 'C',
  degree: 1,
  randomScope: {
    ...DEFAULT_RANDOM_PRACTICE_SCOPE,
    types: [...DEFAULT_RANDOM_PRACTICE_SCOPE.types],
    notes: [...DEFAULT_RANDOM_PRACTICE_SCOPE.notes],
    strings: [...DEFAULT_RANDOM_PRACTICE_SCOPE.strings],
    intervals: [...DEFAULT_RANDOM_PRACTICE_SCOPE.intervals],
    keyRoots: [...DEFAULT_RANDOM_PRACTICE_SCOPE.keyRoots],
    degrees: [...DEFAULT_RANDOM_PRACTICE_SCOPE.degrees],
  },
}
const mapPatternOptions: Array<{ value: MapPattern; label: string; intervals: number[] | null }> = [
  { value: 'all', label: '全部音', intervals: null },
  { value: 'major-scale', label: '大调音阶', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { value: 'natural-minor', label: '自然小调', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { value: 'minor-pentatonic', label: '小五声音阶', intervals: [0, 3, 5, 7, 10] },
  { value: 'major-triad', label: '大三和弦', intervals: [0, 4, 7] },
  { value: 'minor-triad', label: '小三和弦', intervals: [0, 3, 7] },
  { value: 'dominant7', label: '属七和弦', intervals: [0, 4, 7, 10] },
]
const mapRangeOptions: Array<{ value: MapRangeId; label: string; range: FretRange | null }> = [
  { value: 'all', label: '全部把位', range: null },
  { value: 'open', label: '开放把位 0-4 品', range: { minFret: 0, maxFret: 4 } },
  { value: 'middle', label: '中把位 5-9 品', range: { minFret: 5, maxFret: 9 } },
  { value: 'upper', label: '高把位 7-12 品', range: { minFret: 7, maxFret: 12 } },
  { value: 'octave', label: '十二品上方 12-17 品', range: { minFret: 12, maxFret: 17 } },
]

function getQuestionTargetNote(question: QuizQuestion): PitchClass | undefined {
  return question.skillTags.find((tag) => tag.startsWith('note:'))?.replace('note:', '') as PitchClass | undefined
}

function getPitchClassIndex(noteName: PitchClass): number {
  return pitchClasses.indexOf(noteName)
}

function getMapPitchClasses(root: PitchClass, pattern: MapPattern): Set<PitchClass> | null {
  const option = mapPatternOptions.find((candidate) => candidate.value === pattern)
  if (!option?.intervals) return null
  const rootIndex = getPitchClassIndex(root)
  return new Set(option.intervals.map((interval) => pitchClasses[(rootIndex + interval) % pitchClasses.length]!))
}

function getMapRange(rangeId: MapRangeId): FretRange | null {
  return mapRangeOptions.find((option) => option.value === rangeId)?.range ?? null
}

function getPracticeRange(rangeId: PracticeRangeId): FretRange {
  return practiceRangeOptions.find((option) => option.value === rangeId)?.range ?? practiceRangeOptions[0]!.range
}

function formatMapSelection(pattern: MapPattern, selectedNotes: Set<PitchClass>): string {
  if (selectedNotes.size > 0) return [...selectedNotes].join(' / ')
  return mapPatternOptions.find((option) => option.value === pattern)?.label ?? '全部音'
}

function sessionFromResult(question: QuizQuestion, answer: QuizAnswer): PracticeSession {
  const summary = summarizePractice([{ question, answer }])
  return {
    id: `session-${answer.answeredAt}`,
    startedAt: question.createdAt,
    endedAt: answer.answeredAt,
    questionPrompt: question.prompt,
    responseMs: answer.responseMs,
    ...summary,
  }
}

function formatResponseTime(ms: number): string {
  return ms > 0 ? `${(ms / 1000).toFixed(2)} 秒` : '--'
}

interface ViewIntroProps {
  eyebrow: string
  title: string
  body: string
  badges?: string[]
  action?: ReactNode
}

function ViewIntro({ eyebrow, title, body, badges = [], action }: ViewIntroProps) {
  return (
    <section className="fretboard-view-intro">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <small>{body}</small>
        {badges.length > 0 && (
          <div className="fretboard-pill-row">
            {badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        )}
      </div>
      {action}
    </section>
  )
}

interface ButtonGroupProps<T extends string | number> {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  hint?: string
}

function ButtonGroup<T extends string | number>({ label, options, value, onChange, disabled = false, hint }: ButtonGroupProps<T>) {
  return (
    <div className="fretboard-button-group" role="group" aria-label={label} data-disabled={disabled ? 'true' : undefined}>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MultiButtonGroupProps<T extends string | number> {
  label: string
  options: Array<{ value: T; label: string }>
  values: T[]
  onChange: (values: T[]) => void
  onRejectLast: () => void
}

function MultiButtonGroup<T extends string | number>({ label, options, values, onChange, onRejectLast }: MultiButtonGroupProps<T>) {
  const selectedValues = new Set(values)
  return (
    <div className="fretboard-button-group" role="group" aria-label={label}>
      <span>{label}</span>
      <div>
        {options.map((option) => {
          const isSelected = selectedValues.has(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                if (isSelected && values.length === 1) {
                  onRejectLast()
                  return
                }
                onChange(isSelected ? values.filter((value) => value !== option.value) : [...values, option.value])
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface DailyPracticePanelProps {
  summary: PracticeSummaryModel
  config: PracticeConfig
  onConfigChange: (config: PracticeConfig) => void
}

function DailyPracticePanel({ summary, config, onConfigChange }: DailyPracticePanelProps) {
  const [constraintMessage, setConstraintMessage] = useState('')
  const updateConfig = <K extends keyof PracticeConfig>(key: K, value: PracticeConfig[K]) => {
    setConstraintMessage('')
    onConfigChange({ ...config, [key]: value })
  }
  const updateRandomScope = <K extends keyof RandomPracticeScope>(key: K, value: RandomPracticeScope[K]) => {
    setConstraintMessage('')
    onConfigChange({ ...config, randomScope: { ...config.randomScope, [key]: value } })
  }
  const rejectLast = () => setConstraintMessage('至少保留一项')
  const randomTypes = config.randomScope.types
  const needsNotes = randomTypes.some((type) => type === 'find-note' || type === 'octave' || type === 'interval')
  const needsStrings = randomTypes.includes('identify-note')
  const needsIntervals = randomTypes.includes('interval')
  const needsScaleDegrees = randomTypes.includes('scale-degree')

  return (
    <div className="fretboard-practice-card">
      <ViewIntro
        eyebrow="今日训练计划"
        title="五类题型短练习"
        body="随机混合可以直接开始；自选题目可指定题型、范围和目标参数。"
        badges={[`已完成 ${summary.totalQuestions} 题`, `正确率 ${Math.round(summary.accuracy * 100)}%`, `平均反应 ${formatResponseTime(summary.averageResponseMs)}`]}
      />
      <div className="fretboard-practice-controls">
        <ButtonGroup label="出题方式" options={practiceModeOptions} value={config.mode} onChange={(value) => updateConfig('mode', value)} />
        {config.mode === 'random' && (
          <>
            <MultiButtonGroup
              label="随机题型"
              options={practiceTypeOptions}
              values={config.randomScope.types}
              onChange={(values) => updateRandomScope('types', values)}
              onRejectLast={rejectLast}
            />
            {needsNotes && (
              <MultiButtonGroup
                label="随机音名"
                options={pitchClasses.map((noteName) => ({ value: noteName, label: noteName }))}
                values={config.randomScope.notes}
                onChange={(values) => updateRandomScope('notes', values)}
                onRejectLast={rejectLast}
              />
            )}
            {needsStrings && (
              <MultiButtonGroup
                label="随机弦"
                options={stringOptions}
                values={config.randomScope.strings}
                onChange={(values) => updateRandomScope('strings', values)}
                onRejectLast={rejectLast}
              />
            )}
            {needsIntervals && (
              <MultiButtonGroup
                label="随机音程"
                options={INTERVAL_OPTIONS.map(({ value, label }) => ({ value, label }))}
                values={config.randomScope.intervals}
                onChange={(values) => updateRandomScope('intervals', values)}
                onRejectLast={rejectLast}
              />
            )}
            {needsScaleDegrees && (
              <>
                <MultiButtonGroup
                  label="随机调性"
                  options={pitchClasses.map((noteName) => ({ value: noteName, label: `${noteName} 大调` }))}
                  values={config.randomScope.keyRoots}
                  onChange={(values) => updateRandomScope('keyRoots', values)}
                  onRejectLast={rejectLast}
                />
                <MultiButtonGroup
                  label="随机音级"
                  options={MAJOR_SCALE_DEGREE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                  values={config.randomScope.degrees}
                  onChange={(values) => updateRandomScope('degrees', values)}
                  onRejectLast={rejectLast}
                />
              </>
            )}
          </>
        )}
        {config.mode === 'custom' && (
          <>
            <ButtonGroup label="题型" options={practiceTypeOptions} value={config.type} onChange={(value) => updateConfig('type', value)} />
            {config.type === 'find-note' && (
              <ButtonGroup
                label="目标音"
                options={pitchClasses.map((noteName) => ({ value: noteName, label: noteName }))}
                value={config.targetNote}
                onChange={(value) => updateConfig('targetNote', value)}
              />
            )}
            {config.type === 'identify-note' && (
              <ButtonGroup label="指定弦" options={stringOptions} value={config.stringNumber} onChange={(value) => updateConfig('stringNumber', value)} />
            )}
            {config.type === 'octave' && (
              <ButtonGroup
                label="起点音"
                options={pitchClasses.map((noteName) => ({ value: noteName, label: noteName }))}
                value={config.targetNote}
                onChange={(value) => updateConfig('targetNote', value)}
              />
            )}
            {config.type === 'interval' && (
              <>
                <ButtonGroup
                  label="根音"
                  options={pitchClasses.map((noteName) => ({ value: noteName, label: `根音 ${noteName}` }))}
                  value={config.targetNote}
                  onChange={(value) => updateConfig('targetNote', value)}
                />
                <ButtonGroup
                  label="音程"
                  options={INTERVAL_OPTIONS.map(({ value, label }) => ({ value, label }))}
                  value={config.interval}
                  onChange={(value) => updateConfig('interval', value)}
                />
              </>
            )}
            {config.type === 'scale-degree' && (
              <>
                <ButtonGroup
                  label="调性"
                  options={pitchClasses.map((noteName) => ({ value: noteName, label: `${noteName} 大调` }))}
                  value={config.keyRoot}
                  onChange={(value) => updateConfig('keyRoot', value)}
                />
                <ButtonGroup
                  label="目标音级"
                  options={MAJOR_SCALE_DEGREE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                  value={config.degree}
                  onChange={(value) => updateConfig('degree', value)}
                />
              </>
            )}
          </>
        )}
        <ButtonGroup
          label="练习范围"
          options={practiceRangeOptions}
          value={config.rangeId}
          onChange={(value) => updateConfig('rangeId', value)}
        />
        {constraintMessage && <p className="fretboard-config-message" role="status">{constraintMessage}</p>}
      </div>
    </div>
  )
}

interface MapExplorerSideProps {
  selectedPosition: FretPosition | null
}

function MapExplorerSide({ selectedPosition }: MapExplorerSideProps) {
  return (
    <aside className="fretboard-side">
      <section className="fretboard-panel">
        <h2>当前位置详情</h2>
        {selectedPosition ? (
          <dl>
            <div>
              <dt>位置</dt>
              <dd>
                {selectedPosition.stringNumber}弦 {selectedPosition.fretNumber}品
              </dd>
            </div>
            <div>
              <dt>音名</dt>
              <dd>{selectedPosition.displayNoteName}</dd>
            </div>
            <div>
              <dt>音高</dt>
              <dd>{selectedPosition.noteWithOctave}</dd>
            </div>
            <div>
              <dt>频率</dt>
              <dd>{selectedPosition.frequency.toFixed(1)} Hz</dd>
            </div>
          </dl>
        ) : (
          <p className="fretboard-empty-state">点击任意品位，查看音名、八度和采样播放状态。</p>
        )}
      </section>

    </aside>
  )
}

interface MapControlsProps {
  tuning: TuningPreset
  root: PitchClass
  pattern: MapPattern
  rangeId: MapRangeId
  selectedNotes: Set<PitchClass>
  onTransposeTuning: (semitones: number) => void
  onTransposeString: (stringNumber: TuningPreset['strings'][number]['stringNumber'], semitones: number) => void
  onRootChange: (root: PitchClass) => void
  onPatternChange: (pattern: MapPattern) => void
  onRangeChange: (rangeId: MapRangeId) => void
  onToggleNote: (noteName: PitchClass) => void
}

function MapControls({
  tuning,
  root,
  pattern,
  rangeId,
  selectedNotes,
  onTransposeTuning,
  onTransposeString,
  onRootChange,
  onPatternChange,
  onRangeChange,
  onToggleNote,
}: MapControlsProps) {
  return (
    <section className="fretboard-map-controls">
      <div className="fretboard-map-control-header">
        <div>
          <h2>快速调弦</h2>
          <p>直接在地图里调整整体或单弦音高。</p>
        </div>
        <div className="fretboard-map-tuning-actions">
          <button type="button" className="fretboard-button secondary" onClick={() => onTransposeTuning(-1)}>
            整体降半音
          </button>
          <button type="button" className="fretboard-button secondary" onClick={() => onTransposeTuning(1)}>
            整体升半音
          </button>
        </div>
      </div>

      <div className="fretboard-string-tuning-list">
        {tuning.strings.map((string) => (
          <div key={string.stringNumber} className="fretboard-string-tuning-row">
            <span>{string.displayName}</span>
            <strong>{string.openNote}</strong>
            <button type="button" aria-label={`${string.stringNumber}弦降半音`} onClick={() => onTransposeString(string.stringNumber, -1)}>
              -
            </button>
            <button type="button" aria-label={`${string.stringNumber}弦升半音`} onClick={() => onTransposeString(string.stringNumber, 1)}>
              +
            </button>
          </div>
        ))}
      </div>

      <div className="fretboard-map-selectors">
        <ButtonGroup
          label="音阶/和弦根音"
          options={pitchClasses.map((noteName) => ({ value: noteName, label: `根音 ${noteName}` }))}
          value={root}
          onChange={onRootChange}
          disabled={pattern === 'all'}
          hint={pattern === 'all' ? '选择音阶或和弦后生效' : undefined}
        />
        <ButtonGroup label="显示内容" options={mapPatternOptions} value={pattern} onChange={onPatternChange} />
        <ButtonGroup label="把位范围" options={mapRangeOptions.map(({ value, label }) => ({ value, label }))} value={rangeId} onChange={onRangeChange} />
        <div className="fretboard-button-group" role="group" aria-label="指定音多选">
          <span>指定音多选</span>
          <div>
            {naturalNoteOptions.map((noteName) => (
              <button key={noteName} type="button" aria-pressed={selectedNotes.has(noteName)} onClick={() => onToggleNote(noteName)}>
                显示 {noteName}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const GuitarFretboardTrainerPage = () => {
  useDocumentTitle('指板音训练 | Gleamory 微光集')
  const initialState = useMemo(() => loadFretboardState(), [])
  const [activeTab, setActiveTab] = useState<TrainerTab>('今日练习')
  const [settings, setSettings] = useState(initialState.settings)
  const [sessions, setSessions] = useState(initialState.sessions)
  const [, setPracticeIndex] = useState(0)
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfig>(defaultPracticeConfig)
  const [questionNonce, setQuestionNonce] = useState(0)
  const [avoidPracticeNote, setAvoidPracticeNote] = useState<PitchClass | undefined>(undefined)
  const [avoidPracticeType, setAvoidPracticeType] = useState<QuizType | undefined>(undefined)
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now())
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [selectedPositions, setSelectedPositions] = useState<FretPosition[]>([])
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [fadingKeys, setFadingKeys] = useState<Set<string>>(new Set())
  const [suppressedKeys, setSuppressedKeys] = useState<Set<string>>(new Set())
  const [selectedOption, setSelectedOption] = useState<PitchClass | undefined>(undefined)
  const [answer, setAnswer] = useState<QuizAnswer | null>(null)
  const [mapRoot, setMapRoot] = useState<PitchClass>('C')
  const [mapPattern, setMapPattern] = useState<MapPattern>('all')
  const [mapRangeId, setMapRangeId] = useState<MapRangeId>('all')
  const [mapSelectedNotes, setMapSelectedNotes] = useState<Set<PitchClass>>(new Set())
  const revealTimersRef = useRef<Map<string, number[]>>(new Map())
  const { playPosition } = useGuitarSampleAudio()

  const fretboard = useMemo(
    () => generateFretboard({ tuning: settings.tuning, fretCount: settings.fretCount, accidental: settings.accidental }),
    [settings],
  )
  const practiceRange = getPracticeRange(practiceConfig.rangeId)
  const currentQuestion = useMemo(
    () => {
      void questionNonce
      return makeConfiguredPracticeQuestion(fretboard, {
        type: practiceConfig.mode === 'random' ? 'random' : practiceConfig.type,
        range: practiceRange,
        noteName: practiceConfig.targetNote,
        stringNumber: practiceConfig.stringNumber,
        interval: practiceConfig.interval,
        keyRoot: practiceConfig.keyRoot,
        degree: practiceConfig.degree,
        randomScope: practiceConfig.randomScope,
        avoidType: avoidPracticeType,
        avoidNote: avoidPracticeNote,
      })
    },
    [practiceConfig, avoidPracticeNote, avoidPracticeType, fretboard, practiceRange, questionNonce],
  )
  const currentTargetNote = currentQuestion.targetNote ?? getQuestionTargetNote(currentQuestion)
  const currentReferenceKeys = useMemo(
    () => new Set((currentQuestion.referencePositions ?? []).map(getPositionKey)),
    [currentQuestion.referencePositions],
  )
  const latestSummary = useMemo(() => summarizePracticeSessions(sessions), [sessions])
  const mapRange = getMapRange(mapRangeId)
  const mapPitchClasses = getMapPitchClasses(mapRoot, mapPattern)
  const mapSelectedPitchClasses = useMemo(
    () => new Set<PitchClass>([...(mapPitchClasses ? [...mapPitchClasses] : []), ...mapSelectedNotes]),
    [mapPitchClasses, mapSelectedNotes],
  )
  const mapHighlightedKeys = useMemo(
    () =>
      new Set(
        fretboard.positions
          .filter((position) => mapSelectedPitchClasses.has(position.noteName))
          .filter((position) => !mapRange || (position.fretNumber >= mapRange.minFret && position.fretNumber <= mapRange.maxFret))
          .map(getPositionKey),
      ),
    [fretboard.positions, mapRange, mapSelectedPitchClasses],
  )
  const mapRootKeys = useMemo(
    () =>
      new Set(
        fretboard.positions
          .filter((position) => position.noteName === mapRoot)
          .filter((position) => !mapRange || (position.fretNumber >= mapRange.minFret && position.fretNumber <= mapRange.maxFret))
          .map(getPositionKey),
      ),
    [fretboard.positions, mapRange, mapRoot],
  )

  useEffect(() => {
    const timers = revealTimersRef.current
    return () => {
      timers.forEach((ids) => ids.forEach(window.clearTimeout))
      timers.clear()
    }
  }, [])

  const persistSettings = (nextSettings: typeof settings, nextSessions = sessions) => {
    saveFretboardState({ settings: nextSettings, sessions: nextSessions, skillStates: initialState.skillStates })
  }

  const clearRevealTimersForKey = (key: string) => {
    revealTimersRef.current.get(key)?.forEach(window.clearTimeout)
    revealTimersRef.current.delete(key)
  }

  const clearAllRevealTimers = () => {
    revealTimersRef.current.forEach((ids) => ids.forEach(window.clearTimeout))
    revealTimersRef.current.clear()
  }

  const clearSelectionState = () => {
    clearAllRevealTimers()
    setAnswer(null)
    setSelectedKeys(new Set())
    setSelectedPositions([])
    setRevealedKeys(new Set())
    setFadingKeys(new Set())
    setSuppressedKeys(new Set())
    setSelectedOption(undefined)
  }

  const applyPracticeConfig = (nextConfig: PracticeConfig) => {
    setPracticeConfig(nextConfig)
    setAvoidPracticeNote(undefined)
    setAvoidPracticeType(undefined)
    clearSelectionState()
    setQuestionNonce((previous) => previous + 1)
    setPracticeIndex(0)
    setQuestionStartedAt(Date.now())
  }

  const updateSettings = (nextSettings: typeof settings) => {
    setSettings(nextSettings)
    clearSelectionState()
    setAvoidPracticeNote(undefined)
    setAvoidPracticeType(undefined)
    setQuestionNonce((previous) => previous + 1)
    setQuestionStartedAt(Date.now())
    persistSettings(nextSettings)
  }

  const handleTabChange = (tab: TrainerTab) => {
    if (tab === activeTab) return
    clearSelectionState()
    setActiveTab(tab)
    setQuestionStartedAt(Date.now())
  }

  const handleTuningChange = (id: TuningPreset['id']) => {
    if (id === 'custom') return
    updateSettings({ ...settings, tuning: getTuningPreset(id) })
  }

  const handleTransposeTuning = (semitones: number) => {
    updateSettings({ ...settings, tuning: transposeTuning(settings.tuning, semitones) })
  }

  const handleTransposeString = (stringNumber: TuningPreset['strings'][number]['stringNumber'], semitones: number) => {
    updateSettings({ ...settings, tuning: transposeString(settings.tuning, stringNumber, semitones) })
  }

  const revealPosition = (position: FretPosition) => {
    const key = getPositionKey(position)
    clearRevealTimersForKey(key)
    if (settings.noteDisplayMs === 0) {
      setSuppressedKeys((previous) => new Set(previous).add(key))
      return
    }

    setSuppressedKeys((previous) => {
      const next = new Set(previous)
      next.delete(key)
      return next
    })
    setRevealedKeys((previous) => new Set(previous).add(key))
    setFadingKeys((previous) => {
      const next = new Set(previous)
      next.delete(key)
      return next
    })

    if (settings.noteDisplayMs === null) return

    const timers: number[] = []
    const fadeDelay = Math.max(0, settings.noteDisplayMs - 450)
    timers.push(
      window.setTimeout(() => {
        setFadingKeys((previous) => new Set(previous).add(key))
      }, fadeDelay),
    )
    timers.push(
      window.setTimeout(() => {
        setRevealedKeys((previous) => {
          const next = new Set(previous)
          next.delete(key)
          return next
        })
        setFadingKeys((previous) => {
          const next = new Set(previous)
          next.delete(key)
          return next
        })
        setSuppressedKeys((previous) => new Set(previous).add(key))
        revealTimersRef.current.delete(key)
      }, settings.noteDisplayMs),
    )
    revealTimersRef.current.set(key, timers)
  }

  const isPracticeSurface = activeTab === '今日练习'
  const isInCurrentQuestionRange = (position: FretPosition) =>
    position.fretNumber >= currentQuestion.scope.minFret && position.fretNumber <= currentQuestion.scope.maxFret

  const handlePositionActivate = (position: FretPosition) => {
    if (isPracticeSurface && !isInCurrentQuestionRange(position)) return
    if (isPracticeSurface && currentQuestion.type === 'identify-note') return

    void playPosition(position)
    revealPosition(position)

    if (answer) return

    const key = getPositionKey(position)
    setSelectedKeys((previous) => {
      if (previous.has(key)) return previous
      const next = new Set(previous)
      next.add(key)
      return next
    })
    setSelectedPositions((previous) => {
      if (previous.some((candidate) => getPositionKey(candidate) === key)) return previous
      return [...previous, position]
    })
  }

  const handlePositionClear = (position: FretPosition) => {
    const key = getPositionKey(position)
    clearRevealTimersForKey(key)
    setSelectedKeys((previous) => {
      const next = new Set(previous)
      next.delete(key)
      return next
    })
    setSelectedPositions((previous) => previous.filter((candidate) => getPositionKey(candidate) !== key))
    setRevealedKeys((previous) => {
      const next = new Set(previous)
      next.delete(key)
      return next
    })
    setFadingKeys((previous) => {
      const next = new Set(previous)
      next.delete(key)
      return next
    })
    setSuppressedKeys((previous) => {
      const next = new Set(previous)
      next.delete(key)
      return next
    })
  }

  const queueNextQuestion = (avoidNote = currentTargetNote, avoidType = currentQuestion.type) => {
    clearSelectionState()
    setAvoidPracticeNote(avoidNote)
    setAvoidPracticeType(avoidType)
    setQuestionNonce((previous) => previous + 1)
    setPracticeIndex((previous) => previous + 1)
    setQuestionStartedAt(Date.now())
  }

  const submitAnswer = (option = selectedOption) => {
    if (answer) return

    const nextAnswer = judgeQuizAnswer(
      currentQuestion,
      selectedPositions,
      Math.max(0, Date.now() - questionStartedAt),
      option,
    )
    const nextSession = sessionFromResult(currentQuestion, nextAnswer)
    const nextSessions = [nextSession, ...sessions].slice(0, 1000)
    setAnswer(nextAnswer)
    setSessions(nextSessions)
    saveFretboardState({ settings, sessions: nextSessions, skillStates: initialState.skillStates })
  }

  const handleSubmit = () => submitAnswer()

  const handleSelectOption = (option: PitchClass) => {
    if (answer) return
    setSelectedOption(option)
    submitAnswer(option)
  }

  const handleReset = () => {
    clearSelectionState()
    setQuestionStartedAt(Date.now())
  }

  const handleNextQuestion = () => {
    queueNextQuestion()
  }

  const handleSkipQuestion = () => {
    queueNextQuestion()
  }

  const handleMapPatternChange = (pattern: MapPattern) => {
    setMapPattern(pattern)
    if (pattern === 'all') {
      setMapSelectedNotes(new Set())
    }
  }

  const handleToggleMapNote = (noteName: PitchClass) => {
    setMapSelectedNotes((previous) => {
      const next = new Set(previous)
      if (next.has(noteName)) {
        next.delete(noteName)
      } else {
        next.add(noteName)
      }
      return next
    })
  }

  const selectedPosition = selectedPositions.length > 0 ? selectedPositions[selectedPositions.length - 1] : null
  const renderFretboard = ({
    mode,
    answerState,
    targetNote,
    displayRange,
    disableOutsideRange = false,
    highlightedKeys,
    rootKeys,
    referenceKeys,
    selectionDisabled = false,
  }: {
    mode: FretboardMode
    answerState: QuizAnswer | null
    targetNote?: string
    displayRange?: FretRange
    disableOutsideRange?: boolean
    highlightedKeys?: Set<string>
    rootKeys?: Set<string>
    referenceKeys?: Set<string>
    selectionDisabled?: boolean
  }) => (
    <Fretboard
      strings={fretboard.strings.map((string) => string.stringNumber)}
      frets={fretboard.frets}
      positions={fretboard.positions}
      selectedKeys={selectedKeys}
      revealedKeys={revealedKeys}
      fadingKeys={fadingKeys}
      suppressedKeys={suppressedKeys}
      highlightedKeys={highlightedKeys}
      rootKeys={rootKeys}
      referenceKeys={referenceKeys}
      answer={answerState}
      mode={mode}
      targetNote={targetNote}
      displayRange={displayRange}
      disableOutsideRange={disableOutsideRange}
      selectionDisabled={selectionDisabled}
      onActivatePosition={handlePositionActivate}
      onClearPosition={handlePositionClear}
    />
  )
  const renderCurrentFretboard = () => {
    if (activeTab === '指板地图') {
      return renderFretboard({
        mode: 'all',
        answerState: null,
        displayRange: mapRange ?? undefined,
        highlightedKeys: mapHighlightedKeys,
        rootKeys: mapPattern === 'all' ? undefined : mapRootKeys,
      })
    }

    if (activeTab === '今日练习') {
      return renderFretboard({
        mode: settings.mode,
        answerState: answer,
        targetNote: currentTargetNote,
        displayRange: currentQuestion.scope,
        disableOutsideRange: true,
        referenceKeys: currentReferenceKeys,
        selectionDisabled: currentQuestion.type === 'identify-note',
      })
    }

    return renderFretboard({ mode: settings.mode, answerState: null, targetNote: currentTargetNote })
  }

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <main className="px-4 sm:px-[8%] pt-20 sm:pt-24 pb-36 sm:pb-24">
        <div className="fretboard-page-header">
          <div className="fretboard-page-rule" aria-hidden="true">
            <span />
            <i />
            <span />
          </div>
          <h1>指板音训练</h1>
          <p>Guitar Fretboard Trainer</p>
          <small>把弦、品、音名和手感放在同一个短练习里。</small>
        </div>

        <section className="fretboard-tool">
          <div className="fretboard-board-panel">{renderCurrentFretboard()}</div>

          {activeTab === '今日练习' && (
            <div className="fretboard-question-panel">
              <QuizPanel
                question={currentQuestion}
                selectedCount={selectedPositions.length}
                selectedOption={selectedOption}
                answer={answer}
                onSelectOption={handleSelectOption}
                onSubmit={handleSubmit}
                onReset={handleReset}
                onNext={handleNextQuestion}
                onSkip={handleSkipQuestion}
              />
            </div>
          )}

          <div className="fretboard-tabs" role="tablist" aria-label="指板音训练视图">
            {tabs.map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => handleTabChange(tab)}>
                {tab}
              </button>
            ))}
          </div>

          <div className="fretboard-body" data-with-side={activeTab === '指板地图' ? 'true' : undefined}>
            <div className="fretboard-main">
              {activeTab === '今日练习' && (
                <div className="fretboard-stack">
                  <DailyPracticePanel
                    summary={latestSummary}
                    config={practiceConfig}
                    onConfigChange={applyPracticeConfig}
                  />
                </div>
              )}

              {activeTab === '指板地图' && (
                <div className="fretboard-stack">
                  <ViewIntro
                    eyebrow="自由查看指板"
                    title="点位置、听音色、切换把位和音阶"
                    body="这里不计分也不提交答案，适合查看不同调、音阶、和弦在当前调弦下的分布。"
                    badges={[settings.tuning.name, formatMapSelection(mapPattern, mapSelectedNotes), mapRangeOptions.find((option) => option.value === mapRangeId)?.label ?? '全部把位']}
                  />
                  <MapControls
                    tuning={settings.tuning}
                    root={mapRoot}
                    pattern={mapPattern}
                    rangeId={mapRangeId}
                    selectedNotes={mapSelectedNotes}
                    onTransposeTuning={handleTransposeTuning}
                    onTransposeString={handleTransposeString}
                    onRootChange={setMapRoot}
                    onPatternChange={handleMapPatternChange}
                    onRangeChange={setMapRangeId}
                    onToggleNote={handleToggleMapNote}
                  />
                </div>
              )}

              {activeTab === '设置' && (
                <div className="fretboard-stack">
                  <ViewIntro
                    eyebrow="训练设置"
                    title="控制调弦、记谱和显示方式"
                    body="这些设置会影响今日练习；指板地图始终显示全部音名，便于查阅。"
                    badges={[settings.tuning.name, settings.accidental === 'sharp' ? '升号优先' : '降号优先']}
                  />
                  <TuningSettings
                    tuningId={settings.tuning.id}
                    accidental={settings.accidental}
                    mode={settings.mode}
                    noteDisplayMs={settings.noteDisplayMs}
                    onTuningChange={handleTuningChange}
                    onAccidentalChange={(accidental: AccidentalPreference) => updateSettings({ ...settings, accidental })}
                    onModeChange={(mode: FretboardMode) => updateSettings({ ...settings, mode })}
                    onNoteDisplayChange={(noteDisplayMs: NoteDisplayDurationMs) => updateSettings({ ...settings, noteDisplayMs })}
                  />
                </div>
              )}
            </div>

            {activeTab === '指板地图' && <MapExplorerSide selectedPosition={selectedPosition} />}
          </div>
        </section>
      </main>

      <BackFooter />
    </div>
  )
}

export default GuitarFretboardTrainerPage
