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
