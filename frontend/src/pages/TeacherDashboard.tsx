// ============================================================
// CodeQuest — Teacher Dashboard
// ============================================================

import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function TeacherDashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await api.getChildren();
      setStudents(res.data);
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

          {/* Class overview stats */}
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
                <div className="stat-card-label">Class Average</div>
                <div className="stat-card-value">--</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon yellow">🏅</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Badges Earned</div>
                <div className="stat-card-value">--</div>
              </div>
            </div>
          </div>

          {/* Students list */}
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Current Level</th>
                    <th>Last Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student: any) => (
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
                        <span className="role-badge learner">Active</span>
                      </td>
                      <td className="text-muted">Recently</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => viewReport(student)}>
                          View Report →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
