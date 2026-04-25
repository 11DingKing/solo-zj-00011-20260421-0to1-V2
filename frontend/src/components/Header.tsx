import { Link, useLocation } from 'react-router-dom'

function Header() {
  const location = useLocation()

  return (
    <header className="header">
      <div className="container">
        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <h1>🗳️ 在线投票系统</h1>
        </Link>
        <nav>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            首页
          </Link>
          <Link to="/create" className={location.pathname === '/create' ? 'active' : ''}>
            创建投票
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
