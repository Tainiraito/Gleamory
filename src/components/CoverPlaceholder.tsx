import React from 'react'

/**
 * CoverPlaceholder - 无 cover 图时的统一占位
 * 用项目首字 + 渐变背景，避免空卡片视觉权重过低
 */

interface CoverPlaceholderProps {
  name: string
  /** 主题色 (Tailwind-like) — 用作渐变主色 */
  hue?: string
  /** 高度，覆盖父容器 */
  className?: string
}

// 4 种预设渐变，对应不同项目类型
const GRADIENTS: Array<{ bg: string; text: string }> = [
  // 暖粉 - 工具
  { bg: 'linear-gradient(135deg, rgba(247,131,172,0.25), rgba(247,131,172,0.05))', text: 'rgba(247,131,172,0.65)' },
  // 蓝紫 - 音乐
  { bg: 'linear-gradient(135deg, rgba(124,131,255,0.25), rgba(124,131,255,0.05))', text: 'rgba(124,131,255,0.7)' },
  // 翠绿 - 番剧
  { bg: 'linear-gradient(135deg, rgba(82,196,164,0.25), rgba(82,196,164,0.05))', text: 'rgba(82,196,164,0.7)' },
  // 琥珀 - 实用工具
  { bg: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.05))', text: 'rgba(245,158,11,0.75)' },
]

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return Math.abs(h)
}

export const CoverPlaceholder: React.FC<CoverPlaceholderProps> = ({ name, className }) => {
  const idx = hash(name) % GRADIENTS.length
  const g = GRADIENTS[idx]
  // 取第一个字（中文）或前两个字母
  const initial = name.match(/[\u4e00-\u9fa5]/)
    ? name.match(/[\u4e00-\u9fa5]/)![0]
    : name.slice(0, 2)

  return (
    <div
      className={className}
      style={{
        background: g.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 装饰网格 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, ${g.text} 1px, transparent 0)`,
          backgroundSize: '24px 24px',
          opacity: 0.25,
        }}
      />
      <span
        style={{
          fontSize: '4.5rem',
          fontWeight: 600,
          color: g.text,
          fontFamily: 'var(--font-display, inherit)',
          letterSpacing: '-0.02em',
          textShadow: '0 4px 24px rgba(0,0,0,0.1)',
          userSelect: 'none',
        }}
      >
        {initial}
      </span>
    </div>
  )
}

export default CoverPlaceholder
