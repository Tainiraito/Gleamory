import { useMemo, useState, type ReactNode } from 'react'
import { Eye, Play, Settings } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import BackFooter from '@/components/BackFooter'
import { Fretboard } from '@/components/guitar-fretboard/Fretboard'
import { PracticeSummary } from '@/components/guitar-fretboard/PracticeSummary'
import { QuizPanel } from '@/components/guitar-fretboard/QuizPanel'
import { TuningSettings } from '@/components/guitar-fretboard/TuningSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useGuitarSampleAudio } from '@/hooks/useGuitarSampleAudio'
import { generateFretboard, getPositionKey } from '@/lib/guitarFretboard/fretboard'
import { judgeQuizAnswer, makeFindNoteQuestion, summarizePractice } from '@/lib/guitarFretboard/quiz'
import { loadFretboardState, saveFretboardState } from '@/lib/guitarFretboard/storage'
import { getTuningPreset } from '@/lib/guitarFretboard/tuning'
import type {
  AccidentalPreference,
  FretPosition,
  FretboardMode,
  PracticeSession,
  PracticeSummary as PracticeSummaryModel,
  QuizAnswer,
  QuizQuestion,
  TuningPreset,
} from '@/lib/guitarFretboard/types'

const tabs = ['今日练习', '指板地图', '测验', '记录', '设置'] as const
type TrainerTab = (typeof tabs)[number]

function sessionFromResult(question: QuizQuestion, answer: QuizAnswer): PracticeSession {
  const summary = summarizePractice([{ question, answer }])
  return {
    id: `session-${answer.answeredAt}`,
    startedAt: question.createdAt,
    endedAt: answer.answeredAt,
    ...summary,
  }
}

function formatResponseTime(ms: number): string {
  return ms > 0 ? `${(ms / 1000).toFixed(2)} 秒` : '--'
}

function formatSessionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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

interface DailyPracticePanelProps {
  summary: PracticeSummaryModel
  onStart: () => void
}

function DailyPracticePanel({ summary, onStart }: DailyPracticePanelProps) {
  return (
    <ViewIntro
      eyebrow="今日训练计划"
      title="先用 C 音把指板坐标热起来"
      body="默认从 0 到 12 品开始，选择你认为是 C 的位置；准备计时或连续答题时再进入测验。"
      badges={[`已完成 ${summary.totalQuestions} 题`, `正确率 ${Math.round(summary.accuracy * 100)}%`, `平均反应 ${formatResponseTime(summary.averageResponseMs)}`]}
      action={
        <button type="button" className="fretboard-button primary" onClick={onStart}>
          <Play size={16} aria-hidden="true" />
          进入测验模式
        </button>
      }
    />
  )
}

interface MapExplorerSideProps {
  selectedPosition: FretPosition | null
  sampleStatus: string
  sampleMessage: string
}

function MapExplorerSide({ selectedPosition, sampleStatus, sampleMessage }: MapExplorerSideProps) {
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

      <section className="fretboard-panel">
        <h2>采样音色</h2>
        <p data-status={sampleStatus}>{sampleMessage}</p>
      </section>
    </aside>
  )
}

interface PracticeRecordsPanelProps {
  sessions: PracticeSession[]
  summary: PracticeSummaryModel
}

