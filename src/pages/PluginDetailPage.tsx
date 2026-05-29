import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from '@/components/SiteHeader'
import { ProjectPageHeader } from '@/components/ProjectPageHeader'

// ════════════════════════════════════════════════════════════
// Plugin Detail Page — 可复用的插件详情页模板
// 传入插件配置数据，渲染统一的详情页布局
// ════════════════════════════════════════════════════════════

/** 特性项 */
export interface PluginFeature {
  icon: string          // Lucide 图标名（不含 Lucide prefix）
  label: string
  description: string
}

/** 截图项 */
export interface PluginScreenshot {
  src: string
  alt: string
  caption?: string
}

/** 插件配置 */
export interface PluginConfig {
  name: string
  englishName: string
  description: string
  version: string
  features: PluginFeature[]
  screenshots?: PluginScreenshot[]
  usage?: {
    install: string[]
    usage: string[]
  }
  download?: {
    url: string
    label?: string
  }
  github?: string
  note?: string
  accentColor?: string
}

// ── Bento 风格特性卡片 ── //
interface FeatureCardProps {
  icon: string
  label: string
  description: string
  accentColor: string
}

const FeatureCard = ({ icon, label, description, accentColor }: FeatureCardProps) => (
  <div
    className="relative flex flex-col gap-3 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
    style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-line)',
    }}
  >
    <div
      className="flex items-center justify-center w-10 h-10 rounded-xl"
      style={{ background: `${accentColor}18` }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <LucideIcon name={icon} />
      </svg>
    </div>
    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
      {label}
    </span>
    <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {description}
    </span>
  </div>
)

// ──截图展示 ── //
interface ScreenshotShowcaseProps {
 screenshots: PluginScreenshot[]
 accentColor: string
}

const ScreenshotShowcase = ({ screenshots, accentColor }: ScreenshotShowcaseProps) => {
 const [activeIndex, setActiveIndex] = useState(0)
 const [isLightboxOpen, setIsLightboxOpen] = useState(false)

 if (!screenshots || screenshots.length ===0) return null

 const hasMultiple = screenshots.length >1
 const current = screenshots[activeIndex]

 const goPrev = (e?: React.MouseEvent) => {
 e?.stopPropagation()
 setActiveIndex((i) => (i -1 + screenshots.length) % screenshots.length)
 }
 const goNext = (e?: React.MouseEvent) => {
 e?.stopPropagation()
 setActiveIndex((i) => (i +1) % screenshots.length)
 }

return (
    <div className="flex flex-col gap-4">
      {/* 主图区 */}
      <div
        className="relative overflow-hidden rounded-2xl cursor-zoom-in group"
        style={{
          border: '0.5px solid var(--border-line)',
          background: 'var(--bg-card)',
        }}
        onClick={() => setIsLightboxOpen(true)}
      >
        <div
          className="flex items-center justify-center p-4 sm:p-6"
          style={{ minHeight: 240 }}
        >
          <img
            src={current.src}
            alt={current.alt}
            width={880}
            height={528}
            className="max-w-full max-h-[480px] object-contain transition-opacity duration-200 group-hover:opacity-95"
            draggable={false}
          />
        </div>

        {/*计数器 */}
        {hasMultiple && (
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-md pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {activeIndex + 1} / {screenshots.length}
          </div>
        )}

        {/*悬停放大提示 */}
        <div
          className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-1.5"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          点击放大
        </div>

        {/* caption（图片下方） */}
        {current.caption && (
          <div className="px-4 pb-3 -mt-1 text-center">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {current.caption}
            </span>
          </div>
        )}
      </div>

      {/*缩略图导航 */}
      {hasMultiple && (
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            aria-label="上一张"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:opacity-80 cursor-pointer"
            style={{
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-line)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--text-secondary)' }}>
              <LucideIcon name="chevron-left" />
            </svg>
          </button>

          {/* 可滚动缩略图区域 + 右侧渐变遮罩 */}
          <div className="relative flex-1 min-w-0">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {screenshots.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`查看第 ${i + 1} 张`}
                  className="shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={{
                    border: `2px solid ${i === activeIndex ? accentColor : 'var(--border-line)'}`,
                    opacity: i === activeIndex ? 1 : 0.55,
                    // @ts-ignore CSS custom property for focus ring color
                    '--tw-ring-color': accentColor,
                  }}
                >
                  <img src={s.src} alt={s.alt} width={160} height={112} className="w-full h-full object-cover" draggable={false} />
                </button>
              ))}
            </div>
            {/* 右侧渐变遮罩，提示可滚动 */}
            <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[var(--bg-page)] to-transparent pointer-events-none z-10" aria-hidden="true" />
          </div>

          <button
            onClick={goNext}
            aria-label="下一张"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:opacity-80 cursor-pointer"
            style={{
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-line)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--text-secondary)' }}>
              <LucideIcon name="chevron-right" />
            </svg>
          </button>
        </div>
      )}

      {/* Lightbox 全屏放大 */}
      {isLightboxOpen && (
        <Lightbox
          screenshots={screenshots}
          index={activeIndex}
          onClose={() => setIsLightboxOpen(false)}
          onNavigate={(i) => setActiveIndex(i)}
        />
      )}
    </div>
  )
}

