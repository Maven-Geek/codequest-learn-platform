// ============================================================
// CodeQuest — Lesson Page
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import DragDropActivity from '../components/DragDropActivity';
import CodingPuzzle from '../components/CodingPuzzle';
import QuizPlayer from '../components/QuizPlayer';

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [tab, setTab] = useState<'learn' | 'activity' | 'quiz'>('learn');
  const [activityDone, setActivityDone] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadLesson(parseInt(id));
  }, [id]);

  const loadLesson = async (lessonId: number) => {
    try {
      const [lessonRes, quizRes] = await Promise.all([
        api.getLesson(lessonId),
        api.getLessonQuiz(lessonId).catch(() => null),
      ]);
      setLesson(lessonRes.data);
      if (quizRes) setQuiz(quizRes.data);
    } catch (err) {
      console.error('Failed to load lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityComplete = async () => {
    setActivityDone(true);
    if (id) {
      try {
        await api.completeActivity(parseInt(id));
      } catch (err) {
        console.error('Failed to save activity progress:', err);
      }
    }
    setTimeout(() => setTab('quiz'), 2000);
  };

  const handleQuizSubmit = async (answers: any[]) => {
    if (!quiz) return;
    try {
      const res = await api.submitQuiz(quiz.id, answers);
      setQuizResult(res.data);
      if (res.data.passed) {
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    }
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering
    return text
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
      })
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading-spinner">🚀</div>;
  if (!lesson) return <div className="page-container"><div className="empty-state"><span className="empty-state-emoji">😢</span><p>Lesson not found</p></div></div>;

  return (
    <div className="lesson-content">
      {/* Header */}
      <div className="flex-between mb-lg">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/learn')}>
          ← Back to Map
        </button>
        <span className="text-muted" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          {lesson.level_title}
        </span>
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)' }}>{lesson.title}</h1>

      {/* Tabs */}
      <div className="lesson-tabs">
        <button
          className={`lesson-tab ${tab === 'learn' ? 'active' : ''}`}
          onClick={() => setTab('learn')}
        >
          📖 Learn
        </button>
        <button
          className={`lesson-tab ${tab === 'activity' ? 'active' : ''} ${activityDone ? 'completed-tab' : ''}`}
          onClick={() => setTab('activity')}
        >
          🧩 Activity
        </button>
        <button
          className={`lesson-tab ${tab === 'quiz' ? 'active' : ''} ${quizResult ? 'completed-tab' : ''}`}
          onClick={() => setTab('quiz')}
          disabled={!quiz}
        >
          📝 Quiz
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'learn' && (
        <div className="card">
          <div className="lesson-explanation">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.explanation) }} />
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-light)', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)' }}>📌 Example</h3>
            <div className="lesson-explanation">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.example) }} />
            </div>
          </div>
          <div className="text-center mt-xl">
            <button className="btn btn-primary btn-lg" onClick={() => setTab('activity')}>
              Ready? Start the Activity! 🧩
            </button>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {lesson.activity_type === 'drag-drop' && (
            <DragDropActivity
              activity={lesson.activity_data}
              onComplete={handleActivityComplete}
            />
          )}
          {(lesson.activity_type === 'puzzle' || lesson.activity_type === 'pattern') && (
            <CodingPuzzle
              activity={lesson.activity_data}
              onComplete={handleActivityComplete}
            />
          )}
          {lesson.activity_type === 'game' && (
            <DragDropActivity
              activity={{
                ...lesson.activity_data,
                correctSequence: [], // Free play - any sequence works
              }}
              onComplete={handleActivityComplete}
            />
          )}
        </div>
      )}

      {tab === 'quiz' && quiz && !quizResult && (
        <div className="card">
          <QuizPlayer
            questions={quiz.questions}
            quizId={quiz.id}
            onSubmit={handleQuizSubmit}
          />
        </div>
      )}

      {tab === 'quiz' && quizResult && (
        <div className="card text-center" style={{ padding: 'var(--space-3xl) var(--space-xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>
            {quizResult.passed ? '🎉' : '💪'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)', color: quizResult.passed ? 'var(--color-primary)' : 'var(--color-text)' }}>
            {quizResult.passed ? 'Quiz Passed!' : 'Keep Trying!'}
          </h2>

          <div className="dashboard-grid" style={{ maxWidth: '400px', margin: '0 auto var(--space-xl)' }}>
            <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
              <div className="stat-card-info" style={{ textAlign: 'center' }}>
                <div className="stat-card-value" style={{ color: quizResult.passed ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}>
                  {quizResult.score}%
                </div>
                <div className="stat-card-label">Score</div>
              </div>
            </div>
            <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
              <div className="stat-card-info" style={{ textAlign: 'center' }}>
                <div className="stat-card-value">{quizResult.correct_count}/{quizResult.total_count}</div>
                <div className="stat-card-label">Correct</div>
              </div>
            </div>
          </div>

          {quizResult.passed && (
            <div className="mb-lg" style={{ maxWidth: '500px', margin: '0 auto var(--space-xl)' }}>
              <div className="alert alert-success text-center">
                <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>⭐ You earned {quizResult.points_earned} points!</span>
              </div>
              {quizResult.badges_earned?.length > 0 && (
                <div className="alert alert-info mt-sm text-center">
                  <span style={{ fontWeight: 600 }}>🏅 New badge{quizResult.badges_earned.length > 1 ? 's' : ''}:</span>
                  <br/>
                  {quizResult.badges_earned.map((b: any) => `${b.icon_emoji} ${b.name}`).join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="flex-center gap-md">
            {quizResult.passed ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/learn')}>
                Continue Learning →
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => { setQuizResult(null); }}>
                  🔄 Retry Quiz
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/learn')}>
                  Back to Map
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Celebration Overlay */}
      {showCelebration && (
        <>
          <Confetti />
          <div className="celebration-overlay" onClick={() => setShowCelebration(false)}>
            <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
              <div className="celebration-emoji">🏆</div>
              <h2 className="celebration-title">Awesome Job!</h2>
              <p className="celebration-text">
                You completed "{lesson.title}" and earned points!
              </p>
              <div className="celebration-stats">
                <div className="celebration-stat">
                  <div className="celebration-stat-value">{quizResult?.score}%</div>
                  <div className="celebration-stat-label">Quiz Score</div>
                </div>
                <div className="celebration-stat">
                  <div className="celebration-stat-value">+{quizResult?.points_earned}</div>
                  <div className="celebration-stat-label">Points</div>
                </div>
              </div>
              {quizResult?.badges_earned?.length > 0 && (
                <div className="mb-lg">
                  <p className="text-muted mb-sm">New Badges:</p>
                  <div className="flex-center gap-md">
                    {quizResult.badges_earned.map((badge: any) => (
                      <div key={badge.id} className="badge-item earned" style={{ padding: 'var(--space-md)' }}>
                        <span className="badge-emoji">{badge.icon_emoji}</span>
                        <span className="badge-name">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button className="btn btn-primary btn-lg" onClick={() => { setShowCelebration(false); navigate('/learn'); }}>
                🚀 Continue Adventure!
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Confetti component
function Confetti() {
  const colors = ['#00639c', '#4dabf7', '#fed33a', '#4caf50', '#ff9800', '#7e57c2', '#ec407a'];
  const pieces = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: `${Math.random() * 2}s`,
    size: 8 + Math.random() * 12,
    shape: Math.random() > 0.5 ? '50%' : '0',
  }));

  return (
    <div className="confetti-container">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            borderRadius: piece.shape,
          }}
        />
      ))}
    </div>
  );
}
