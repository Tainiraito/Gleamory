import { ReactNode } from 'react'

interface ProjectPageHeaderProps {
  name: string
  englishName: string
  description: string
  version?: string
  children?: ReactNode
}

export function ProjectPageHeader({ name, englishName, description, version, children }: ProjectPageHeaderProps) {
  return (
    <div className="mb-10">
      {/* Decorative accent line */}
      <div className="flex items-center gap-2 mb-5">
        <span className="w-8 h-0.5 rounded-full" style={{ background: 'var(--accent-amber)' }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-amber)' }} />
        <span className="w-16 h-px" style={{ background: 'var(--border-line)' }} />
      </div>

      {/* Title */}
      <h1
        className="font-display text-5xl sm:text-6xl tracking-tight mb-3 leading-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {name}
      </h1>

      {/* English subtitle + version */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-xs uppercase tracking-[0.25em] font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          {englishName}
        </span>
        {version && (
          <span
            className="text-xs font-mono px-2.5 py-0.5 rounded-full"
            style={{
              color: 'var(--accent-amber)',
              border: '0.5px solid var(--accent-amber)',
              background: 'var(--accent-glow)',
            }}
          >
            v{version}
          </span>
        )}
      </div>

      {/* Description */}
      <p
        className="text-sm leading-relaxed max-w-xl"
        style={{ color: 'var(--text-muted)' }}
      >
        {description}
      </p>

      {/* Divider */}
      <div className="mt-8 w-full h-px" style={{ background: 'var(--border-line)' }} />

      {/* Extra controls */}
      {children}
    </div>
  )
}
