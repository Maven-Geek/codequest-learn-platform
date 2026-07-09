// ============================================================
// CodeQuest — Sidebar Navigation
// ============================================================

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const getRoleLabel = () => {
    switch (user.role) {
      case 'learner': return { title: 'Explorer', sub: 'Learning Path' };
      case 'parent': return { title: 'Parent Portal', sub: 'Monitoring Progress' };
      case 'teacher': return { title: 'Teacher Portal', sub: 'Classroom View' };
      case 'admin': return { title: 'Admin Panel', sub: 'System Management' };
      default: return { title: 'Dashboard', sub: '' };
    }
  };

  const roleInfo = getRoleLabel();

  const navItems = () => {
    switch (user.role) {
      case 'learner':
        return [
          { to: '/learn', icon: '🗺️', label: 'Dashboard' },
          { to: '/profile', icon: '👤', label: 'Profile' },
        ];
      case 'parent':
        return [
          { to: '/parent', icon: '📊', label: 'Dashboard' },
        ];
      case 'teacher':
        return [
          { to: '/teacher', icon: '📊', label: 'Dashboard' },
        ];
      case 'admin':
        return [
          { to: '/admin', icon: '📊', label: 'Dashboard' },
          { to: '/admin/lessons', icon: '📚', label: 'Classroom' },
          { to: '/admin/users', icon: '👥', label: 'Reports' },
        ];
      default:
        return [];
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <Link to="/" className="sidebar-brand">
        CodeQuest
      </Link>

      {/* Profile */}
      <div className="sidebar-profile">
        <div className="sidebar-avatar">{user.avatar_url}</div>
        <div className="sidebar-role-label">{roleInfo.title}</div>
        <div className="sidebar-role-sub">{roleInfo.sub}</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems().map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={location.pathname === item.to ? 'active' : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom area */}
      <div className="sidebar-bottom">
        <button className="sidebar-cta">
          🚀 Unlock New Worlds
        </button>
        <button className="sidebar-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
