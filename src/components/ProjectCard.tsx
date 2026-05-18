import { motion } from 'framer-motion'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
  index: number
  variant: 'featured' | 'list'
}

const ProjectCard = ({ project, index, variant }: ProjectCardProps) => {
  const isFeatured = variant === 'featured'
  const hasUrl = project.url && project.url.length > 0

  // Featured: cover as background with overlay
  const featuredContent = (
    <div className="relative overflow-hidden h-full flex flex-col" style={{ minHeight: '360px' }}>
      {/* Cover as full background */}
      {project.cover ? (
        <div className="absolute inset-0">
          <img
            src={project.cover}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(12,10,18,0.75) 0%, rgba(12,10,18,0.45) 50%, rgba(12,10,18,0.2) 100%)'
          }} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(247,131,172,0.15), rgba(247,131,172,0.05))'
        }} />
      )}

      {/* Content on top */}
      <div className="relative z-10 p-8 sm:p-10 flex flex-col justify-between flex-1">
        {/* Top: Title + Description */}
        <div>
          <h2
            className="font-display text-3xl sm:text-4xl font-semibold mb-3 leading-tight"
            style={{ color: '#f0ece4' }}
          >
            {project.name}
          </h2>
          <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'rgba(240,236,228,0.8)' }}>
            {project.description}
          </p>
        </div>

        {/* Bottom: Tags + Meta */}
        <div className="space-y-4">
          {(project.tags?.length > 0 || project.status) && (
            <div className="flex flex-wrap items-center gap-2">
              {project.tags?.map((tag) => (
                <span
                  key={tag}
                  className="text-[0.65rem] px-2.5 py-1"
                  style={{
                    color: 'rgba(240,236,228,0.85)',
                    border: '0.5px solid rgba(240,236,228,0.25)',
                    background: 'rgba(240,236,228,0.1)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {tag}
                </span>
              ))}
              {project.status && (
                <span
                  className="text-[0.65rem] px-2.5 py-1"
                  style={{
                    color: 'var(--accent-pink)',
                    border: '0.5px solid rgba(247,131,172,0.3)',
                    background: 'rgba(247,131,172,0.1)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {project.status}
                </span>
              )}
            </div>
          )}

          {(project.version || (project.updatedAt && project.updatedAt !== '-')) && (
            <div className="flex gap-4">
              {project.version && (
                <span className="text-[0.6rem] uppercase tracking-widest" style={{ color: 'rgba(240,236,228,0.5)' }}>
                  {project.version}
                </span>
              )}
              {project.updatedAt && project.updatedAt !== '-' && (
                <span className="text-[0.6rem] uppercase tracking-widest" style={{ color: 'rgba(240,236,228,0.5)' }}>
                  {project.updatedAt}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // List: simple card
  const listContent = (
    <div className="flex flex-col h-full p-6 sm:p-8">
      <h2
        className="font-display text-xl font-semibold mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {project.name}
      </h2>
      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
        {project.description}
      </p>
      {(project.tags?.length > 0 || project.status) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {project.tags?.map((tag, i) => {
            const rotation = i % 3 === 0 ? '-1deg' : i % 3 === 1 ? '1deg' : '0deg'
            return (
              <span
                key={tag}
                className="text-[0.65rem] px-2 py-0.5 select-none"
                style={{
                  color: 'var(--text-muted)',
                  border: '0.5px solid rgba(44,42,48,0.12)',
                  background: 'transparent',
                  transform: `rotate(${rotation})`,
                }}
              >
                {tag}
              </span>
            )
          })}
          {project.status && (
            <span
              className="text-[0.65rem] px-2 py-0.5 select-none"
              style={{
                color: 'var(--accent-pink)',
                border: '0.5px solid rgba(44,42,48,0.12)',
                background: 'transparent',
                transform: 'rotate(-1deg)',
              }}
            >
              {project.status}
            </span>
          )}
        </div>
      )}
      {(project.version || (project.updatedAt && project.updatedAt !== '-')) && (
        <div className="flex gap-4 mt-auto">
          {project.version && (
            <span className="text-[0.6rem] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {project.version}
            </span>
          )}
          {project.updatedAt && project.updatedAt !== '-' && (
            <span className="text-[0.6rem] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {project.updatedAt}
            </span>
          )}
        </div>
      )}
    </div>
  )

  const motionProps = {
    className: 'group block h-full',
    style: {
      background: isFeatured ? 'transparent' : 'var(--bg-card)',
      border: isFeatured ? 'none' : '0.5px solid var(--border-line)',
      minHeight: isFeatured ? '360px' : undefined,
    },
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay: isFeatured ? 0 : index * 0.08 },
    whileHover: isFeatured ? { y: -2 } : { y: -2, boxShadow: '0 0 20px rgba(247, 131, 172, 0.1)' },
  }

  const inner = isFeatured ? featuredContent : listContent

  if (hasUrl) {
    return (
      <motion.a href={project.url} target="_blank" rel="noopener noreferrer" {...motionProps}>
        {inner}
      </motion.a>
    )
  }

  return (
    <motion.div {...motionProps}>
      {inner}
    </motion.div>
  )
}

export default ProjectCard
