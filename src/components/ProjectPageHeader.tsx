import { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface ProjectPageHeaderProps {
  name: string
  englishName: string
  description: string
  version?: string
  children?: ReactNode
}

export function ProjectPageHeader({ name, englishName, description, version, children }: ProjectPageHeaderProps) {
  const shouldAnimate = !useReducedMotion()

  const stagger = shouldAnimate
    ? {
        initial: { opacity: 0, y: -6 },
        animate: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: 'easeOut' as const, delay: i * 0.1 },
        }),
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      }

  return (
    <div className="mb-10 text-center">
      {/* ① 装饰线 — 对称排列 */}
      <motion.div
        className="flex items-center justify-center gap-2 mb-5"
        variants={{ initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.3 } } }}
        initial="initial"
        animate="animate"
      >
        <span className="w-16 h-px" style={{ background: 'var(--border-line)' }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-amber)' }} />
        <span className="w-16 h-px" style={{ background: 'var(--border-line)' }} />
      </motion.div>

      {/* ② 中文正标题 */}
      <motion.h1
        className="mb-3 font-display text-4xl font-semibold leading-tight sm:text-5xl"
        style={{ color: 'var(--text-primary)' }}
        custom={0}
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {name}
      </motion.h1>

      {/* ③ 英文副标题 */}
      <motion.div
        className="mb-4"
        custom={1}
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        <span
          className="text-xs uppercase tracking-[0.25em] font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {englishName}
        </span>
      </motion.div>

      {/* ④ 简介 — 通过色阶与留白保持题记感，避免中文合成斜体 */}
      <motion.p
        className="mx-auto mt-5 max-w-[48ch] border-l pl-4 text-left text-base leading-7"
        style={{ color: 'var(--text-secondary)' }}
        custom={2}
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {description}
      </motion.p>

      {/* ⑤ 版本号 — 下沉到简介下方，低调的元信息 */}
      {version && (
        <motion.p
          className="mt-3 font-mono text-xs leading-[1.125rem] tracking-[0.04em]"
          style={{ color: 'var(--text-secondary)', opacity: 0.78 }}
          custom={2.5}
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          ⟐ v{version}
        </motion.p>
      )}

      {/* ⑥ 底部分割线 — 缩短到半宽，呼吸感 */}
      <motion.div
        className="mt-8 w-1/2 mx-auto h-px"
        style={{ transformOrigin: 'left', background: 'var(--border-line)' }}
        initial={shouldAnimate ? { opacity: 0, scaleX: 0 } : { opacity: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: shouldAnimate ? 0.5 : 0, ease: 'easeOut' as const, delay: shouldAnimate ? 0.35 : 0 }}
      />

      {/* Extra controls */}
      {children}
    </div>
  )
}
