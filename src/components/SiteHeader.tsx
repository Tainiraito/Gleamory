import { Link } from 'react-router-dom'

const SiteHeader = () => (
  <header
    className="fixed top-0 left-0 right-0 z-50 h-11 sm:h-12 flex items-center"
    style={{ background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border-line)' }}
  >
    <div className="w-full px-4 sm:px-[15%]">
      <Link
        to="/"
        className="font-display text-xs font-medium uppercase tracking-[0.2em] transition-opacity duration-300 hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        Gleamory
      </Link>
    </div>
  </header>
)

export default SiteHeader
