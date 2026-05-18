import { motion } from 'framer-motion'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
  index: number
  variant: 'featured' | 'secondary' | 'list'
}

const ProjectCard = ({ project, index, variant }: ProjectCardProps) => {
  const isFeatured = variant === 'featured'
  const isList = variant === 'list'
  const hasUrl = project.url && project.url.length > 0

  const titleClass = isFeatured
    ? 'font-display text-3xl sm:text-4xl font-semibold'
    : isList
      ? 'font-display text-xl'
      : 'font-display text-2xl sm:text-3xl font-semibold'

  const textPadding = isFeatured
    ? 'px-10 sm:px-12 py-10 sm:py-12'
    : isList
      ? 'px-6 sm:px-8 py-6 sm:py-8'
      : 'px-8 sm:px-10 py-8 sm:py-10'

  const delay = isFeatured ? index * 0.12 : index * 0.08

  const inner = (
    <div className="flex flex-col h-full">
      {/* Cover image — flush with card edge */}
      {project.cover ? (
        <div className="overflow-hidden">
          <img
            src={project.cover}
            alt=""
            className={`w-full object-cover transition-transform duration-700 ${
              isFeatured
                ? 'min-h-[360px] group-hover:scale-[1.02]'
                : 'aspect-[16/9]'
            }`}
            loading={index < 2 ? 'eager' : 'lazy'}
          />
        </div>
      ) : !isList ? (
        <div className={isFeatured ? 'pt-12' : 'pt-8'} />
      ) : null}

      {/* Text area */}
      <div className={`flex flex-col justify-center flex-1 ${textPadding}`}>
        {/* Title */}
        <h2
          className={`${titleClass} mb-2 tracking-wide`}
          style={{ color: 'var(--text-primary)' }}
        >
          {project.name}
        </h2>

        {/* Divider */}
        {!isList && (
          <div className="mb-4" style={{ height: '0.5px', width: '40%', background: 'var(--border-line)' }} />
        )}

        {/* Description */}
        <p
          className={`text-sm leading-relaxed mb-5 ${isFeatured ? 'max-w-xl' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          {project.description}
        </p>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {project.tags.map((tag, i) => {
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

        {/* Version + UpdatedAt */}
        {(project.version || (project.updatedAt && project.updatedAt !== '-')) && (
          <div className="flex gap-4">
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
    </div>
  )

  const motionProps = {
    className: 'group block h-full',
    style: {
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-line)',
      transition: 'box-shadow 0.4s ease-out',
    },
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay },
    whileHover: { y: -2, boxShadow: '0 0 20px rgba(247, 131, 172, 0.1)' },
  }

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
