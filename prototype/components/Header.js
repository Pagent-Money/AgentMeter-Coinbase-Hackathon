import Link from 'next/link'

export default function Header() {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            AgentMeter
          </div>
          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="#sdk">SDK</Link>
            <Link href="#portal">Business Portal</Link>
            <Link href="#docs">Documentation</Link>
          </nav>
          <Link href="#portal" className="cta-button">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
} 