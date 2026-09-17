// ============================================================
// CodeQuest — Login Page
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/learn');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: 'var(--space-lg)', position: 'relative', zIndex: 1, background: 'var(--color-bg)' }}>
      {/* Subtle animated background */}
      <div className="animated-bg">
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
      </div>

      <div className="glass-panel" style={{ maxWidth: '460px', width: '100%' }}>
        <div className="text-center mb-xl">
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>🚀</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>Welcome Back!</h1>
          <p className="text-muted">Log in to continue your coding adventure</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">👤 Username</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">🔒 Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? '⏳ Logging in...' : '🚀 Log In'}
          </button>
        </form>

        {/* Quick Demo Login Preset Buttons */}
        <div style={{
          marginTop: 'var(--space-lg)',
          paddingTop: 'var(--space-md)',
          borderTop: '1px solid var(--color-border-light)'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-xs)',
            textAlign: 'center'
          }}>
            ⚡ Quick Demo Accounts
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm w-full mb-xs"
            onClick={() => handleQuickFill('tester', 'tester123')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderColor: '#10b981',
              background: 'rgba(16, 185, 129, 0.08)'
            }}
          >
            <span>⚡ <strong>Tester</strong> (All Lessons Unlocked)</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>tester / tester123 🔓</span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleQuickFill('admin', 'admin123')}
              style={{ fontSize: '0.8rem', padding: '6px 8px' }}
            >
              👑 Admin (admin)
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleQuickFill('coder_kid', 'learn123')}
              style={{ fontSize: '0.8rem', padding: '6px 8px' }}
            >
              🤖 Learner (coder_kid)
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleQuickFill('teacher1', 'teach123')}
              style={{ fontSize: '0.8rem', padding: '6px 8px' }}
            >
              👩‍🏫 Teacher (teacher1)
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleQuickFill('parent1', 'parent123')}
              style={{ fontSize: '0.8rem', padding: '6px 8px' }}
            >
              👨‍👩‍👧 Parent (parent1)
            </button>
          </div>
        </div>

        <p className="text-center mt-md text-muted" style={{ fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register">Sign up here! 🌟</Link>
        </p>

      </div>
    </div>
  );
}
