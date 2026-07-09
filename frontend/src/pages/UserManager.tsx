// ============================================================
// CodeQuest — User Manager (Admin)
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function UserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, editForm);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const startEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      role: user.role,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      parent_id: user.parent_id || '',
      teacher_id: user.teacher_id || '',
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const matchesSearch = !search || u.display_name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const parents = users.filter(u => u.role === 'parent');
  const teachers = users.filter(u => u.role === 'teacher');

  if (loading) return <div className="loading-spinner">🚀</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to="/admin" className="text-muted" style={{ fontSize: '0.9rem' }}>← Back to Dashboard</Link>
          <h1 className="page-title">User Manager</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-grid mb-xl">
        <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer', border: filter === 'all' ? '2px solid var(--color-primary)' : undefined }}>
          <div className="stat-card-icon blue">👥</div>
          <div className="stat-card-info">
            <div className="stat-card-label">All Users</div>
            <div className="stat-card-value">{users.length}</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('learner')} style={{ cursor: 'pointer', border: filter === 'learner' ? '2px solid var(--color-primary)' : undefined }}>
          <div className="stat-card-icon green">👦</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Learners</div>
            <div className="stat-card-value">{users.filter(u => u.role === 'learner').length}</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('parent')} style={{ cursor: 'pointer', border: filter === 'parent' ? '2px solid var(--color-primary)' : undefined }}>
          <div className="stat-card-icon orange">👨‍👩‍👧</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Parents</div>
            <div className="stat-card-value">{users.filter(u => u.role === 'parent').length}</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('teacher')} style={{ cursor: 'pointer', border: filter === 'teacher' ? '2px solid var(--color-primary)' : undefined }}>
          <div className="stat-card-icon teal">👩‍🏫</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Teachers</div>
            <div className="stat-card-value">{users.filter(u => u.role === 'teacher').length}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="form-group">
        <input
          className="form-input"
          placeholder="🔍 Search users by name or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>
                ✏️ Edit User: {editingUser.display_name}
              </h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                <option value="learner">Learner</option>
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Parent (for learners)</label>
              <select className="form-select" value={editForm.parent_id} onChange={(e) => setEditForm({ ...editForm, parent_id: e.target.value ? parseInt(e.target.value) : null })}>
                <option value="">— None —</option>
                {parents.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name} (@{p.username})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Teacher (for learners)</label>
              <select className="form-select" value={editForm.teacher_id} onChange={(e) => setEditForm({ ...editForm, teacher_id: e.target.value ? parseInt(e.target.value) : null })}>
                <option value="">— None —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.display_name} (@{t.username})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">New Password (leave blank to keep current)</label>
              <input type="password" className="form-input" value={editForm.password || ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="flex gap-md">
              <button className="btn btn-success" onClick={handleUpdate}>💾 Save Changes</button>
              <button className="btn btn-ghost" onClick={() => setEditingUser(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card" style={{ padding: 'var(--space-lg)', overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Avatar</th>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Parent</th>
              <th>Teacher</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user: any) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td style={{ fontSize: '1.5rem' }}>{user.avatar_url}</td>
                <td style={{ fontWeight: 500 }}>{user.display_name}</td>
                <td className="text-muted">@{user.username}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>{user.role}</span>
                </td>
                <td>{user.parent_id ? `#${user.parent_id}` : '—'}</td>
                <td>{user.teacher_id ? `#${user.teacher_id}` : '—'}</td>
                <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div className="flex gap-sm">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(user)}>✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(user.id)} style={{ color: 'var(--color-accent-red)' }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-emoji">🔍</span>
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
