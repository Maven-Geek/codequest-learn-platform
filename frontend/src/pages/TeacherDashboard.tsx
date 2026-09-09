// ============================================================
// CodeQuest — Teacher Dashboard
// ============================================================

import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function TeacherDashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]); // aggregated reports for all students
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await api.getChildren();
      const kids = res.data;
      setStudents(kids);

      // Fetch individual reports for all students to compute aggregate stats
      if (kids.length > 0) {
        const reportResults = await Promise.allSettled(
          kids.map((s: any) => api.getReport(s.id))
        );
        const successfulReports = reportResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value.data);
        setReports(successfulReports);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = async (student: any) => {
    setSelectedStudent(student);
    try {
      const res = await api.getReport(student.id);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  };

  // ── Aggregate class stats from all student reports ────────────────────────
  const classAvgScore = reports.length > 0
    ? Math.round(
        reports.reduce((sum, r) => sum + (r?.summary?.average_quiz_score ?? 0), 0) / reports.length
      )
    : 0;

  const totalBadgesEarned = reports.reduce(
    (sum, r) => sum + (r?.summary?.badges_earned ?? 0), 0
  );

  const totalLessonsCompleted = reports.reduce(
    (sum, r) => sum + (r?.summary?.completed_lessons ?? 0), 0
  );

  // Collect all focus areas across the class
  const allFocusAreas: { studentName: string; area: string }[] = [];
  reports.forEach(r => {
    if (r?.areas_needing_improvement) {
      r.areas_needing_improvement
        .filter((a: string) => !a.startsWith('Great progress'))
        .forEach((area: string) => {
          allFocusAreas.push({ studentName: r.user?.display_name ?? 'Student', area });
        });
    }
  });

  if (loading) return <div className="loading-spinner">🚀</div>;

  return (
    <div className="page-container">
      {!selectedStudent ? (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Classroom Overview</h1>
              <p className="text-muted">Track your students' progress and performance.</p>
            </div>
          </div>

          {/* Class overview stats — computed from real student data */}
          <div className="dashboard-grid mb-xl">
            <div className="stat-card">
              <div className="stat-card-icon blue">👦</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Students</div>
                <div className="stat-card-value">{students.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon green">📊</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Class Avg Score</div>
                <div className="stat-card-value">
                  {students.length > 0 ? `${classAvgScore}%` : '—'}
                </div>
                {classAvgScore >= 70 && students.length > 0 && (
                  <div className="stat-card-trend">🏆 Great class performance!</div>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon yellow">🏅</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Badges Earned</div>
                <div className="stat-card-value">{students.length > 0 ? totalBadgesEarned : '—'}</div>
                {students.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: 'var(--space-xs)' }}>
                    Across {students.length} student{students.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon orange">📚</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Lessons Completed</div>
                <div className="stat-card-value">{students.length > 0 ? totalLessonsCompleted : '—'}</div>
              </div>
            </div>
          </div>

          {/* Students list with real progress data */}
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
              My Students
            </h3>
            {students.length === 0 ? (
              <div className="text-center" style={{ padding: 'var(--space-3xl)' }}>
                <span className="empty-state-emoji">📚</span>
                <p className="text-muted">No students linked to your account yet.</p>
                <p className="text-muted mt-sm">Ask an admin to assign learners to your class.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Progress</th>
                      <th>Avg Score</th>
                      <th>Points</th>
                      <th>Badges</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: any) => {
                      const studentReport = reports.find(r => r?.user?.id === student.id);
                      const summary = studentReport?.summary;
                      return (
                        <tr key={student.id}>
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
                                {student.avatar_url}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{student.display_name}</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>@{student.username}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {summary ? (
                              <div style={{ minWidth: '120px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '4px' }}>
                                  {summary.completed_lessons}/{summary.total_lessons} lessons
                                </div>
                                <div className="progress-bar-container" style={{ height: '6px' }}>
                                  <div className="progress-bar-fill" style={{ width: `${summary.completion_percentage}%` }} />
                                </div>
                              </div>
                            ) : <span className="text-muted">No activity yet</span>}
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
                            {summary ? `🏅 ${summary.badges_earned}` : '—'}
                          </td>
                          <td>
                            <button className="btn btn-primary btn-sm" onClick={() => viewReport(student)}>
                              View Report →
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

          {/* Class focus areas */}
          {students.length > 0 && (
            <div className="card mt-xl" style={{ padding: 'var(--space-xl)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)' }}>
                💡 Class Focus Areas
              </h3>
              {allFocusAreas.length === 0 ? (
                <div className="alert alert-success">
                  🌟 All students are performing well! No areas needing immediate attention.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {allFocusAreas.slice(0, 6).map((fa, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-md)',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--color-bg-warm)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--color-accent-orange)',
                    }}>
                      <span style={{
                        padding: '2px var(--space-sm)',
                        background: 'var(--color-primary-container)',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>{fa.studentName}</span>
                      <span style={{ fontSize: '0.875rem' }}>{fa.area}</span>
                    </div>
                  ))}
                  {allFocusAreas.length > 6 && (
                    <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                      +{allFocusAreas.length - 6} more areas — view individual reports for details
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <button className="btn btn-ghost mb-lg" onClick={() => { setSelectedStudent(null); setReport(null); }}>
            ← Back to Students
          </button>

          {report && (
            <>
              <div className="card mb-xl text-center" style={{ padding: 'var(--space-xl)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>{report.user.avatar_url}</div>
                <h2 style={{ fontFamily: 'var(--font-display)' }}>{report.user.display_name}'s Report</h2>
                <p className="text-muted">@{report.user.username}</p>
              </div>

              <div className="dashboard-grid mb-xl">
                <div className="stat-card">
                  <div className="stat-card-icon blue">📚</div>
                  <div className="stat-card-info">
                    <div className="stat-card-label">Lessons Completed</div>
                    <div className="stat-card-value">{report.summary.completed_lessons}/{report.summary.total_lessons}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon yellow">⭐</div>
                  <div className="stat-card-info">
                    <div className="stat-card-label">Total Points</div>
                    <div className="stat-card-value">{report.summary.total_points}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon green">📊</div>
                  <div className="stat-card-info">
                    <div className="stat-card-label">Avg Quiz Score</div>
                    <div className="stat-card-value">{report.summary.average_quiz_score}%</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon orange">🎯</div>
                  <div className="stat-card-info">
                    <div className="stat-card-label">Completion</div>
                    <div className="stat-card-value">{report.summary.completion_percentage}%</div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="card mb-xl" style={{ padding: 'var(--space-lg)' }}>
                <div className="flex-between mb-sm">
                  <h3 style={{ fontFamily: 'var(--font-display)' }}>Learning Progress</h3>
                  <span className="text-muted">Level: {report.summary.current_level}</span>
                </div>
                <div className="progress-bar-container" style={{ height: '14px' }}>
                  <div className="progress-bar-fill" style={{ width: `${report.summary.completion_percentage}%` }} />
                </div>
              </div>

              {/* Lesson details */}
              <div className="card mb-xl" style={{ padding: 'var(--space-xl)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>📝 Lesson Details</h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Lesson</th>
                        <th>Level</th>
                        <th>Status</th>
                        <th>Quiz Score</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.progress.map((p: any) => (
                        <tr key={p.id}>
                          <td>{p.lesson_title}</td>
                          <td>{p.level_title}</td>
                          <td>
                            <span className={`role-badge ${p.completed ? 'learner' : 'teacher'}`}>
                              {p.completed ? '✅ Done' : '⏳ In Progress'}
                            </span>
                          </td>
                          <td>{p.quiz_score !== null ? `${p.quiz_score}%` : '—'}</td>
                          <td style={{ color: 'var(--color-accent-yellow)', fontWeight: 600 }}>+{p.points_earned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.progress.length === 0 && (
                  <div className="empty-state">
                    <span className="empty-state-emoji">📖</span>
                    <p>No lessons started yet.</p>
                  </div>
                )}
              </div>

              {/* Areas needing improvement */}
              <div className="card mb-xl" style={{ padding: 'var(--space-xl)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)' }}>
                  💡 Areas Needing Improvement
                </h3>
                {report.areas_needing_improvement.map((area: string, i: number) => (
                  <div key={i} className="alert alert-info mb-sm">{area}</div>
                ))}
              </div>

              {/* Badges */}
              {report.badges.length > 0 && (
                <div className="card" style={{ padding: 'var(--space-xl)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>🏅 Badges Earned</h3>
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
