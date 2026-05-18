import { Link } from 'react-router-dom'

const FloatingLogo = () => (
  <div
    className="fixed top-6 sm:top-8 left-6 sm:left-8 z-50 px-3 py-1.5 rounded-sm"
    style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}
  >
    <Link
      to="/"
      className="font-display text-[0.6rem] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity duration-300"
      style={{ color: 'var(--text-muted)' }}
    >
      Gleamory
    </Link>
  </div>
)

export default FloatingLogo
