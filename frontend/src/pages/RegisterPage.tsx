// ============================================================
// CodeQuest — Register Page
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AVATARS = ['🤖', '🦊', '🐱', '🐶', '🦁', '🐼', '🐸', '🦄', '🐙', '🦋', '🚀', '⭐', '🎮', '🎨', '🧑‍🚀'];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    display_name: '',
    role: 'learner' as string,
    avatar_url: '🤖',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/learn');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: 'var(--space-lg)', position: 'relative', zIndex: 1, background: 'var(--color-bg)' }}>
      {/* Subtle animated background */}
      <div className="animated-bg">
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
      </div>

      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="text-center mb-xl">
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>🌟</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>Join CodeQuest!</h1>
          <p className="text-muted">Create your account and start coding</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">🎭 Choose Your Avatar</label>
            <div className="avatar-picker">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  className={`avatar-option ${formData.avatar_url === avatar ? 'selected' : ''}`}
                  onClick={() => update('avatar_url', avatar)}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🏷️ Display Name</label>
            <input
              id="register-display-name"
              type="text"
              className="form-input"
              placeholder="What should we call you?"
              value={formData.display_name}
              onChange={(e) => update('display_name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">👤 Username</label>
            <input
              id="register-username"
              type="text"
              className="form-input"
              placeholder="Choose a username"
              value={formData.username}
              onChange={(e) => update('username', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">📧 Email</label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="Your email address"
              value={formData.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">🔒 Password</label>
            <input
              id="register-password"
              type="password"
              className="form-input"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label">🎯 I am a...</label>
            <select
              id="register-role"
              className="form-select"
              value={formData.role}
              onChange={(e) => update('role', e.target.value)}
            >
              <option value="learner">👦 Learner (I want to learn coding!)</option>
              <option value="parent">👨‍👩‍👧 Parent (I want to track my child's progress)</option>
              <option value="teacher">👩‍🏫 Teacher (I want to monitor students)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? '⏳ Creating account...' : '🚀 Start My Adventure!'}
          </button>
        </form>

        <p className="text-center mt-lg text-muted">
          Already have an account? <Link to="/login">Log in here! 🔑</Link>
        </p>
      </div>
    </div>
  );
}
