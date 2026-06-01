import React from 'react'

/**
 * InlineStep - 安全的步骤渲染组件
 * 替代 dangerouslySetInnerHTML，避免 XSS 风险
 *
 * 用法：
 *   <InlineStep text="打开 https://www.pixiv.net/" />
 *   <InlineStep text="访问 <link>https://example.com</link> 了解更多" />
 *
 * 支持的 token：
 *   - 裸 URL：自动转为可点击链接（带 rel="noopener noreferrer" target="_blank"）
 *   - <link>URL</link>：同上
 *   - <code>xxx</code>：行内代码样式
 *   - 其它 HTML 字符会被转义
 */
interface InlineStepProps {
  text: string
  className?: string
}

const URL_REGEX = /(https?:\/\/[^\s<]+)/g
const LINK_TOKEN = /<link>(.*?)<\/link>/gi
const CODE_TOKEN = /<code>(.*?)<\/code>/gi

export const InlineStep: React.FC<InlineStepProps> = ({ text, className }) => {
  // 解析顺序：先 link token，再 code token，最后裸 URL
  // 用段切分实现，避免 token 互相干扰
  const segments: Array<{ type: 'text' | 'link' | 'code'; value: string }> = []

  // 1. 提取 <link>...</link>
  let m: RegExpExecArray | null
  const linkPattern = new RegExp(LINK_TOKEN.source, 'gi')
  const codePattern = new RegExp(CODE_TOKEN.source, 'gi')

  // 用一个合并的扫描器：先扫 link，再扫 code，再扫裸 URL
  // 简单起见，分三步处理：先 link，再 code，最后剩余文本里的裸 URL
  const workingText = text

  // 第一步：link tokens
  const linkMatches: Array<{ start: number; end: number; url: string }> = []
  while ((m = linkPattern.exec(workingText)) !== null) {
    linkMatches.push({ start: m.index, end: m.index + m[0].length, url: m[1] })
  }

  // 第二步：code tokens（跟 link 不重叠）
  const codeMatches: Array<{ start: number; end: number; code: string }> = []
  const codeOnlyPattern = new RegExp(codePattern.source, 'gi')
  while ((m = codeOnlyPattern.exec(workingText)) !== null) {
    const overlaps = linkMatches.some(
      (l) => !(m!.index + m![0].length <= l.start || m!.index >= l.end)
    )
    if (!overlaps) {
      codeMatches.push({ start: m.index, end: m.index + m[0].length, code: m[1] })
    }
  }

  // 合并所有 token 按 start 排序
  const allTokens = [
    ...linkMatches.map((t) => ({ ...t, kind: 'link' as const })),
    ...codeMatches.map((t) => ({ ...t, kind: 'code' as const })),
  ].sort((a, b) => a.start - b.start)

  // 切割
  let cursor = 0
  for (const token of allTokens) {
    if (token.start > cursor) {
      segments.push({ type: 'text', value: workingText.slice(cursor, token.start) })
    }
    segments.push({
      type: token.kind,
      value: token.kind === 'link' ? token.url : token.code,
    })
    cursor = token.end
  }
  if (cursor < workingText.length) {
    segments.push({ type: 'text', value: workingText.slice(cursor) })
  }

  // 文本段里再扫裸 URL
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'link') {
          return (
            <a
              key={i}
              href={seg.value}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-amber)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                fontWeight: 500,
              }}
            >
              {seg.value.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )
        }
        if (seg.type === 'code') {
          return (
            <code
              key={i}
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '0.85em',
                padding: '1px 5px',
                borderRadius: 4,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '0.5px solid var(--border-line)',
              }}
            >
              {seg.value}
            </code>
          )
        }
        // text: 扫描裸 URL
        const parts = seg.value.split(URL_REGEX)
        return parts.map((part, j) => {
          if (URL_REGEX.test(part)) {
            URL_REGEX.lastIndex = 0
            return (
              <a
                key={`${i}-${j}`}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--accent-amber)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  fontWeight: 500,
                }}
              >
                {part.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )
          }
          URL_REGEX.lastIndex = 0
          return <React.Fragment key={`${i}-${j}`}>{part}</React.Fragment>
        })
      })}
    </span>
  )
}

export default InlineStep
