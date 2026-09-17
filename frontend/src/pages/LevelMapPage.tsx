// ============================================================
// CodeQuest — Level Map Page (Learner Dashboard)
// Integrated with Multi-Language Coding Levels (5-7),
// Language Switcher, Daily Streak, and Playground shortcuts
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/LanguageSelector';
import { CodingLanguage } from '../../../shared/src/types';

export default function LevelMapPage() {
  const { user, updatePreferredLanguage } = useAuth();
  const isAllUnlocked = Boolean(user?.all_lessons_unlocked || user?.role === 'admin');
  const [selectedLanguage, setSelectedLanguage] = useState<CodingLanguage>(
    user?.preferred_coding_language || 'python'
  );
  const [levels, setLevels] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData(selectedLanguage);
  }, []);

  const loadData = async (lang: CodingLanguage) => {
    try {
      setLoading(true);
      const [levelsRes, summaryRes] = await Promise.all([
        api.getLevels(lang),
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

  const handleLanguageChange = async (lang: CodingLanguage) => {
    setSelectedLanguage(lang);
    await updatePreferredLanguage(lang);
    const levelsRes = await api.getLevels(lang);
    setLevels(levelsRes.data);

    if (selectedLevel) {
      const res = await api.getLevelLessons(selectedLevel.id, lang);
      setLessons(res.data);
    }
  };

  const selectLevel = async (level: any) => {
    if (!level.is_unlocked && !isAllUnlocked) return;
    setSelectedLevel(level);
    try {
      const res = await api.getLevelLessons(level.id, selectedLanguage);
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
        <div
          className="card mb-xl"
          style={{
            background: 'linear-gradient(135deg, #4dabf7, #00639c)',
            color: 'white',
            padding: 'var(--space-2xl)',
            borderRadius: 'var(--radius-xl)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="flex-between flex-wrap gap-md">
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  color: 'white',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                Ready for an adventure, {user?.display_name || 'Explorer'}? 🚀
              </h2>
              {isAllUnlocked && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: 'var(--space-md)',
                  }}
                >
                  🔓 All Lessons Unlocked (All-Access Mode)
                </div>
              )}
              <p style={{ opacity: 0.9, marginBottom: 'var(--space-lg)', maxWidth: '500px' }}>
                Master block coding foundations and level up to real code in <strong>Python</strong>, <strong>JavaScript</strong>, or <strong>Java</strong>!
              </p>
            </div>

            {/* Daily Streak & Quick Actions */}
            <div className="hero-action-pills">
              <div className="streak-hero-badge">
                <span className="streak-hero-flame">🔥</span>
                <div>
                  <div className="streak-hero-count">{user?.coding_streak_count || 0} Day Streak</div>
                  <div className="streak-hero-sub">Keep the flame alive!</div>
                </div>
              </div>

              <div className="flex-gap-sm mt-sm">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/playground')}
                >
                  🧪 Playground
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/challenges')}
                >
                  ⚔️ Daily Quests
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius-pill)',
              padding: 'var(--space-sm) var(--space-lg)',
              marginTop: 'var(--space-sm)',
            }}
          >
            <span style={{ fontWeight: 600 }}>World Progress</span>
            <span>{summary.completion_percentage}%</span>
            <div
              style={{
                width: '120px',
                height: '8px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-pill)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${summary.completion_percentage}%`,
                  height: '100%',
                  background: 'var(--color-secondary-container)',
                  borderRadius: 'var(--radius-pill)',
                }}
              />
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
              <div className="stat-card-value">
                {summary.completed_lessons}/{summary.total_lessons}
              </div>
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
            <div className="stat-card-icon orange">🔥</div>
            <div className="stat-card-info">
              <div className="stat-card-label">Coding Streak</div>
              <div className="stat-card-value">{user?.coding_streak_count || 0} Days</div>
            </div>
          </div>
        </div>
      )}

      {/* Language Selector Track Switcher */}
      <div className="card mb-xl coding-track-selector-bar">
        <div className="flex-between flex-wrap gap-md">
          <div className="track-info">
            <span className="track-icon">💻</span>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
                Your Coding Track
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Levels 5–7 switch between Python, JavaScript, and Java
              </p>
            </div>
          </div>

          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onSelectLanguage={handleLanguageChange}
            compact
          />
        </div>
      </div>

      {/* Your Path */}
      <div className="flex-between mb-lg">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Learning Quest Map</h2>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Levels 1–4: Block Foundations | Levels 5–7: Text Coding ({selectedLanguage.toUpperCase()})
          </span>
        </div>
        {selectedLevel && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLevel(null)}>
            View Full Map
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedLevel ? '1fr 1fr' : '1fr',
          gap: 'var(--space-xl)',
        }}
        className="two-col-responsive"
      >
        {/* Level Map */}
        <div>
          <div className="level-map" style={{ padding: 0 }}>
            {levels.map((level) => {
              const isCompleted =
                level.completed_count >= level.lesson_count && level.lesson_count > 0;
              const isCurrent = (level.is_unlocked || isAllUnlocked) && !isCompleted;
              const isLocked = !level.is_unlocked && !isAllUnlocked;
              const isCodingLevel = level.order_index >= 5;

              return (
                <div
                  key={level.id}
                  className={`level-node ${
                    isCompleted
                      ? 'completed'
                      : isCurrent
                      ? 'current unlocked'
                      : isLocked
                      ? 'locked'
                      : 'unlocked'
                  } ${isCodingLevel ? 'level-node-coding' : ''}`}
                  onClick={() => selectLevel(level)}
                  style={{ cursor: (level.is_unlocked || isAllUnlocked) ? 'pointer' : 'not-allowed' }}
                >
                  <div className="level-node-icon">
                    {isCompleted ? '✅' : level.icon_emoji}
                  </div>
                  <div className="level-node-content">
                    <div className="level-node-title">
                      {level.icon_emoji} {level.title}
                      {isCodingLevel && (
                        <span className="coding-track-tag">
                          {selectedLanguage === 'python' ? '🐍 PY' : selectedLanguage === 'javascript' ? '⚡ JS' : '☕ JAVA'}
                        </span>
                      )}
                    </div>
                    <div className="level-node-desc">{level.description}</div>
                    <div className="progress-bar-container" style={{ height: '8px' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width:
                            level.lesson_count > 0
                              ? `${(level.completed_count / level.lesson_count) * 100}%`
                              : '0%',
                        }}
                      />
                    </div>
                    <div className="progress-bar-label">
                      <span>
                        {level.completed_count}/{level.lesson_count} lessons
                      </span>
                      {isLocked && <span>🔒 Locked</span>}
                      {isCodingLevel && !isLocked && <span>💻 Text Coding</span>}
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
            <div className="flex-between mb-md">
              <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
                {selectedLevel.icon_emoji} {selectedLevel.title} — Lessons
              </h2>
              {selectedLevel.order_index >= 5 && (
                <span className="badge-pill-lang">
                  Track: {selectedLanguage.toUpperCase()}
                </span>
              )}
            </div>

            <div className="lesson-list">
              {lessons.map((lesson, index) => {
                const isCoding = selectedLevel.order_index >= 5 || lesson.activity_type === 'coding';
                const isAccessible = isAllUnlocked || isCoding || index === 0 || lessons[index - 1]?.is_completed;
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
                        {lesson.activity_type === 'coding' ? '💻 Real Code' :
                         lesson.activity_type === 'drag-drop' ? '🧩 Drag & Drop' :
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
