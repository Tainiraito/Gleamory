import { motion } from 'framer-motion'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
  index: number
}

const ProjectCard = ({ project, index }: ProjectCardProps) => (
  <motion.a
    href={project.url}
    target="_blank"
    rel="noopener noreferrer"
    className="group block rounded-sm transition-all duration-300"
    style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: index * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
    whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
  >
    {/* Top accent line */}
    <div style={{ height: '1px', background: 'var(--accent-pink)', width: '48px' }} />

    {/* Cover image — polaroid style with 4px white border */}
    {project.cover ? (
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
    ) : (
      <div
        className="mx-6 sm:mx-8 mt-6 sm:mt-8"
        style={{ aspectRatio: '16/9', background: 'var(--bg-elevated)' }}
      />
    )}

    {/* Text area */}
    <div className="px-6 sm:px-8 py-6 sm:py-8">
      <h1
        className="font-display text-3xl sm:text-4xl mb-3 tracking-wide"
        style={{ fontWeight: 600, color: 'var(--text-primary)' }}
      >
        {project.name}
      </h1>

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
  </motion.a>
)

export default ProjectCard
