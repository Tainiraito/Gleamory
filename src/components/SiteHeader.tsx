import { Link } from 'react-router-dom'

import { PageContainer, type PageWidth } from '@/components/PageContainer'

interface SiteHeaderProps {
  width?: PageWidth
}

const SiteHeader = ({ width = 'standard' }: SiteHeaderProps) => (
  <header
    className="fixed top-0 right-0 left-0 z-50 flex h-11 items-center sm:h-12"
    style={{ background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border-line)' }}
  >
    <PageContainer width={width}>
      <Link
        to="/"
        className="font-display text-xs font-medium uppercase tracking-[0.2em] transition-opacity duration-300 hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        Gleamory
      </Link>
    </PageContainer>
  </header>
)

export default SiteHeader
