import { motion, useReducedMotion } from 'framer-motion'

import type { Project } from '@/types'
import { getStatusStyle } from '@/utils/statusStyle'

interface ProjectCardProps {
  project: Project
  index: number
}

const ProjectCard = ({ project, index }: ProjectCardProps) => {
  const hasUrl = project.url && project.url.length > 0
  const shouldReduceMotion = useReducedMotion()

  const content = (
    <div className="flex h-full flex-col p-5 sm:p-6">
      <h3
        className="mb-1 font-display text-lg font-semibold sm:text-xl"
        style={{ color: 'var(--text-primary)' }}
      >
        {project.name}
      </h3>
      <p
        className="mb-2.5 text-[0.82rem] leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {project.description}
      </p>
      {(project.tags?.length > 0 || project.status) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {project.tags?.map((tag) => (
            <span
              key={tag}
              className="select-none px-2 py-0.5 text-[0.65rem]"
              style={{
                color: 'var(--text-muted)',
                border: '0.5px solid rgba(44,42,48,0.12)',
                background: 'transparent',
              }}
            >
              {tag}
            </span>
          ))}
          {project.status &&
            (() => {
              const statusStyle = getStatusStyle(project.status)
              return (
                <span
                  key="status"
                  className="select-none px-2 py-0.5 text-[0.65rem] font-medium"
                  style={{
                    color: statusStyle.color,
                    border: `0.5px solid ${statusStyle.border}`,
                    background: statusStyle.background,
                  }}
                >
                  {project.status}
                </span>
              )
            })()}
        </div>
      )}
      {(project.version || (project.updatedAt && project.updatedAt !== '-')) && (
        <div className="mt-auto flex gap-3">
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
      )}
    </div>
  )

  const motionProps = {
    className: 'group block h-full',
    style: {
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-line)',
    },
    initial: shouldReduceMotion ? false : { opacity: 0, y: 16 },
    whileInView: shouldReduceMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay: index * 0.08 },
    whileHover: shouldReduceMotion
      ? undefined
      : {
          y: -3,
          boxShadow: '0 0 20px rgba(247, 131, 172, 0.1)',
          transition: { duration: 0.12 },
        },
  }

  if (hasUrl) {
    return (
      <motion.a href={project.url} target="_blank" rel="noopener noreferrer" {...motionProps}>
        {content}
      </motion.a>
    )
  }

  return <motion.div {...motionProps}>{content}</motion.div>
}

export default ProjectCard
