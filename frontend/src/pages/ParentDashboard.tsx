// ============================================================
// CodeQuest — Parent Dashboard
// ============================================================

import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function ParentDashboard() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const res = await api.getChildren();
      setChildren(res.data);
    } catch (err) {
      console.error('Failed to load children:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = async (child: any) => {
    setSelectedChild(child);
    try {
      const res = await api.getReport(child.id);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  };

  if (loading) return <div className="loading-spinner">🚀</div>;

  return (
    <div className="page-container">
      {!selectedChild ? (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Weekly Overview</h1>
              <p className="text-muted">Here is how your explorers are doing this week.</p>
            </div>
            <div className="btn btn-ghost btn-sm" style={{ borderRadius: 'var(--radius-pill)' }}>
              Week of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Summary stats */}
          <div className="dashboard-grid mb-xl">
            <div className="stat-card">
              <div className="stat-card-icon blue">🕐</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Total Time Spent</div>
                <div className="stat-card-value" style={{ fontSize: '1.8rem' }}>
                  {children.length > 0 ? '12' : '0'}<span style={{ fontSize: '1rem', fontWeight: 400 }}>h </span>
                  {children.length > 0 ? '45' : '0'}<span style={{ fontSize: '1rem', fontWeight: 400 }}>m</span>
                </div>
                <div className="stat-card-trend">↗ +2 hours from last week</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon green">🎯</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Avg. Quiz Score</div>
                <div className="stat-card-value">{children.length > 0 ? '92' : '0'}%</div>
                <div className="stat-card-trend">🏆 Top 10% of cohort</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon yellow">💎</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Levels Completed</div>
                <div className="stat-card-value">{children.length > 0 ? '14' : '0'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: 'var(--space-xs)' }}>
                  Across {children.length} learner{children.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Your Explorers */}
          <div style={{ display: 'grid', gridTemplateColumns: children.length > 0 ? '2fr 1fr' : '1fr', gap: 'var(--space-xl)' }}>
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <div className="flex-between mb-lg">
                <h3 style={{ fontFamily: 'var(--font-display)' }}>Your Explorers</h3>
                <span className="text-muted" style={{ fontSize: '0.9rem', color: 'var(--color-primary)', cursor: 'pointer' }}>Add Learner +</span>
              </div>

              {children.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--space-2xl)' }}>
                  <span className="empty-state-emoji">👶</span>
                  <p className="text-muted">No children linked to your account yet.</p>
                  <p className="text-muted mt-sm">Ask an admin to link a learner account to yours.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Current Level</th>
                      <th>Last Active</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((child: any) => (
                      <tr key={child.id}>
                        <td>
                          <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: 'var(--radius-round)',
                              background: 'var(--color-primary-container)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.1rem'
                            }}>
                              {child.avatar_url}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{child.display_name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="role-badge learner">World 2: Variable Valley</span>
                        </td>
                        <td className="text-muted">2 hours ago</td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => viewReport(child)}>
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Focus Areas */}
            {children.length > 0 && (
              <div className="card" style={{ padding: 'var(--space-xl)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-sm)' }}>
                  🏆 Focus Areas
                </h3>
                <p className="text-muted mb-lg" style={{ fontSize: '0.9rem' }}>
                  Topics where learners spent extra time or needed multiple attempts.
                </p>

                <div className="mb-lg">
                  <div className="flex-between mb-sm">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loops (For/While)</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent-yellow)', fontSize: '0.9rem' }}>65% Mastery</span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '10px' }}>
                    <div className="progress-bar-fill gold" style={{ width: '65%' }} />
                  </div>
                  <p className="text-muted mt-sm" style={{ fontSize: '0.8rem' }}>👤 All learners</p>
                </div>

                <div className="mb-lg">
                  <div className="flex-between mb-sm">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Variable Scope</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent-yellow)', fontSize: '0.9rem' }}>72% Mastery</span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '10px' }}>
                    <div className="progress-bar-fill gold" style={{ width: '72%' }} />
                  </div>
                  <p className="text-muted mt-sm" style={{ fontSize: '0.8rem' }}>👤 All learners</p>
                </div>

                <button className="btn btn-ghost btn-sm w-full" style={{ color: 'var(--color-primary)' }}>
                  View recommended lessons
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <button className="btn btn-ghost mb-lg" onClick={() => { setSelectedChild(null); setReport(null); }}>
            ← Back to Overview
          </button>

          {report && (
            <>
              {/* Child header */}
              <div className="card mb-xl text-center" style={{ padding: 'var(--space-xl)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>{report.user.avatar_url}</div>
                <h2 style={{ fontFamily: 'var(--font-display)' }}>{report.user.display_name}'s Progress</h2>
              </div>

              {/* Summary stats */}
              <div className="dashboard-grid mb-xl">
                <div className="stat-card">
                  <div className="stat-card-icon blue">📚</div>
                  <div className="stat-card-info">
                    <div className="stat-card-label">Lessons Done</div>
                    <div className="stat-card-value">{report.summary.completed_lessons}/{report.summary.total_lessons}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon yellow">⭐</div>
                  <div className="stat-card-info">
                    <div className="stat-card-label">Points</div>
                    <div className="stat-card-value">{report.summary.total_points}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon green">📊</div>
                  <div className="stat-card-info">
                    <div className="stat-card-label">Avg Score</div>
                    <div className="stat-card-value">{report.summary.average_quiz_score}%</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon orange">🏅</div>
                  <div className="stat-card-info">
                    <div className="stat-card-label">Badges</div>
                    <div className="stat-card-value">{report.summary.badges_earned}</div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="card mb-xl" style={{ padding: 'var(--space-lg)' }}>
                <div className="flex-between mb-sm">
                  <h3 style={{ fontFamily: 'var(--font-display)' }}>Overall Progress</h3>
                  <span className="text-muted">{report.summary.completion_percentage}%</span>
                </div>
                <div className="progress-bar-container" style={{ height: '14px' }}>
                  <div className="progress-bar-fill" style={{ width: `${report.summary.completion_percentage}%` }} />
                </div>
                <p className="text-muted mt-sm">Current Level: {report.summary.current_level}</p>
              </div>

              {/* Quiz scores chart */}
              {report.progress.filter((p: any) => p.quiz_score !== null).length > 0 && (
                <div className="card mb-xl" style={{ padding: 'var(--space-xl)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>📊 Quiz Scores</h3>
                  <div className="score-chart" style={{ marginBottom: 'var(--space-2xl)' }}>
                    {report.progress.filter((p: any) => p.quiz_score !== null).map((p: any) => (
                      <div
                        key={p.id}
                        className="score-bar"
                        style={{
                          height: `${p.quiz_score}%`,
                          background: p.quiz_passed
                            ? 'var(--color-accent-green)'
                            : 'var(--color-accent-red)',
                        }}
                      >
                        <span className="score-bar-value">{p.quiz_score}%</span>
                        <span className="score-bar-label">{p.lesson_title?.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas needing improvement */}
              <div className="card mb-xl" style={{ padding: 'var(--space-xl)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)' }}>💡 Areas to Focus On</h3>
                {report.areas_needing_improvement.map((area: string, i: number) => (
                  <div key={i} className="alert alert-info mb-sm">{area}</div>
                ))}
              </div>

              {/* Badges */}
              {report.badges.length > 0 && (
                <div className="card" style={{ padding: 'var(--space-xl)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>🏅 Earned Badges</h3>
                  <div className="badge-grid">
                    {report.badges.map((badge: any) => (
                      <div key={badge.id} className="badge-item earned">
                        <span className="badge-emoji">{badge.icon_emoji}</span>
                        <span className="badge-name">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
