// ============================================================
// CodeQuest — Top Bar (slim header)
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [totalPoints, setTotalPoints] = useState(0);
  const [ambientOn, setAmbientOn] = useState(() => {
    const saved = localStorage.getItem('codequest_ambient_enabled');
    return saved === null ? true : saved === 'true';
  });

  const toggleAmbient = () => {
    const next = !ambientOn;
    setAmbientOn(next);
    localStorage.setItem('codequest_ambient_enabled', String(next));
    window.dispatchEvent(new CustomEvent('codequest_ambient_toggle', { detail: { enabled: next } }));
  };

  useEffect(() => {
    if (user?.role === 'learner') {
      api.getProgressSummary()
        .then(res => setTotalPoints(res.data.total_points))
        .catch(() => {});
    }
  }, [user, location.pathname]);

  if (!user) return null;

  return (
    <div className="topbar">
      <Link to={user.role === 'admin' ? '/admin' : user.role === 'parent' ? '/parent' : user.role === 'teacher' ? '/teacher' : '/learn'} className="topbar-brand">
        CodeQuest
      </Link>

      <div className="topbar-center">
        {user.role === 'learner' && (
          <div className="topbar-level-pill">
            <span className="level-num">2</span>
            <span>Loop Land</span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className={`topbar-ambient-toggle ${ambientOn ? 'active' : ''}`}
          onClick={toggleAmbient}
          title={ambientOn ? 'Turn off floating background particles' : 'Turn on floating background particles'}
        >
          <span>✨</span>
          <span>{ambientOn ? 'Ambient: ON' : 'Ambient: OFF'}</span>
        </button>

        {user.role === 'learner' && (
          <>
            <div className="topbar-badge points">
              ⭐ {totalPoints}
            </div>
            <div className="topbar-badge coins">
              💰 {Math.floor(totalPoints / 3)}
            </div>
          </>
        )}
        <div className="topbar-avatar">{user.avatar_url}</div>
      </div>
    </div>
  );
}
