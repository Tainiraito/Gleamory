import { ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

import type { Project } from '@/types'
import { getStatusStyle } from '@/utils/statusStyle'

interface ProjectListItemProps {
  project: Project
}

const ProjectListItem = ({ project }: ProjectListItemProps) => {
  const hasUrl = Boolean(project.url)
  const isExternalUrl = /^https?:\/\//.test(project.url)
  const shouldReduceMotion = useReducedMotion()
  const statusStyle = project.status ? getStatusStyle(project.status) : null
  const metadata = [project.version, project.updatedAt !== '-' ? project.updatedAt : null].filter(
    Boolean,
  )

  const content = (
    <div className="grid min-h-[4.75rem] grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 py-4 sm:grid-cols-[9.5rem_minmax(0,1fr)_9rem] sm:items-center sm:gap-x-5 sm:py-[1.125rem] lg:grid-cols-[11rem_minmax(0,1fr)_12.5rem] xl:grid-cols-[13rem_minmax(0,1fr)_14rem]">
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-amber)] sm:text-xl">
          {project.name}
        </h3>
        {project.tags?.length > 0 && (
          <p
            className="mt-1 truncate text-xs tracking-[0.04em]"
            style={{ color: 'var(--text-muted)' }}
          >
            {project.tags.join(' · ')}
          </p>
        )}
      </div>

      <p
        className="col-span-2 min-w-0 text-[0.78rem] leading-relaxed sm:col-span-1 sm:line-clamp-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        {project.description}
      </p>

      <div className="col-start-1 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 sm:col-start-auto sm:flex-nowrap sm:justify-end">
        {project.status && statusStyle && (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium"
            style={{ color: statusStyle.color }}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ background: statusStyle.color }}
            />
            {project.status}
          </span>
        )}
        {metadata.length > 0 && (
          <span
            className="hidden whitespace-nowrap font-mono text-xs leading-[1.125rem] tracking-[0.04em] lg:inline"
            style={{ color: 'var(--text-muted)' }}
          >
            {metadata.join(' · ')}
          </span>
        )}
        {hasUrl && (
          <ArrowUpRight
            aria-hidden="true"
            className="ml-1 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ color: 'var(--text-muted)' }}
            strokeWidth={1.5}
          />
        )}
      </div>
    </div>
  )

  return (
    <motion.li
      className="group border-b px-1 last:border-b-0 sm:px-2"
      style={{ borderColor: 'rgba(44,42,48,0.1)' }}
      whileHover={
        hasUrl && !shouldReduceMotion
          ? {
              backgroundColor: 'rgba(var(--accent-amber-rgb), 0.055)',
              x: 2,
              transition: { duration: 0.14 },
            }
          : undefined
      }
    >
      {hasUrl ? (
        <a
          href={project.url}
          target={isExternalUrl ? '_blank' : undefined}
          rel={isExternalUrl ? 'noopener noreferrer' : undefined}
          className="block"
        >
          {content}
        </a>
      ) : (
        <div>{content}</div>
      )}
    </motion.li>
  )
}

export default ProjectListItem
