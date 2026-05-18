import { motion } from 'framer-motion'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
  index: number
  variant: 'featured' | 'secondary'
}

const ProjectCard = ({ project, index, variant }: ProjectCardProps) => {
  const isFeatured = variant === 'featured'
  const hasUrl = project.url && project.url.length > 0

  const inner = (
    <>
      {/* Top accent line */}
      <div style={{ height: '1px', background: 'var(--accent-pink)', width: '48px' }} />

      {/* Cover image */}
      {project.cover ? (
        isFeatured ? (
          <div style={{ minHeight: '400px' }}>
            <img
              src={project.cover}
              alt=""
              className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              style={{ minHeight: '400px' }}
              loading={index < 2 ? 'eager' : 'lazy'}
            />
          </div>
        ) : (
          <div className="px-6 sm:px-8 pt-6 sm:pt-8">
            <div className="bg-white p-1 shadow-sm">
              <img
                src={project.cover}
                alt=""
                className="w-full object-cover rounded-[1px] transition-transform duration-500 group-hover:scale-[1.01]"
                style={{ aspectRatio: '16/9' }}
                loading={index < 2 ? 'eager' : 'lazy'}
              />
            </div>
          </div>
        )
      ) : (
        <div
          className={isFeatured ? 'mx-0' : 'mx-6 sm:mx-8 mt-6 sm:mt-8'}
          style={{ aspectRatio: '16/9', background: 'var(--bg-elevated)' }}
        />
      )}

      {/* Text area */}
      <div className="px-6 sm:px-8 py-6 sm:py-8">
        <h2
          className="font-display mb-3 tracking-wide"
          style={{
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontSize: isFeatured ? 'clamp(1.75rem, 4vw, 2.5rem)' : 'clamp(1.5rem, 3vw, 2rem)',
          }}
        >
          {project.name}
        </h2>

        <p
          className="text-sm leading-relaxed mb-5 max-w-xl"
          style={{ color: 'var(--text-secondary)' }}
        >
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2 items-center mb-3">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="text-[0.65rem] px-3 py-1 rounded-full"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border-line)' }}
            >
              {tag}
            </span>
          ))}
          {project.status && (
            <span
              className="text-[0.65rem] px-3 py-1 rounded-full"
              style={{ color: 'var(--accent-pink)', border: '1px solid var(--accent-pink)' }}
            >
              {project.status}
            </span>
          )}
        </div>

        <div className="flex gap-4">
          {project.version && (
            <span
              className="text-[0.6rem] uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              {project.version}
            </span>
          )}
          {project.updatedAt && project.updatedAt !== '-' && (
            <span
              className="text-[0.6rem] uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              {project.updatedAt}
            </span>
          )}
        </div>
      </div>
    </>
  )

  const motionProps = {
    className: 'group block rounded-sm transition-all duration-300',
    style: { background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' },
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay: index * 0.12, ease: [0.25, 0.1, 0.25, 1] as const },
    whileHover: { y: -2, boxShadow: 'var(--shadow-card-hover)' },
  }

  if (hasUrl) {
    return (
      <motion.a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        {...motionProps}
      >
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
