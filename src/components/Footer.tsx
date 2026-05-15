const Footer = () => (
  <footer className="flex flex-col items-center gap-3 pt-24 pb-12">
    <div style={{ width: '6px', height: '1px', background: 'var(--border-line)' }} />
    <span
      className="text-[0.6rem] uppercase tracking-widest"
      style={{ color: 'var(--text-muted)' }}
    >
      &copy; {new Date().getFullYear()} Gleamory
    </span>
    <a
      href="https://github.com/Tainiraito/Gleamory"
      target="_blank"
      rel="noopener noreferrer"
      className="text-[0.6rem] uppercase tracking-widest transition-opacity duration-300 hover:opacity-70"
      style={{ color: 'var(--text-muted)' }}
    >
      GitHub &rarr;
    </a>
  </footer>
)

export default Footer
