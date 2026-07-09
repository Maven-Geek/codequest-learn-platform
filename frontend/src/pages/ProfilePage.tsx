// ============================================================
// CodeQuest — Profile Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function ProfilePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [summaryRes, badgesRes, progressRes] = await Promise.all([
        api.getProgressSummary(),
        api.getBadges(),
        api.getProgress(),
      ]);
      setSummary(summaryRes.data);
      setBadges(badgesRes.data);
      setProgress(progressRes.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-spinner">🚀</div>;

  return (
    <div className="page-container">
      {/* Profile Header */}
      <div className="card mb-xl text-center" style={{ padding: 'var(--space-3xl)' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>{user?.avatar_url}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-xs)' }}>
          {user?.display_name}
        </h1>
        <p className="text-muted">@{user?.username}</p>
      </div>

      {/* Stats */}
      {summary && (
        <div className="dashboard-grid mb-xl">
          <div className="stat-card">
            <div className="stat-card-icon yellow">⭐</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Total Points</div>
              <div className="stat-card-value">{summary.total_points}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon blue">📚</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Lessons Completed</div>
              <div className="stat-card-value">{summary.completed_lessons}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon orange">🏅</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Badges Earned</div>
              <div className="stat-card-value">{summary.badges_earned}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green">📊</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Avg Quiz Score</div>
              <div className="stat-card-value">{summary.average_quiz_score}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {summary && (
        <div className="card mb-xl" style={{ padding: 'var(--space-lg)' }}>
          <div className="flex-between mb-sm">
            <h3 style={{ fontFamily: 'var(--font-display)' }}>📈 Overall Progress</h3>
            <span className="text-muted">{summary.completion_percentage}%</span>
          </div>
          <div className="progress-bar-container" style={{ height: '16px' }}>
            <div className="progress-bar-fill" style={{ width: `${summary.completion_percentage}%` }} />
          </div>
          <p className="text-muted mt-sm">
            Current Level: {summary.current_level} • {summary.completed_lessons}/{summary.total_lessons} lessons complete
          </p>
        </div>
      )}

      {/* Badges */}
      <div className="card mb-xl" style={{ padding: 'var(--space-xl)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
          🏅 Badge Collection
        </h3>
        <div className="badge-grid">
          {badges.map((badge: any) => (
            <div key={badge.id} className={`badge-item ${badge.earned ? 'earned' : 'locked'}`}>
              <span className="badge-emoji">{badge.icon_emoji}</span>
              <span className="badge-name">{badge.name}</span>
              <span className="badge-desc">{badge.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity History */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
          📜 Activity History
        </h3>
        {progress.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-emoji">📚</span>
            <p>No lessons completed yet. Start learning!</p>
          </div>
        ) : (
          <div className="lesson-list">
            {progress.map((p: any) => (
              <div key={p.id} className={`lesson-card ${p.completed ? 'completed' : ''}`} style={{ cursor: 'default' }}>
                <div className="lesson-card-number">{p.completed ? '✓' : '○'}</div>
                <div className="lesson-card-info">
                  <div className="lesson-card-title">{p.lesson_title}</div>
                  <div className="lesson-card-type">{p.level_title}</div>
                </div>
                {p.quiz_score !== null && (
                  <div className="lesson-card-score">
                    {p.quiz_score}% {p.quiz_passed ? '✅' : '❌'}
                  </div>
                )}
                <span style={{ color: 'var(--color-accent-yellow)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  +{p.points_earned} ⭐
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
