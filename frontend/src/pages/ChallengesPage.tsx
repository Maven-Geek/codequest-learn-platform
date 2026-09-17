// ============================================================
// CodeQuest — Challenges & Code Golf Page (Recommendations #5, #6, #8)
// Daily Quests, Character Counter, Timer, and Real-Time Leaderboard
// ============================================================

import { useState, useEffect } from 'react';
import CodeEditor from '../components/CodeEditor';
import LanguageSelector from '../components/LanguageSelector';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CodingChallenge, ChallengeSubmission, CodingLanguage } from '../../../shared/src/types';
import { playSound } from '../utils/audio';

export default function ChallengesPage() {
  const { user, updatePreferredLanguage } = useAuth();
  const [language, setLanguage] = useState<CodingLanguage>(user?.preferred_coding_language || 'python');
  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<CodingChallenge | null>(null);
  const [code, setCode] = useState('');
  const [leaderboard, setLeaderboard] = useState<ChallengeSubmission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ passed: boolean; text: string; xp?: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);

  const loadChallenges = async (lang: CodingLanguage) => {
    try {
      const res = await api.getCodingChallenges(lang);
      if (res.data) {
        setChallenges(res.data);
        if (res.data.length > 0) {
          selectChallenge(res.data[0]);
        } else {
          setSelectedChallenge(null);
        }
      }
    } catch (err) {
      console.error('Failed to load challenges:', err);
    }
  };

  useEffect(() => {
    loadChallenges(language);
  }, [language]);

  const selectChallenge = async (ch: CodingChallenge) => {
    setSelectedChallenge(ch);
    setCode(ch.starter_code || '');
    setResultMessage(null);
    setTimeLeft(ch.time_limit_seconds || 180);
    setTimerActive(true);

    try {
      const lbRes = await api.getChallengeLeaderboard(ch.id);
      if (lbRes.data) setLeaderboard(lbRes.data);
    } catch {
      // ignore
    }
  };

  // Timer countdown effect
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const handleLanguageSelect = (lang: CodingLanguage) => {
    setLanguage(lang);
    updatePreferredLanguage(lang);
  };

  const handleSubmit = async () => {
    if (!selectedChallenge) return;
    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await api.submitChallenge(selectedChallenge.id, {
        code,
        execution_time_ms: (selectedChallenge.time_limit_seconds || 180) - timeLeft,
      });

      if (res.data.passed) {
        playSound('correct');
        setResultMessage({
          passed: true,
          text: `🎉 Challenge Conquered! Code Length: ${res.data.codeLength} characters!`,
          xp: res.data.xpEarned,
        });
        // Refresh leaderboard & streak
        const lbRes = await api.getChallengeLeaderboard(selectedChallenge.id);
        if (lbRes.data) setLeaderboard(lbRes.data);
        await api.updateStreak();
      } else {
        playSound('wrong');
        setResultMessage({
          passed: false,
          text: '⚠️ Code did not meet the challenge solution pattern. Try refining your code!',
        });
      }
    } catch (err: any) {
      setResultMessage({
        passed: false,
        text: err.message || 'Submission failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="page-container">
      {/* Hero Banner */}
      <div
        className="card mb-lg"
        style={{
          background: 'linear-gradient(135deg, #d9480f, #e8590c)',
          color: 'white',
          padding: 'var(--space-xl)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
        }}
      >
        <div className="flex-between">
          <div>
            <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>
              ⚔️ Coding Challenges & Code Golf
            </h1>
            <p style={{ opacity: 0.9, margin: 0, maxWidth: '600px' }}>
              Solve challenges in the fewest characters possible! Compete on the Code Golf Leaderboard, beat the clock, and earn bonus XP!
            </p>
          </div>

          <div className="playground-stats-pill">
            <span>🔥 Coding Streak: {user?.coding_streak_count || 0} Days</span>
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="flex-between mb-lg flex-wrap gap-md">
        <LanguageSelector
          selectedLanguage={language}
          onSelectLanguage={handleLanguageSelect}
          compact
        />

        {selectedChallenge && (
          <div className="golf-stats-bar">
            <div className="golf-stat-item">
              <span className="golf-stat-label">Chars:</span>
              <span className="golf-stat-value">{code.trim().length}</span>
            </div>
            <div className="golf-stat-item">
              <span className="golf-stat-label">Timer:</span>
              <span className={`golf-stat-value ${timeLeft < 30 ? 'text-danger' : ''}`}>
                ⏱ {formatTime(timeLeft)}
              </span>
            </div>
            <div className="golf-stat-item">
              <span className="golf-stat-label">Reward:</span>
              <span className="golf-stat-value">⭐ {selectedChallenge.xp_reward} XP</span>
            </div>
          </div>
        )}
      </div>

      <div className="two-col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-xl)' }}>
        {/* Main Coding Area */}
        <div>
          {selectedChallenge ? (
            <div>
              {/* Challenge Brief */}
              <div className="card mb-md" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                <div className="flex-between mb-xs">
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
                    {selectedChallenge.title}
                  </h3>
                  <span className={`difficulty-tag ${selectedChallenge.difficulty.toLowerCase()}`}>
                    {selectedChallenge.difficulty}
                  </span>
                </div>
                <p style={{ margin: '8px 0', color: 'var(--color-text-secondary)' }}>
                  {selectedChallenge.prompt}
                </p>
              </div>

              {/* Code Editor */}
              <div className="mb-md">
                <CodeEditor
                  initialCode={code}
                  language={language}
                  onChange={(c) => setCode(c)}
                  minHeight="280px"
                />
              </div>

              {/* Submit & Result */}
              <div className="flex-between mb-md">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Verifying...' : '⛳ Submit Solution for Code Golf'}
                </button>
              </div>

              {resultMessage && (
                <div className={`card ${resultMessage.passed ? 'bg-success-light' : 'bg-danger-light'}`}>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {resultMessage.text}
                  </div>
                  {resultMessage.xp && (
                    <div className="mt-xs">
                      Awarded <strong>+{resultMessage.xp} XP</strong> to your profile!
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center p-xl">
              <p>No challenges available for this language yet.</p>
            </div>
          )}
        </div>

        {/* Sidebar: Challenge List + Leaderboard */}
        <div>
          {/* Challenges List */}
          <div className="card mb-lg">
            <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)' }}>
              🎯 Available Quests
            </h4>
            <div className="challenge-list-vertical">
              {challenges.map((ch) => (
                <div
                  key={ch.id}
                  className={`challenge-item-card ${selectedChallenge?.id === ch.id ? 'active' : ''}`}
                  onClick={() => selectChallenge(ch)}
                >
                  <div className="challenge-item-title">{ch.title}</div>
                  <div className="challenge-item-meta">
                    <span className="xp-badge">⭐ {ch.xp_reward} XP</span>
                    <span className="diff-text">{ch.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code Golf Leaderboard */}
          <div className="card">
            <div className="flex-between mb-md">
              <h4 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
                🏆 Golf Leaderboard
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Fewest chars</span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-md)' }}>
                <span className="empty-state-emoji">⛳</span>
                <p>Be the first to submit a compact solution!</p>
              </div>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.map((sub, rank) => (
                  <div key={sub.id} className="leaderboard-row">
                    <div className="leaderboard-rank">
                      {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                    </div>
                    <div className="leaderboard-user">
                      <span className="leaderboard-avatar">{sub.avatar_url || '🤖'}</span>
                      <span className="leaderboard-name">{sub.user_display_name || 'Coder'}</span>
                    </div>
                    <div className="leaderboard-score">
                      <strong>{sub.code_length}</strong> chars
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