function PracticeRecordsPanel({ sessions, summary }: PracticeRecordsPanelProps) {
  const recentSessions = sessions.slice(0, 6)

  return (
    <div className="fretboard-records">
      <ViewIntro
        eyebrow="练习记录"
        title="最近练习"
        body="记录会保存在本地浏览器中，用来回看正确率、反应速度和薄弱音。"
        badges={[`累计 ${summary.totalQuestions} 题`, `正确 ${summary.correctQuestions} 题`, `薄弱 ${summary.weakNotes.length > 0 ? summary.weakNotes.join(' / ') : '暂无'}`]}
      />

      {recentSessions.length > 0 ? (
        <div className="fretboard-record-list">
          {recentSessions.map((session) => (
            <article key={session.id} className="fretboard-record-item">
              <div>
                <strong>{formatSessionTime(session.endedAt)}</strong>
                <span>{session.totalQuestions} 题</span>
              </div>
              <div>
                <span>正确率 {Math.round(session.accuracy * 100)}%</span>
                <span>平均反应 {formatResponseTime(session.averageResponseMs)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="fretboard-panel">
          <h2>暂无练习记录</h2>
          <p>完成一次测验后，这里会出现最近练习、正确率和反应速度。</p>
        </section>
      )}
    </div>
  )
}

interface RecordsSideProps {
  summary: PracticeSummaryModel
  sampleStatus: string
  sampleMessage: string
}

function RecordsSide({ summary, sampleStatus, sampleMessage }: RecordsSideProps) {
  return (
    <aside className="fretboard-side">
      <section className="fretboard-panel">
        <h2>总览</h2>
        <dl>
          <div>
            <dt>正确率</dt>
            <dd>{Math.round(summary.accuracy * 100)}%</dd>
          </div>
          <div>
            <dt>平均反应</dt>
            <dd>{formatResponseTime(summary.averageResponseMs)}</dd>
          </div>
          <div>
            <dt>薄弱区域</dt>
            <dd>{summary.weakNotes.length > 0 ? summary.weakNotes.join(' / ') : '暂无'}</dd>
          </div>
        </dl>
      </section>

      <section className="fretboard-panel">
        <h2>采样音色</h2>
        <p data-status={sampleStatus}>{sampleMessage}</p>
      </section>
    </aside>
  )
}

function SettingsSide() {
  return (
    <aside className="fretboard-side">
      <section className="fretboard-panel">
        <h2>设置说明</h2>
        <p>调弦、升降号和显示模式会保存到本地浏览器。指板地图会固定显示全部音名，测验和今日练习会跟随显示模式。</p>
      </section>
    </aside>
  )
}

const GuitarFretboardTrainerPage = () => {
  useDocumentTitle('指板音训练 | Gleamory 微光集')
  const initialState = useMemo(() => loadFretboardState(), [])
  const [activeTab, setActiveTab] = useState<TrainerTab>('今日练习')
  const [settings, setSettings] = useState(initialState.settings)
  const [sessions, setSessions] = useState(initialState.sessions)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [selectedPositions, setSelectedPositions] = useState<FretPosition[]>([])
  const [answer, setAnswer] = useState<QuizAnswer | null>(null)
  const { status: sampleStatus, message: sampleMessage, playPosition } = useGuitarSampleAudio()

  const fretboard = useMemo(
    () => generateFretboard({ tuning: settings.tuning, fretCount: settings.fretCount, accidental: settings.accidental }),
    [settings],
  )
  const currentQuestion = useMemo(() => makeFindNoteQuestion(fretboard, 'C', { minFret: 0, maxFret: Math.min(12, settings.fretCount) }), [fretboard, settings.fretCount])
  const latestSummary = useMemo(() => {
    if (answer) return summarizePractice([{ question: currentQuestion, answer }])
    return sessions[0] ?? { totalQuestions: 0, correctQuestions: 0, accuracy: 0, averageResponseMs: 0, weakNotes: [] }
  }, [answer, currentQuestion, sessions])

  const persistSettings = (nextSettings: typeof settings, nextSessions = sessions) => {
    saveFretboardState({ settings: nextSettings, sessions: nextSessions, skillStates: initialState.skillStates })
  }

  const updateSettings = (nextSettings: typeof settings) => {
    setSettings(nextSettings)
    setAnswer(null)
    setSelectedKeys(new Set())
    setSelectedPositions([])
    persistSettings(nextSettings)
  }

  const handleTuningChange = (id: TuningPreset['id']) => {
    if (id === 'custom') return
    updateSettings({ ...settings, tuning: getTuningPreset(id) })
  }

  const handlePositionToggle = (position: FretPosition) => {
    void playPosition(position)
    setAnswer(null)
    const key = getPositionKey(position)
    setSelectedKeys((previous) => {
      const next = new Set(previous)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
    setSelectedPositions((previous) => {
      if (previous.some((candidate) => getPositionKey(candidate) === key)) {
        return previous.filter((candidate) => getPositionKey(candidate) !== key)
      }
      return [...previous, position]
    })
  }

  const handleSubmit = () => {
    const nextAnswer = judgeQuizAnswer(currentQuestion, selectedPositions, 1420)
    const nextSession = sessionFromResult(currentQuestion, nextAnswer)
    const nextSessions = [nextSession, ...sessions].slice(0, 1000)
    setAnswer(nextAnswer)
    setSessions(nextSessions)
    saveFretboardState({ settings, sessions: nextSessions, skillStates: initialState.skillStates })
  }

  const handleReset = () => {
    setAnswer(null)
    setSelectedKeys(new Set())
    setSelectedPositions([])
  }

  const selectedPosition = selectedPositions.length > 0 ? selectedPositions[selectedPositions.length - 1] : null
  const renderFretboard = (mode: FretboardMode, answerState: QuizAnswer | null, targetNote?: string) => (
    <Fretboard
      strings={fretboard.strings.map((string) => string.stringNumber)}
      frets={fretboard.frets}
      positions={fretboard.positions}
      selectedKeys={selectedKeys}
      answer={answerState}
      mode={mode}
      targetNote={targetNote}
      onTogglePosition={handlePositionToggle}
    />
  )

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
          <div className="fretboard-tabs" role="tablist" aria-label="指板音训练视图">
            {tabs.map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>

          <div className="fretboard-toolbar">
            <div className="fretboard-current">
              <span>{settings.tuning.name}</span>
              <span>{settings.mode === 'hidden' ? '隐藏答案' : '显示音名'}</span>
            </div>
            <div className="fretboard-toolbar-actions">
              <button type="button" className="fretboard-button primary" onClick={() => setActiveTab('测验')}>
                <Play size={16} aria-hidden="true" />
                开始 5 分钟练习
              </button>
              <button type="button" className="fretboard-button secondary" onClick={() => setActiveTab('指板地图')}>
                <Eye size={16} aria-hidden="true" />
                自由查看指板
              </button>
              <button type="button" className="fretboard-icon-button" aria-label="打开设置" onClick={() => setActiveTab('设置')}>
                <Settings size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="fretboard-body">
            <div className="fretboard-main">
              {activeTab === '今日练习' && (
                <div className="fretboard-stack">
                  <DailyPracticePanel summary={latestSummary} onStart={() => setActiveTab('测验')} />
                  <QuizPanel question={currentQuestion} selectedCount={selectedPositions.length} onSubmit={handleSubmit} onReset={handleReset} />
                  {renderFretboard(settings.mode, answer, 'C')}
                </div>
              )}

              {activeTab === '指板地图' && (
                <div className="fretboard-stack">
                  <ViewIntro
                    eyebrow="自由查看指板"
                    title="点位置、听音色、认清同音分布"
                    body="这里不计分也不提交答案，适合慢慢查看同一个音在不同弦上的位置。"
                    badges={[settings.tuning.name, '全部音名', `0-${settings.fretCount} 品`]}
                  />
                  {renderFretboard('all', null)}
                </div>
              )}

              {activeTab === '测验' && (
                <div className="fretboard-stack">
                  <ViewIntro
                    eyebrow="测验模式"
                    title="提交后立即查看遗漏和误选"
                    body="当前版本先固定一题：找出 0 到 12 品内所有 C。后续会扩展题库、计时和错题复习。"
                    badges={['计入练习记录', settings.mode === 'hidden' ? '隐藏答案' : '显示提示']}
                  />
                  <QuizPanel question={currentQuestion} selectedCount={selectedPositions.length} onSubmit={handleSubmit} onReset={handleReset} />
                  {renderFretboard(settings.mode, answer, 'C')}
                </div>
              )}

              {activeTab === '记录' && <PracticeRecordsPanel sessions={sessions} summary={latestSummary} />}

              {activeTab === '设置' && (
                <div className="fretboard-stack">
                  <ViewIntro
                    eyebrow="训练设置"
                    title="控制调弦、记谱和显示方式"
                    body="这些设置会影响今日练习和测验；指板地图始终显示全部音名，便于查阅。"
                    badges={[settings.tuning.name, settings.accidental === 'sharp' ? '升号优先' : '降号优先']}
                  />
                  <TuningSettings
                    tuningId={settings.tuning.id}
                    accidental={settings.accidental}
                    mode={settings.mode}
                    onTuningChange={handleTuningChange}
                    onAccidentalChange={(accidental: AccidentalPreference) => updateSettings({ ...settings, accidental })}
                    onModeChange={(mode: FretboardMode) => updateSettings({ ...settings, mode })}
                  />
                  {renderFretboard(settings.mode, null, 'C')}
                </div>
              )}
            </div>

            {activeTab === '指板地图' ? (
              <MapExplorerSide selectedPosition={selectedPosition} sampleStatus={sampleStatus} sampleMessage={sampleMessage} />
            ) : activeTab === '记录' ? (
              <RecordsSide summary={latestSummary} sampleStatus={sampleStatus} sampleMessage={sampleMessage} />
            ) : activeTab === '设置' ? (
              <SettingsSide />
            ) : (
              <PracticeSummary summary={latestSummary} answer={answer} sampleStatus={sampleStatus} sampleMessage={sampleMessage} />
            )}
          </div>
        </section>
      </main>

      <BackFooter />
    </div>
  )
}

export default GuitarFretboardTrainerPage
