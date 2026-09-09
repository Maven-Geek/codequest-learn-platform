// ============================================================
// CodeQuest — Parent Dashboard
// ============================================================

import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function ParentDashboard() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]); // aggregated reports for all children
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const res = await api.getChildren();
      const kids = res.data;
      setChildren(kids);

      // Fetch individual reports for all children to compute aggregate stats
      if (kids.length > 0) {
        const reportResults = await Promise.allSettled(
          kids.map((child: any) => api.getReport(child.id))
        );
        const successfulReports = reportResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value.data);
        setReports(successfulReports);
      }
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

  // ── Aggregate stats from all children's reports ──────────────────────────
  const totalLessonsCompleted = reports.reduce(
    (sum, r) => sum + (r?.summary?.completed_lessons ?? 0), 0
  );
  const avgQuizScore = reports.length > 0
    ? Math.round(
        reports.reduce((sum, r) => sum + (r?.summary?.average_quiz_score ?? 0), 0) / reports.length
      )
    : 0;
  const totalPoints = reports.reduce(
    (sum, r) => sum + (r?.summary?.total_points ?? 0), 0
  );

  // Collect focus areas from all children (failed quizzes / unstarted levels)
  const allFocusAreas: { childName: string; area: string }[] = [];
  reports.forEach(r => {
    if (r?.areas_needing_improvement && r.areas_needing_improvement.length > 0) {
      r.areas_needing_improvement
        .filter((a: string) => !a.startsWith('Great progress')) // skip generic positive messages
        .forEach((area: string) => {
          allFocusAreas.push({ childName: r.user?.display_name ?? 'Learner', area });
        });
    }
  });

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

          {/* Summary stats — computed from real child data */}
          <div className="dashboard-grid mb-xl">
            <div className="stat-card">
              <div className="stat-card-icon blue">📚</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Lessons Completed</div>
                <div className="stat-card-value">{totalLessonsCompleted}</div>
                <div className="stat-card-trend">
                  Across {children.length} learner{children.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon green">🎯</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Avg. Quiz Score</div>
                <div className="stat-card-value">
                  {children.length > 0 ? `${avgQuizScore}%` : '—'}
                </div>
                {avgQuizScore >= 80 && children.length > 0 && (
                  <div className="stat-card-trend">🏆 Excellent performance!</div>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon yellow">⭐</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Total Points Earned</div>
                <div className="stat-card-value">{totalPoints}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: 'var(--space-xs)' }}>
                  Combined across {children.length} learner{children.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Your Explorers */}
          <div style={{ display: 'grid', gridTemplateColumns: children.length > 0 ? '2fr 1fr' : '1fr', gap: 'var(--space-xl)' }} className="two-col-responsive">
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <div className="flex-between mb-lg">
                <h3 style={{ fontFamily: 'var(--font-display)' }}>Your Explorers</h3>
              </div>

              {children.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--space-2xl)' }}>
                  <span className="empty-state-emoji">👶</span>
                  <p className="text-muted">No children linked to your account yet.</p>
                  <p className="text-muted mt-sm">Ask an admin to link a learner account to yours.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Learner</th>
                        <th>Progress</th>
                        <th>Avg Score</th>
                        <th>Points</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child: any) => {
                        const childReport = reports.find(r => r?.user?.id === child.id);
                        const summary = childReport?.summary;
                        return (
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
                                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>@{child.username}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              {summary ? (
                                <div style={{ minWidth: '100px' }}>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '4px' }}>
                                    {summary.completed_lessons}/{summary.total_lessons} lessons
                                  </div>
                                  <div className="progress-bar-container" style={{ height: '6px' }}>
                                    <div className="progress-bar-fill" style={{ width: `${summary.completion_percentage}%` }} />
                                  </div>
                                </div>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td>
                              {summary ? (
                                <span className={`role-badge ${summary.average_quiz_score >= 70 ? 'learner' : 'teacher'}`}>
                                  {summary.average_quiz_score}%
                                </span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td style={{ color: 'var(--color-accent-yellow)', fontWeight: 600 }}>
                              {summary ? `⭐ ${summary.total_points}` : '—'}
                            </td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={() => viewReport(child)}>
                                View →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Focus Areas — dynamically generated from children's actual data */}
            {children.length > 0 && (
              <div className="card" style={{ padding: 'var(--space-xl)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-sm)' }}>
                  🏆 Focus Areas
                </h3>
                <p className="text-muted mb-lg" style={{ fontSize: '0.9rem' }}>
                  Topics where learners need extra attention.
                </p>

                {allFocusAreas.length === 0 ? (
                  <div className="alert alert-success">
                    🌟 All learners are doing great! No areas needing improvement right now.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {allFocusAreas.slice(0, 5).map((fa, i) => (
                      <div key={i} style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'var(--color-bg-warm)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--color-accent-orange)',
                      }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '2px' }}>
                          {fa.childName}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{fa.area}</div>
                      </div>
                    ))}
                    {allFocusAreas.length > 5 && (
                      <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                        +{allFocusAreas.length - 5} more areas
                      </p>
                    )}
                  </div>
                )}
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
                <p className="text-muted">@{report.user.username}</p>
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
