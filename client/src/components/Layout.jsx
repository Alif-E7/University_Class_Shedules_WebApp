import { NavLink, Link } from 'react-router-dom';
import { auth } from '../api';

export default function Layout({ children }) {
  const user = auth.getUser();
  const loggedIn = auth.isLoggedIn();

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand">
            <span className="brand-icon">📚</span>
            Schedule Portal
          </Link>
          <nav className="nav-links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/departments">Departments</NavLink>
            <NavLink to="/teachers">Faculty</NavLink>
            <NavLink to="/courses">Courses</NavLink>
            <NavLink to="/weekly">Weekly</NavLink>
            <NavLink to="/rooms">Rooms</NavLink>
            <NavLink to="/admin">
              {loggedIn ? `⚙ ${user?.username || 'Admin'}` : 'Admin'}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="container page-enter">{children}</main>
    </>
  );
}
