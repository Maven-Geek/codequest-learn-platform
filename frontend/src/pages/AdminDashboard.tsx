// ============================================================
// CodeQuest — Admin Dashboard
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-spinner">🚀</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Lesson Management</h1>
        <Link to="/admin/lessons" className="btn btn-primary">
          + Create New Lesson
        </Link>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="dashboard-grid mb-xl">
          <div className="stat-card">
            <div className="stat-card-icon blue">📚</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Total Lessons</div>
              <div className="stat-card-value">{stats.total_lessons}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon yellow">📝</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Active Quizzes</div>
              <div className="stat-card-value">{stats.total_quizzes}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green">👥</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Active Learners</div>
              <div className="stat-card-value">{stats.active_learners_today || stats.total_learners}</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
        Quick Actions
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
        <Link to="/admin/lessons" className="card" style={{ textDecoration: 'none' }}>
          <div className="card-header">
            <div className="card-icon blue">📚</div>
            <div>
              <h3 className="card-title">Lesson Manager</h3>
              <p className="card-body">Create, edit, and manage lessons and quizzes</p>
            </div>
          </div>
          <div className="btn btn-primary w-full">Open Lesson Manager →</div>
        </Link>

        <Link to="/admin/users" className="card" style={{ textDecoration: 'none' }}>
          <div className="card-header">
            <div className="card-icon green">👥</div>
            <div>
              <h3 className="card-title">User Manager</h3>
              <p className="card-body">Manage users, roles, and parent-child links</p>
            </div>
          </div>
          <div className="btn btn-primary w-full">Open User Manager →</div>
        </Link>
      </div>

      {/* Platform overview */}
      {stats && (
        <>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 'var(--space-2xl) 0 var(--space-lg)' }}>
            Platform Overview
          </h2>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-card-icon blue">👥</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Total Users</div>
                <div className="stat-card-value">{stats.total_users}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon green">👦</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Learners</div>
                <div className="stat-card-value">{stats.total_learners}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon orange">👨‍👩‍👧</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Parents</div>
                <div className="stat-card-value">{stats.total_parents}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon teal">👩‍🏫</div>
              <div className="stat-card-info">
                <div className="stat-card-label">Teachers</div>
                <div className="stat-card-value">{stats.total_teachers}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
