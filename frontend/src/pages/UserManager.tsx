// ============================================================
// CodeQuest — User Manager (Admin) with Assignment Panels
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type TabType = 'users' | 'teacher-assign' | 'parent-assign';

export default function UserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Assignment state
  const [selectedTeacher, setSelectedTeacher] = useState<number | ''>('');
  const [selectedParent, setSelectedParent] = useState<number | ''>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');

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

  // ---- Assignment handlers ----

  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const selectAllUnassigned = (type: 'teacher' | 'parent') => {
    const unassigned = learners.filter(l =>
      type === 'teacher' ? !l.teacher_id : !l.parent_id
    );
    setSelectedStudentIds(unassigned.map((l: any) => l.id));
  };

  const clearSelection = () => setSelectedStudentIds([]);

  const handleAssignTeacher = async () => {
    if (!selectedTeacher || selectedStudentIds.length === 0) return;
    setAssignLoading(true);
    setAssignMessage('');
    try {
      await api.assignTeacher(selectedTeacher as number, selectedStudentIds);
      setAssignMessage(`✅ Successfully assigned ${selectedStudentIds.length} student(s) to teacher`);
      setSelectedStudentIds([]);
      loadUsers();
    } catch (err: any) {
      setAssignMessage(`❌ ${err.message || 'Failed to assign'}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignTeacher = async () => {
    if (selectedStudentIds.length === 0) return;
    setAssignLoading(true);
    setAssignMessage('');
    try {
      await api.unassignTeacher(selectedStudentIds);
      setAssignMessage(`✅ Removed teacher assignment from ${selectedStudentIds.length} student(s)`);
      setSelectedStudentIds([]);
      loadUsers();
    } catch (err: any) {
      setAssignMessage(`❌ ${err.message || 'Failed to unassign'}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignParent = async () => {
    if (!selectedParent || selectedStudentIds.length === 0) return;
    setAssignLoading(true);
    setAssignMessage('');
    try {
      await api.assignParent(selectedParent as number, selectedStudentIds);
      setAssignMessage(`✅ Successfully assigned ${selectedStudentIds.length} child(ren) to parent`);
      setSelectedStudentIds([]);
      loadUsers();
    } catch (err: any) {
      setAssignMessage(`❌ ${err.message || 'Failed to assign'}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignParent = async () => {
    if (selectedStudentIds.length === 0) return;
    setAssignLoading(true);
    setAssignMessage('');
    try {
      await api.unassignParent(selectedStudentIds);
      setAssignMessage(`✅ Removed parent assignment from ${selectedStudentIds.length} child(ren)`);
      setSelectedStudentIds([]);
      loadUsers();
    } catch (err: any) {
      setAssignMessage(`❌ ${err.message || 'Failed to unassign'}`);
    } finally {
      setAssignLoading(false);
    }
  };

  // ---- Derived data ----

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const matchesSearch = !search || u.display_name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const learners = users.filter(u => u.role === 'learner');
  const parents = users.filter(u => u.role === 'parent');
  const teachers = users.filter(u => u.role === 'teacher');

  // Helper to resolve user name by ID
  const getUserName = (id: number | null) => {
    if (!id) return '—';
    const u = users.find(u => u.id === id);
    return u ? `${u.display_name} (@${u.username})` : `#${id}`;
  };

  // Students assigned to the selected teacher/parent
  const studentsOfTeacher = selectedTeacher
    ? learners.filter(l => l.teacher_id === selectedTeacher)
    : [];
  const unassignedToTeacher = learners.filter(l => !l.teacher_id);

  const childrenOfParent = selectedParent
    ? learners.filter(l => l.parent_id === selectedParent)
    : [];
  const unassignedToParent = learners.filter(l => !l.parent_id);

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
        <div className="stat-card" onClick={() => { setFilter('all'); setActiveTab('users'); }} style={{ cursor: 'pointer', border: filter === 'all' && activeTab === 'users' ? '2px solid var(--color-primary)' : undefined }}>
          <div className="stat-card-icon blue">👥</div>
          <div className="stat-card-info">
            <div className="stat-card-label">All Users</div>
            <div className="stat-card-value">{users.length}</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('learner'); setActiveTab('users'); }} style={{ cursor: 'pointer', border: filter === 'learner' && activeTab === 'users' ? '2px solid var(--color-primary)' : undefined }}>
          <div className="stat-card-icon green">👦</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Learners</div>
            <div className="stat-card-value">{learners.length}</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('parent'); setActiveTab('users'); }} style={{ cursor: 'pointer', border: filter === 'parent' && activeTab === 'users' ? '2px solid var(--color-primary)' : undefined }}>
          <div className="stat-card-icon orange">👨‍👩‍👧</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Parents</div>
            <div className="stat-card-value">{parents.length}</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('teacher'); setActiveTab('users'); }} style={{ cursor: 'pointer', border: filter === 'teacher' && activeTab === 'users' ? '2px solid var(--color-primary)' : undefined }}>
          <div className="stat-card-icon teal">👩‍🏫</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Teachers</div>
            <div className="stat-card-value">{teachers.length}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-xs)',
        marginBottom: 'var(--space-xl)',
        borderBottom: '2px solid var(--color-outline-variant)',
        paddingBottom: '0',
      }}>
        {[
          { key: 'users' as TabType, label: '👥 All Users', icon: '' },
          { key: 'teacher-assign' as TabType, label: '👩‍🏫 Assign to Teachers', icon: '' },
          { key: 'parent-assign' as TabType, label: '👨‍👩‍👧 Assign to Parents', icon: '' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedStudentIds([]); setAssignMessage(''); }}
            style={{
              padding: 'var(--space-sm) var(--space-lg)',
              border: 'none',
              background: activeTab === tab.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-on-primary)' : 'var(--color-text-dim)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== USERS TABLE TAB ==================== */}
      {activeTab === 'users' && (
        <>
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
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{getUserName(user.parent_id)}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{getUserName(user.teacher_id)}</span>
                    </td>
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
        </>
      )}

      {/* ==================== TEACHER ASSIGNMENT TAB ==================== */}
      {activeTab === 'teacher-assign' && (
        <>
          {assignMessage && (
            <div className="alert alert-info mb-lg" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)' }}>
              {assignMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
            {/* Left: Select teacher + assigned students */}
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
                👩‍🏫 Select Teacher
              </h3>
              <div className="form-group">
                <select
                  className="form-select"
                  value={selectedTeacher}
                  onChange={(e) => { setSelectedTeacher(e.target.value ? parseInt(e.target.value) : ''); setSelectedStudentIds([]); }}
                >
                  <option value="">— Choose a teacher —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.avatar_url} {t.display_name} (@{t.username})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTeacher && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    Currently Assigned ({studentsOfTeacher.length})
                  </h4>
                  {studentsOfTeacher.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: '0.9rem', padding: 'var(--space-md) 0' }}>
                      No students assigned yet. Select students from the right to assign.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {studentsOfTeacher.map((s: any) => (
                          <label
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-sm)',
                              padding: 'var(--space-sm) var(--space-md)',
                              background: selectedStudentIds.includes(s.id) ? 'var(--color-error-container)' : 'var(--color-surface-container-low)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(s.id)}
                              onChange={() => toggleStudentSelection(s.id)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-error)' }}
                            />
                            <span style={{ fontSize: '1.2rem' }}>{s.avatar_url}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.display_name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>@{s.username}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      {selectedStudentIds.some(id => studentsOfTeacher.some((s: any) => s.id === id)) && (
                        <button
                          className="btn btn-sm mt-lg"
                          style={{ background: 'var(--color-error)', color: 'white', width: '100%' }}
                          onClick={handleUnassignTeacher}
                          disabled={assignLoading}
                        >
                          {assignLoading ? '⏳ Processing...' : `🔓 Unassign Selected (${selectedStudentIds.filter(id => studentsOfTeacher.some((s: any) => s.id === id)).length})`}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Right: Unassigned students */}
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)' }}>
                  📋 Unassigned Learners ({unassignedToTeacher.length})
                </h3>
                {unassignedToTeacher.length > 0 && (
                  <div className="flex gap-sm">
                    <button className="btn btn-ghost btn-sm" onClick={() => selectAllUnassigned('teacher')}>Select All</button>
                    <button className="btn btn-ghost btn-sm" onClick={clearSelection}>Clear</button>
                  </div>
                )}
              </div>

              {unassignedToTeacher.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--space-2xl)' }}>
                  <span className="empty-state-emoji">🎉</span>
                  <p className="text-muted">All learners are assigned to a teacher!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}>
                  {unassignedToTeacher.map((s: any) => (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-sm) var(--space-md)',
                        background: selectedStudentIds.includes(s.id) ? 'var(--color-primary-container)' : 'var(--color-surface-container-low)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleStudentSelection(s.id)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ fontSize: '1.2rem' }}>{s.avatar_url}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.display_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>@{s.username}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedTeacher && selectedStudentIds.length > 0 && selectedStudentIds.some(id => unassignedToTeacher.some((s: any) => s.id === id)) && (
                <button
                  className="btn btn-primary mt-lg"
                  style={{ width: '100%' }}
                  onClick={handleAssignTeacher}
                  disabled={assignLoading}
                >
                  {assignLoading ? '⏳ Assigning...' : `✅ Assign ${selectedStudentIds.filter(id => unassignedToTeacher.some((s: any) => s.id === id)).length} Student(s) to Teacher`}
                </button>
              )}

              {!selectedTeacher && unassignedToTeacher.length > 0 && (
                <div className="alert alert-info mt-lg" style={{ borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  💡 Select a teacher on the left first, then choose students to assign.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== PARENT ASSIGNMENT TAB ==================== */}
      {activeTab === 'parent-assign' && (
        <>
          {assignMessage && (
            <div className="alert alert-info mb-lg" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)' }}>
              {assignMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
            {/* Left: Select parent + assigned children */}
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
                👨‍👩‍👧 Select Parent
              </h3>
              <div className="form-group">
                <select
                  className="form-select"
                  value={selectedParent}
                  onChange={(e) => { setSelectedParent(e.target.value ? parseInt(e.target.value) : ''); setSelectedStudentIds([]); }}
                >
                  <option value="">— Choose a parent —</option>
                  {parents.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.avatar_url} {p.display_name} (@{p.username})
                    </option>
                  ))}
                </select>
              </div>

              {selectedParent && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    Linked Children ({childrenOfParent.length})
                  </h4>
                  {childrenOfParent.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: '0.9rem', padding: 'var(--space-md) 0' }}>
                      No children linked yet. Select learners from the right to link.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {childrenOfParent.map((s: any) => (
                          <label
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-sm)',
                              padding: 'var(--space-sm) var(--space-md)',
                              background: selectedStudentIds.includes(s.id) ? 'var(--color-error-container)' : 'var(--color-surface-container-low)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(s.id)}
                              onChange={() => toggleStudentSelection(s.id)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-error)' }}
                            />
                            <span style={{ fontSize: '1.2rem' }}>{s.avatar_url}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.display_name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>@{s.username}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      {selectedStudentIds.some(id => childrenOfParent.some((s: any) => s.id === id)) && (
                        <button
                          className="btn btn-sm mt-lg"
                          style={{ background: 'var(--color-error)', color: 'white', width: '100%' }}
                          onClick={handleUnassignParent}
                          disabled={assignLoading}
                        >
                          {assignLoading ? '⏳ Processing...' : `🔓 Unlink Selected (${selectedStudentIds.filter(id => childrenOfParent.some((s: any) => s.id === id)).length})`}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Right: Unassigned learners */}
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)' }}>
                  📋 Unlinked Learners ({unassignedToParent.length})
                </h3>
                {unassignedToParent.length > 0 && (
                  <div className="flex gap-sm">
                    <button className="btn btn-ghost btn-sm" onClick={() => selectAllUnassigned('parent')}>Select All</button>
                    <button className="btn btn-ghost btn-sm" onClick={clearSelection}>Clear</button>
                  </div>
                )}
              </div>

              {unassignedToParent.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--space-2xl)' }}>
                  <span className="empty-state-emoji">🎉</span>
                  <p className="text-muted">All learners are linked to a parent!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}>
                  {unassignedToParent.map((s: any) => (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-sm) var(--space-md)',
                        background: selectedStudentIds.includes(s.id) ? 'var(--color-primary-container)' : 'var(--color-surface-container-low)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleStudentSelection(s.id)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ fontSize: '1.2rem' }}>{s.avatar_url}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.display_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>@{s.username}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedParent && selectedStudentIds.length > 0 && selectedStudentIds.some(id => unassignedToParent.some((s: any) => s.id === id)) && (
                <button
                  className="btn btn-primary mt-lg"
                  style={{ width: '100%' }}
                  onClick={handleAssignParent}
                  disabled={assignLoading}
                >
                  {assignLoading ? '⏳ Linking...' : `✅ Link ${selectedStudentIds.filter(id => unassignedToParent.some((s: any) => s.id === id)).length} Child(ren) to Parent`}
                </button>
              )}

              {!selectedParent && unassignedToParent.length > 0 && (
                <div className="alert alert-info mt-lg" style={{ borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  💡 Select a parent on the left first, then choose learners to link.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
