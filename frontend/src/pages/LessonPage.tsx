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
      let lessonData = lessonRes.data;
      if (lessonData && (lessonData.id === 6 || lessonData.title?.includes('Making Decisions'))) {
        if (!lessonData.activity_data?.availableBlocks || lessonData.activity_data.availableBlocks.length < 7) {
          lessonData = {
            ...lessonData,
            activity_data: {
              ...lessonData.activity_data,
              instructions: 'Help the robot navigate the maze! Use IF blocks to handle walls.',
              availableBlocks: [
                { id: 'move-m', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'if-wall', type: 'if-wall', label: '🟩 If Wall → Turn Left', color: '#2ECC71', turnDirection: 'left' },
                { id: 'move-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'move-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'turn-r-m', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'move-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'move-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' }
              ],
              correctSequence: ['move-m', 'if-wall', 'move-m2', 'move-m3', 'turn-r-m', 'move-m4', 'move-m5'],
              gridSize: { rows: 3, cols: 4 },
              startPosition: { row: 2, col: 0 },
              endPosition: { row: 0, col: 3 },
              walls: [{ row: 2, col: 2 }],
              characterEmoji: '🤖',
              goalEmoji: '🏁'
            }
          };
        }
      }
      if (lessonData && (lessonData.id === 7 || lessonData.title?.includes('Variables') || (lessonData.example && (lessonData.example.includes('StepActioncoins') || lessonData.example.includes('coins value'))))) {
        const activityData = (!lessonData.activity_data?.availableBlocks || lessonData.activity_data.availableBlocks.length < 9)
          ? {
              ...lessonData.activity_data,
              instructions: 'Help the robot collect all 3 coins! Watch the coin counter variable change as you collect them.',
              availableBlocks: [
                { id: 'move-v1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'pick-1', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
                { id: 'move-v2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'move-v3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'pick-2', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
                { id: 'move-v4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'move-v5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'pick-3', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
                { id: 'move-v6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' }
              ],
              correctSequence: ['move-v1', 'pick-1', 'move-v2', 'move-v3', 'pick-2', 'move-v4', 'move-v5', 'pick-3', 'move-v6'],
              gridSize: { rows: 1, cols: 7 },
              startPosition: { row: 0, col: 0 },
              endPosition: { row: 0, col: 6 },
              collectibles: [{ row: 0, col: 1 }, { row: 0, col: 3 }, { row: 0, col: 5 }],
              characterEmoji: '🤖',
              goalEmoji: '🏆'
            }
          : lessonData.activity_data;

        lessonData = {
          ...lessonData,
          activity_data: activityData,
          example: `## Example: Counting Coins 🪙\n\n**Variable:** \`coins = 0\`\n\n| Step | Action | coins value |\n|:---:|:---|:---|\n| 1 | 🪙 Pick up coin | \`coins = 1\` |\n| 2 | 🪙 Pick up coin | \`coins = 2\` |\n| 3 | 🪙 Pick up coin | \`coins = 3\` |\n\nThe variable **"coins"** keeps track of how many coins we've collected!\n\nAt the end, we can check: *"Do we have 3 coins?"* ✅`
        };
      }
      setLesson(lessonData);
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
    if (!text) return '';

    // If squished or raw unformatted table text was loaded, format it into a clean markdown table
    let cleanText = text.replace(
      /Step\s*Action\s*coins\s*value[\s\-]*1\s*Pick\s*up\s*coin\s*coins\s*=\s*1[\s\-]*2\s*Pick\s*up\s*coin\s*coins\s*=\s*2[\s\-]*3\s*Pick\s*up\s*coin\s*coins\s*=\s*3/gi,
      `| Step | Action | coins value |\n|:---:|:---|:---|\n| 1 | 🪙 Pick up coin | \`coins = 1\` |\n| 2 | 🪙 Pick up coin | \`coins = 2\` |\n| 3 | 🪙 Pick up coin | \`coins = 3\``
    );

    const formatInline = (str: string) => {
      return str
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    };

    const lines = cleanText.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Headers
      if (/^### (.+)$/.test(trimmed)) {
        const match = trimmed.match(/^### (.+)$/);
        result.push(`<h3>${formatInline(match ? match[1] : '')}</h3>`);
        i++;
        continue;
      }
      if (/^## (.+)$/.test(trimmed)) {
        const match = trimmed.match(/^## (.+)$/);
        result.push(`<h2>${formatInline(match ? match[1] : '')}</h2>`);
        i++;
        continue;
      }
      if (/^# (.+)$/.test(trimmed)) {
        const match = trimmed.match(/^# (.+)$/);
        result.push(`<h1>${formatInline(match ? match[1] : '')}</h1>`);
        i++;
        continue;
      }

      // Markdown Table: block of lines starting and ending with |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const parseRow = (rowStr: string) => {
            const raw = rowStr.split('|');
            if (raw.length > 0 && raw[0].trim() === '') raw.shift();
            if (raw.length > 0 && raw[raw.length - 1].trim() === '') raw.pop();
            return raw.map(c => c.trim());
          };

          const isSeparator = (rowStr: string) => {
            const cells = parseRow(rowStr);
            return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));
          };

          const getAlignments = (delimiterStr: string) => {
            const cells = parseRow(delimiterStr);
            return cells.map(c => {
              const left = c.startsWith(':');
              const right = c.endsWith(':');
              if (left && right) return 'center';
              if (right) return 'right';
              return 'left';
            });
          };

          const headerCells = parseRow(tableLines[0]);
          let hasHeader = false;
          let alignments: string[] = [];
          let dataStartIndex = 1;

          if (tableLines.length > 1 && isSeparator(tableLines[1])) {
            hasHeader = true;
            alignments = getAlignments(tableLines[1]);
            dataStartIndex = 2;
          }

          let tableHtml = '<div class="lesson-table-wrapper"><table class="lesson-table">';
          if (hasHeader) {
            tableHtml += '<thead><tr>';
            headerCells.forEach((cell, idx) => {
              const align = alignments[idx] || 'left';
              tableHtml += `<th style="text-align: ${align}">${formatInline(cell)}</th>`;
            });
            tableHtml += '</tr></thead>';
          }

          tableHtml += '<tbody>';
          const start = hasHeader ? dataStartIndex : 0;
          for (let r = start; r < tableLines.length; r++) {
            if (isSeparator(tableLines[r])) continue;
            const cells = parseRow(tableLines[r]);
            tableHtml += '<tr>';
            cells.forEach((cell, idx) => {
              const align = alignments[idx] || 'left';
              tableHtml += `<td style="text-align: ${align}">${formatInline(cell)}</td>`;
            });
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody></table></div>';
          result.push(tableHtml);
          continue;
        }
      }

      // Unordered list
      if (/^[-*]\s+(.+)$/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^[-*]\s+(.+)$/.test(lines[i].trim())) {
          const match = lines[i].trim().match(/^[-*]\s+(.+)$/);
          listItems.push(`<li>${formatInline(match ? match[1] : '')}</li>`);
          i++;
        }
        result.push(`<ul>${listItems.join('')}</ul>`);
        continue;
      }

      // Ordered list
      if (/^\d+\.\s+(.+)$/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s+(.+)$/.test(lines[i].trim())) {
          const match = lines[i].trim().match(/^\d+\.\s+(.+)$/);
          listItems.push(`<li>${formatInline(match ? match[1] : '')}</li>`);
          i++;
        }
        result.push(`<ol>${listItems.join('')}</ol>`);
        continue;
      }

      // Regular paragraph
      const pLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^#{1,3}\s/.test(lines[i].trim()) &&
        !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
        !/^[-*]\s/.test(lines[i].trim()) &&
        !/^\d+\.\s/.test(lines[i].trim())
      ) {
        pLines.push(formatInline(lines[i].trim()));
        i++;
      }
      if (pLines.length > 0) {
        result.push(`<p>${pLines.join('<br/>')}</p>`);
      }
    }

    return result.join('\n');
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
