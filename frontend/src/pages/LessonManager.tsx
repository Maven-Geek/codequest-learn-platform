// ============================================================
// CodeQuest — Lesson Manager (Admin)
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function LessonManager() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    level_id: 1,
    order_index: 1,
    title: '',
    explanation: '',
    example: '',
    activity_type: 'drag-drop',
    is_published: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lessonsRes, levelsRes] = await Promise.all([
        api.getAllLessons(),
        api.getLevels(),
      ]);
      setLessons(lessonsRes.data);
      setLevels(levelsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.createLesson({
        ...formData,
        activity_data: {},
      });
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to create lesson:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingLesson) return;
    try {
      await api.updateLesson(editingLesson.id, formData);
      setEditingLesson(null);
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to update lesson:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await api.deleteLesson(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete lesson:', err);
    }
  };

  const startEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setFormData({
      level_id: lesson.level_id,
      order_index: lesson.order_index,
      title: lesson.title,
      explanation: lesson.explanation,
      example: lesson.example,
      activity_type: lesson.activity_type,
      is_published: !!lesson.is_published,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      level_id: 1,
      order_index: 1,
      title: '',
      explanation: '',
      example: '',
      activity_type: 'drag-drop',
      is_published: true,
    });
    setEditingLesson(null);
  };

  const update = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredLessons = lessons.filter(l =>
    l.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Color for left border based on level
  const levelColors = ['#4dabf7', '#f9a825', '#4caf50', '#ff9800', '#7e57c2', '#00897b'];

  if (loading) return <div className="loading-spinner">🚀</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to="/admin" className="text-muted" style={{ fontSize: '0.9rem' }}>← Back to Dashboard</Link>
          <h1 className="page-title">Lesson Management</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
        >
          {showForm ? '✕ Cancel' : '+ Create New Lesson'}
        </button>
      </div>

      {/* Stats row */}
      <div className="dashboard-grid mb-xl">
        <div className="stat-card">
          <div className="stat-card-icon blue">📚</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Total Lessons</div>
            <div className="stat-card-value">{lessons.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon yellow">📝</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Active Quizzes</div>
            <div className="stat-card-value">{lessons.filter(l => l.is_published).length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">👥</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Active Learners</div>
            <div className="stat-card-value">--</div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: showForm ? '1fr 1fr' : '1fr', gap: 'var(--space-xl)' }}>

        {/* Current Lessons */}
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <div className="flex-between mb-lg">
            <h3 style={{ fontFamily: 'var(--font-display)' }}>Current Lessons</h3>
            <div style={{ position: 'relative', width: '200px' }}>
              <input
                className="form-input"
                placeholder="Search lessons..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {filteredLessons.map((lesson, i) => (
              <div
                key={lesson.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  borderLeft: `4px solid ${levelColors[(lesson.level_id - 1) % levelColors.length]}`,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-warm)',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-round)',
                  background: levelColors[(lesson.level_id - 1) % levelColors.length],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>
                  {lesson.activity_type === 'drag-drop' ? '🧩' : lesson.activity_type === 'puzzle' ? '🧩' : '🎮'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{lesson.title}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    Level {lesson.level_id} • {lesson.activity_type}
                  </div>
                </div>
                <div className="flex gap-sm">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => startEdit(lesson)}
                    style={{ fontSize: '1rem', padding: '4px 8px' }}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => update('is_published', !lesson.is_published)}
                    style={{ fontSize: '1rem', padding: '4px 8px' }}
                  >
                    {lesson.is_published ? '👁️' : '🚫'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(lesson.id)}
                    style={{ fontSize: '1rem', padding: '4px 8px', color: 'var(--color-accent-red)' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
              {editingLesson ? '✏️ Edit Lesson' : 'Draft New Lesson'}
            </h3>

            <div className="form-group">
              <label className="form-label">Lesson Title</label>
              <input
                className="form-input"
                value={formData.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Magic Functions"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Level</label>
                <select className="form-select" value={formData.level_id} onChange={(e) => update('level_id', parseInt(e.target.value))}>
                  {levels.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.icon_emoji} {l.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={formData.activity_type} onChange={(e) => update('activity_type', e.target.value)}>
                  <option value="drag-drop">🧩 Drag & Drop</option>
                  <option value="puzzle">🧩 Puzzle</option>
                  <option value="pattern">🎨 Pattern</option>
                  <option value="game">🎮 Game</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={4}
                value={formData.explanation}
                onChange={(e) => update('explanation', e.target.value)}
                placeholder="What will they learn today?"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Example (Markdown)</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.example}
                onChange={(e) => update('example', e.target.value)}
                placeholder="Example content..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Order</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.order_index}
                  onChange={(e) => update('order_index', parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={formData.is_published ? 'true' : 'false'} onChange={(e) => update('is_published', e.target.value === 'true')}>
                  <option value="true">✅ Published</option>
                  <option value="false">📝 Draft</option>
                </select>
              </div>
            </div>

            {/* Quiz Questions placeholder */}
            <div style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              textAlign: 'center',
              marginBottom: 'var(--space-lg)'
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-sm)' }}>⭐ Quiz Questions</div>
              <button className="btn btn-ghost btn-sm">➕ Add Question Block</button>
            </div>

            <button
              className="btn btn-primary w-full btn-lg"
              onClick={editingLesson ? handleUpdate : handleCreate}
            >
              {editingLesson ? '💾 Update Lesson' : 'Save Lesson Draft'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