// ── Lightbox 全屏放大组件 ── //
interface LightboxProps {
 screenshots: PluginScreenshot[]
 index: number
 onClose: () => void
 onNavigate: (index: number) => void
}

const Lightbox = ({ screenshots, index, onClose, onNavigate }: LightboxProps) => {
 const current = screenshots[index]
 const hasMultiple = screenshots.length >1

 //键盘事件
 useEffect(() => {
 const handler = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose()
 else if (e.key === 'ArrowLeft' && hasMultiple) {
 onNavigate((index -1 + screenshots.length) % screenshots.length)
 } else if (e.key === 'ArrowRight' && hasMultiple) {
 onNavigate((index +1) % screenshots.length)
 }
 }
 window.addEventListener('keydown', handler)
 return () => window.removeEventListener('keydown', handler)
 }, [index, screenshots.length, hasMultiple, onClose, onNavigate])

 //锁定背景滚动
 useEffect(() => {
 const prev = document.body.style.overflow
 document.body.style.overflow = 'hidden'
 return () => {
 document.body.style.overflow = prev
 }
 }, [])

 const handlePrev = (e: React.MouseEvent) => {
 e.stopPropagation()
 onNavigate((index -1 + screenshots.length) % screenshots.length)
 }
 const handleNext = (e: React.MouseEvent) => {
 e.stopPropagation()
 onNavigate((index +1) % screenshots.length)
 }

 return (
 <div
 className="fixed inset-0 z-[100] flex items-center justify-center cursor-zoom-out animate-[fadeIn_0.15s_ease-out]"
 style={{ background: 'rgba(0,0,0,0.92)' }}
 onClick={onClose}
 role="dialog"
 aria-modal="true"
 aria-label="图片预览（按 ESC 键关闭，方向键切换）"
 >
 {/*关闭按钮 */}
 <button
 onClick={onClose}
 aria-label="关闭"
 className="absolute top-4 right-4 sm:top-5 sm:right-5 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-150 hover:scale-110 cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
 style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
 >
 <svg width="18" height="18" viewBox="002424" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 <LucideIcon name="x" />
 </svg>
 </button>

 {/*上一张 */}
 {hasMultiple && (
 <button
 onClick={handlePrev}
 aria-label="上一张"
 className="absolute left-3 sm:left-8 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-150 hover:scale-110 cursor-pointer"
 style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
 >
 <svg width="20" height="20" viewBox="002424" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 <LucideIcon name="chevron-left" />
 </svg>
 </button>
 )}

 {/* 大图（按真实比例） */}
 <img
 src={current.src}
 alt={current.alt}
 className="max-w-[90vw] max-h-[85vh] object-contain cursor-default select-none"
 draggable={false}
 onClick={(e) => e.stopPropagation()}
 />

 {/*下一张 */}
 {hasMultiple && (
 <button
 onClick={handleNext}
 aria-label="下一张"
 className="absolute right-3 sm:right-8 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-150 hover:scale-110 cursor-pointer"
 style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
 >
 <svg width="20" height="20" viewBox="002424" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 <LucideIcon name="chevron-right" />
 </svg>
 </button>
 )}

 {/*底部信息条 */}
 <div
 className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full backdrop-blur-md text-xs font-medium pointer-events-none flex items-center gap-2 whitespace-nowrap"
 style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
 >
 {current.caption && <span>{current.caption}</span>}
 {hasMultiple && (
 <span style={{ opacity:0.7 }}>
 · {index +1} / {screenshots.length}
 </span>
 )}
 <span style={{ opacity:0.5 }}>· ESC关闭</span>
 </div>
 </div>
 )
}

// ── 步骤列表 ── //
interface StepListProps {
  steps: string[]
  accentColor: string
}

