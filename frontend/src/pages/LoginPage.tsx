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

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: 'var(--space-lg)', position: 'relative', zIndex: 1, background: 'var(--color-bg)' }}>
      {/* Subtle animated background */}
      <div className="animated-bg">
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
      </div>

      <div className="glass-panel" style={{ maxWidth: '450px', width: '100%' }}>
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

        <p className="text-center mt-lg text-muted">
          Don't have an account? <Link to="/register">Sign up here! 🌟</Link>
        </p>

      </div>
    </div>
  );
}
