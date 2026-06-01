import { Link } from 'react-router-dom'

/**
 * Shared "back to home" footer used by all plugin pages.
 * Renders a fixed footer with a "← 返回首页" link.
 *
 * - Default: renders a React Router <Link> (for pages inside the SPA router).
 * - Set `as="a"` (or pass an anchor element) to render a plain <a href="/">.
 */
interface BackFooterProps {
  as?: 'link' | 'a'
}

const BackFooter = ({ as = 'link' }: BackFooterProps) => (
  <footer
    className="fixed bottom-0 left-0 right-0 flex justify-center py-4 z-40"
    style={{ background: 'var(--bg-page)', borderTop: '0.5px solid var(--border-line)' }}
  >
    {as === 'a' ? (
      <a
        href="/"
        className="text-[0.6rem] uppercase tracking-widest transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        ← 返回首页
      </a>
    ) : (
      <Link
        to="/"
        className="text-[0.6rem] uppercase tracking-widest transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        ← 返回首页
      </Link>
    )}
  </footer>
)

export default BackFooter