const StepList = ({ steps, accentColor }: StepListProps) => (
  <ol className="flex flex-col gap-3">
    {steps.map((step, i) => (
      <li key={i} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <span
          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-0.5"
          style={{ background: accentColor, color: '#fff' }}
        >
          {i + 1}
        </span>
        <span className="pt-0.5" dangerouslySetInnerHTML={{ __html: step }} />
      </li>
    ))}
  </ol>
)

// ── Lucide 图标映射（内联 SVG） ── //
const LucideIcon = ({ name }: { name: string }): React.ReactNode => {
  const icons: Record<string, React.ReactElement> = {
    'download': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    'link': <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    'image': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    'zap': <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    'music': <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    'globe': <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    'check-circle': <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    'eye': <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    'copy': <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    'settings': <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    'smartphone': <><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
    'feather': <><path d="M20.2412.24a66000-8.49-8.49L510.5V19h8.5l6.74-6.76z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></>,
'chevron-left': <polyline points="15 18 9 12 15 6" />,
    'chevron-right': <polyline points="9 6 15 12 9 18" />,
 'x': <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
 }
 return icons[name] || <circle cx="12" cy="12" r="10" />
}

// ── 主组件 ── //
interface PluginDetailPageProps {
  config: PluginConfig
}

const PluginDetailPage = ({ config }: PluginDetailPageProps) => {
  const {
    name,
    englishName,
    description,
    version,
    features = [],
    screenshots = [],
    usage,
    download,
    github,
    note,
    accentColor = '#e03050',
  } = config

  useEffect(() => {
    document.title = `${name} | Gleamory 微光集`
  }, [name])

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <main className="px-4 sm:px-[15%] pt-20 sm:pt-24 pb-36 sm:pb-24">

        {/* ── 标题区 ── */}
        <ProjectPageHeader
          name={name}
          englishName={englishName}
          description={description}
          version={version}
        />

        {/* ── 下载 & 仓库（置顶） ── */}
        {(download?.url || github) && (
          <section className="mb-8">
            <div className="flex flex-wrap items-center gap-3">
              {download?.url && (
                <a
                  href={download.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-85 cursor-pointer"
                  style={{ background: accentColor, color: '#fff' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <LucideIcon name="download" />
                  </svg>
                  {download.label || '立即下载'}
                </a>
              )}
              {github && (
                <a
                  href={github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80 cursor-pointer"
                  style={{
                    background: 'var(--bg-page)',
                    color: 'var(--text-secondary)',
                    border: '0.5px solid var(--border-line)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub 仓库
                </a>
              )}
              {note && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {note}
                </span>
              )}
            </div>
          </section>
        )}

        {/* ── 特性网格（Bento 风格） ── */}
        {features.length > 0 && (
          <section className="mb-8">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                maxWidth: '4xl',
              }}
            >
              {features.map((f, i) => (
                <FeatureCard
                  key={i}
                  icon={f.icon}
                  label={f.label}
                  description={f.description}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 截图展示 ── */}
        {screenshots.length > 0 && (
          <section className="mb-8">
            <h2
              className="text-sm font-medium tracking-wide mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              截图预览
            </h2>
            <ScreenshotShowcase
              screenshots={screenshots}
              accentColor={accentColor}
            />
          </section>
        )}

        {/* ── 使用说明 ── */}
        {(usage?.install?.length || usage?.usage?.length) && (
          <section className="mb-8">
            <div
              className="rounded-2xl px-6 py-6 sm:px-8 sm:py-7"
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-line)',
              }}
            >
              <h2
                className="text-sm font-medium tracking-wide mb-5"
                style={{ color: 'var(--text-primary)' }}
              >
                如何使用
              </h2>

              <div className="flex flex-col gap-6">
                {usage?.install?.length && (
                  <div className="flex flex-col gap-3">
                    <h3
                      className="text-xs font-medium tracking-wide"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      安装
                    </h3>
                    <StepList steps={usage.install} accentColor={accentColor} />
                  </div>
                )}
                {usage?.usage?.length && (
                  <div className="flex flex-col gap-3">
                    <h3
                      className="text-xs font-medium tracking-wide"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      使用
                    </h3>
                    <StepList steps={usage.usage} accentColor={accentColor} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 固定底部返回链接 */}
      <footer
        className="fixed bottom-0 left-0 right-0 flex justify-center py-4 z-40"
        style={{
          background: 'var(--bg-page)',
          borderTop: '0.5px solid var(--border-line)',
        }}
      >
        <Link
          to="/"
          className="text-[0.6rem] uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          ← 返回首页
        </Link>
      </footer>
    </div>
  )
}

export default PluginDetailPage