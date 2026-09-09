// ============================================================
// CodeQuest — Level Map Page (Learner Dashboard)
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LevelMapPage() {
  const [levels, setLevels] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [levelsRes, summaryRes] = await Promise.all([
        api.getLevels(),
        api.getProgressSummary(),
      ]);
      setLevels(levelsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to load levels:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectLevel = async (level: any) => {
    if (!level.is_unlocked) return;
    setSelectedLevel(level);
    try {
      const res = await api.getLevelLessons(level.id);
      setLessons(res.data);
    } catch (err) {
      console.error('Failed to load lessons:', err);
    }
  };

  if (loading) return <div className="loading-spinner">🚀</div>;

  return (
    <div className="page-container">
      {/* Hero banner */}
      {summary && (
        <div className="card mb-xl" style={{
          background: 'linear-gradient(135deg, #4dabf7, #00639c)',
          color: 'white',
          padding: 'var(--space-2xl)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'white', marginBottom: 'var(--space-sm)' }}>
            Ready for an adventure?
          </h2>
          <p style={{ opacity: 0.9, marginBottom: 'var(--space-lg)', maxWidth: '500px' }}>
            You're making great progress! Complete the next lesson to earn a shiny new badge.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-pill)',
            padding: 'var(--space-sm) var(--space-lg)'
          }}>
            <span style={{ fontWeight: 600 }}>World Progress</span>
            <span>{summary.completion_percentage}%</span>
            <div style={{
              width: '120px',
              height: '8px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 'var(--radius-pill)',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${summary.completion_percentage}%`,
                height: '100%',
                background: 'var(--color-secondary-container)',
                borderRadius: 'var(--radius-pill)'
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      {summary && (
        <div className="dashboard-grid mb-xl">
          <div className="stat-card">
            <div className="stat-card-icon blue">⭐</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Total Points</div>
              <div className="stat-card-value">{summary.total_points}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green">📚</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Lessons Completed</div>
              <div className="stat-card-value">{summary.completed_lessons}/{summary.total_lessons}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon yellow">🏅</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Badges Earned</div>
              <div className="stat-card-value">{summary.badges_earned}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon orange">📊</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Avg Quiz Score</div>
              <div className="stat-card-value">{summary.average_quiz_score}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Your Path */}
      <div className="flex-between mb-lg">
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Your Path</h2>
        {selectedLevel && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLevel(null)}>
            View Full Map
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedLevel ? '1fr 1fr' : '1fr', gap: 'var(--space-xl)' }} className="two-col-responsive">
        {/* Level Map */}
        <div>
          <div className="level-map" style={{ padding: 0 }}>
            {levels.map((level, index) => {
              const isCompleted = level.completed_count >= level.lesson_count && level.lesson_count > 0;
              const isCurrent = level.is_unlocked && !isCompleted;
              const isLocked = !level.is_unlocked;

              return (
                <div
                  key={level.id}
                  className={`level-node ${isCompleted ? 'completed' : isCurrent ? 'current unlocked' : isLocked ? 'locked' : 'unlocked'}`}
                  onClick={() => selectLevel(level)}
                  style={{ cursor: level.is_unlocked ? 'pointer' : 'not-allowed' }}
                >
                  <div className="level-node-icon">
                    {isCompleted ? '✅' : level.icon_emoji}
                  </div>
                  <div className="level-node-content">
                    <div className="level-node-title">{level.icon_emoji} {level.title}</div>
                    <div className="level-node-desc">{level.description}</div>
                    <div className="progress-bar-container" style={{ height: '8px' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: level.lesson_count > 0 ? `${(level.completed_count / level.lesson_count) * 100}%` : '0%',
                        }}
                      />
                    </div>
                    <div className="progress-bar-label">
                      <span>{level.completed_count}/{level.lesson_count} lessons</span>
                      {isLocked && <span>🔒 Locked</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lessons List */}
        {selectedLevel && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
              {selectedLevel.icon_emoji} {selectedLevel.title} — Lessons
            </h2>
            <div className="lesson-list">
              {lessons.map((lesson, index) => {
                const isAccessible = index === 0 || lessons[index - 1]?.is_completed;
                const isNext = isAccessible && !lesson.is_completed;
                return (
                  <div
                    key={lesson.id}
                    className={`lesson-card ${lesson.is_completed ? 'completed' : ''}`}
                    onClick={() => isAccessible && navigate(`/lesson/${lesson.id}`)}
                    style={{
                      cursor: isAccessible ? 'pointer' : 'not-allowed',
                      opacity: isAccessible ? 1 : 0.5,
                      borderColor: isNext ? 'var(--color-primary)' : undefined,
                      borderWidth: isNext ? '2px' : undefined,
                    }}
                  >
                    <div className="lesson-card-number">
                      {lesson.is_completed ? '✓' : index + 1}
                    </div>
                    <div className="lesson-card-info">
                      <div className="lesson-card-title">{lesson.title}</div>
                      <div className="lesson-card-type">
                        {lesson.activity_type === 'drag-drop' ? '🧩 Drag & Drop' :
                         lesson.activity_type === 'puzzle' ? '🧩 Puzzle' :
                         lesson.activity_type === 'game' ? '🎮 Game' : '📝 Activity'}
                      </div>
                    </div>
                    {lesson.quiz_score !== null && (
                      <div className="lesson-card-score">
                        {lesson.quiz_score}% {lesson.quiz_passed ? '✅' : ''}
                      </div>
                    )}
                    {isNext && (
                      <span className="btn btn-primary btn-sm">Play Now</span>
                    )}
                    {!isAccessible && <span style={{ fontSize: '1.2rem' }}>🔒</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
