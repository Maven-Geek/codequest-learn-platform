// ============================================================
// CodeQuest — Homepage
// ============================================================

import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <>
      {/* Subtle animated background */}
      <div className="animated-bg">
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-emoji">🧙‍♂️</div>
          <h1 className="hero-title">
            Become a{' '}
            <span className="highlight">Coding Wizard!</span>
          </h1>
          <p className="hero-subtitle">
            Embark on magical quests, solve logic puzzles, and learn
            to build your own digital worlds in a fun, safe playground!
          </p>
          <div className="hero-cta">
            <Link to="/register" className="btn btn-primary btn-lg">
              Start Your Adventure
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Already a coder? Log in →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 className="features-title">Discover the Magic of Logic</h2>
        <p className="features-subtitle">
          Learn real coding concepts through play. No scary syntax, just squishy blocks and fun challenges!
        </p>
        <div className="features-grid">
          <div className="card feature-card border-blue">
            <div className="card-icon blue">🎮</div>
            <h3 className="card-title">Play Games</h3>
            <p className="card-body">Solve exciting challenges, complete patterns, and guide robots through mazes!</p>
          </div>
          <div className="card feature-card border-yellow">
            <div className="card-icon yellow">🏆</div>
            <h3 className="card-title">Earn Badges</h3>
            <p className="card-body">Complete lessons, ace quizzes, and collect awesome badges on your journey!</p>
          </div>
          <div className="card feature-card border-orange">
            <div className="card-icon orange">🧩</div>
            <h3 className="card-title">Solve Puzzles</h3>
            <p className="card-body">Drag colorful blocks to create programs and watch them come to life.</p>
          </div>
        </div>
      </section>

      {/* Concepts */}
      <section className="features-section" style={{ background: 'var(--color-bg)' }}>
        <h2 className="features-title">What You'll Learn 🎓</h2>
        <div className="features-grid">
          <div className="card feature-card border-blue" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
            <h4 style={{ fontFamily: 'var(--font-display)' }}>Sequencing</h4>
            <p className="card-body">Putting steps in the right order</p>
          </div>
          <div className="card feature-card border-green" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔄</div>
            <h4 style={{ fontFamily: 'var(--font-display)' }}>Loops</h4>
            <p className="card-body">Repeating actions efficiently</p>
          </div>
          <div className="card feature-card border-orange" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🤔</div>
            <h4 style={{ fontFamily: 'var(--font-display)' }}>Conditions</h4>
            <p className="card-body">Making smart decisions</p>
          </div>
          <div className="card feature-card border-purple" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
            <h4 style={{ fontFamily: 'var(--font-display)' }}>Variables</h4>
            <p className="card-body">Remembering information</p>
          </div>
          <div className="card feature-card border-teal" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎨</div>
            <h4 style={{ fontFamily: 'var(--font-display)' }}>Patterns</h4>
            <p className="card-body">Finding & creating patterns</p>
          </div>
          <div className="card feature-card border-yellow" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💡</div>
            <h4 style={{ fontFamily: 'var(--font-display)' }}>Problem Solving</h4>
            <p className="card-body">Thinking like a coder</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="features-section" style={{ textAlign: 'center', paddingBottom: '4rem', background: 'var(--color-bg-warm)' }}>
        <h2 className="features-title">Ready to Start? 🚀</h2>
        <p className="text-muted mb-xl" style={{ fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
          Join CodeQuest today and begin your coding adventure. It's free, fun, and designed just for you!
        </p>
        <Link to="/register" className="btn btn-primary btn-lg">
          🌟 Create Your Free Account
        </Link>
      </section>
    </>
  );
}
