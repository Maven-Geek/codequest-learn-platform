// ============================================================
// CodeQuest — Lesson Manager & Interactive Studio (Admin)
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface BlockItem {
  id: string;
  type: string;
  label: string;
  color: string;
  repeatCount?: number;
  turnDirection?: 'left' | 'right';
}

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id?: number;
  question_text: string;
  options: QuizOption[];
}

const PRESET_BLOCKS: BlockItem[] = [
  { id: 'b-move-1', type: 'move', label: 'Move Forward ➡️', color: '#4dabf7' },
  { id: 'b-move-2', type: 'move', label: 'Move Forward ➡️', color: '#4dabf7' },
  { id: 'b-move-3', type: 'move', label: 'Move Forward ➡️', color: '#4dabf7' },
  { id: 'b-turn-r', type: 'turn-right', label: 'Turn Right ⤵️', color: '#ffa94d' },
  { id: 'b-turn-l', type: 'turn-left', label: 'Turn Left ⤴️', color: '#ffa94d' },
  { id: 'b-rep-2', type: 'repeat', label: 'Repeat 2 times 🔁', color: '#da77f2', repeatCount: 2 },
  { id: 'b-rep-3', type: 'repeat', label: 'Repeat 3 times 🔁', color: '#da77f2', repeatCount: 3 },
  { id: 'b-if-wall', type: 'if-wall', label: 'If Wall Ahead 🧱', color: '#ff6b6b' },
  { id: 'b-pickup', type: 'pick-up', label: 'Pick Up 🪙', color: '#ffd43b' },
];

export default function LessonManager() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Editor View State
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'quiz'>('details');

  // Tab 1: Lesson Metadata
  const [formData, setFormData] = useState({
    level_id: 1,
    order_index: 1,
    title: '',
    explanation: '',
    example: '',
    activity_type: 'drag-drop',
    is_published: true,
  });

  // Tab 2: Activity Builder State
  const [activityInstructions, setActivityInstructions] = useState('Help the character reach the goal!');
  const [activityTheme, setActivityTheme] = useState<'classic' | 'space' | 'castle' | 'forest'>('classic');
  const [characterEmoji, setCharacterEmoji] = useState('🤖');
  const [goalEmoji, setGoalEmoji] = useState('🏆');
  const [gridRows, setGridRows] = useState(4);
  const [gridCols, setGridCols] = useState(4);
  const [startPos, setStartPos] = useState({ row: 0, col: 0 });
  const [endPos, setEndPos] = useState({ row: 3, col: 3 });
  const [walls, setWalls] = useState<{ row: number; col: number }[]>([]);
  const [coins, setCoins] = useState<{ row: number; col: number }[]>([]);
  const [keys, setKeys] = useState<{ row: number; col: number }[]>([]);
  const [doors, setDoors] = useState<{ row: number; col: number }[]>([]);
  const [stampTool, setStampTool] = useState<'start' | 'goal' | 'wall' | 'coin' | 'key' | 'door' | 'erase'>('wall');
  const [selectedBlocks, setSelectedBlocks] = useState<BlockItem[]>([...PRESET_BLOCKS.slice(0, 5)]);
  const [hintsList, setHintsList] = useState<string[]>(['Look closely at the obstacles on the path.', 'Count how many steps are needed.']);
  const [newHintText, setNewHintText] = useState('');
  const [maxBlocksStar, setMaxBlocksStar] = useState<number>(5);
  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('{}');

  // Tab 3: Quiz Builder State
  const [quizPassingScore, setQuizPassingScore] = useState(70);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoaded, setQuizLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lessonsRes, levelsRes] = await Promise.all([
        api.getAllLessons(),
        api.getLevels(),
      ]);
      setLessons(lessonsRes.data);
      setLevels(levelsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = async (lesson: any) => {
    setEditingLesson(lesson);
    setActiveTab('details');
    setSaveStatus(null);

    // Populate Tab 1
    setFormData({
      level_id: lesson.level_id,
      order_index: lesson.order_index,
      title: lesson.title,
      explanation: lesson.explanation || '',
      example: lesson.example || '',
      activity_type: lesson.activity_type || 'drag-drop',
      is_published: !!lesson.is_published,
    });

    // Populate Tab 2
    const actData = typeof lesson.activity_data === 'string'
      ? JSON.parse(lesson.activity_data || '{}')
      : (lesson.activity_data || {});

    setActivityInstructions(actData.instructions || 'Help the character reach the goal!');
    setActivityTheme(actData.theme || 'classic');
    setCharacterEmoji(actData.characterEmoji || (actData.theme === 'space' ? '🚀' : actData.theme === 'castle' ? '🧙‍♂️' : actData.theme === 'forest' ? '🦊' : '🤖'));
    setGoalEmoji(actData.goalEmoji || (actData.theme === 'space' ? '🪐' : actData.theme === 'castle' ? '🏰' : actData.theme === 'forest' ? '🌳' : '🏆'));
    setGridRows(actData.gridSize?.rows || 4);
    setGridCols(actData.gridSize?.cols || 4);
    setStartPos(actData.startPosition || { row: 0, col: 0 });
    setEndPos(actData.endPosition || { row: (actData.gridSize?.rows || 4) - 1, col: (actData.gridSize?.cols || 4) - 1 });
    setWalls(actData.walls || []);
    setCoins(actData.collectibles || []);
    setKeys(actData.keys || []);
    setDoors(actData.doors || []);
    setSelectedBlocks(actData.availableBlocks && actData.availableBlocks.length > 0 ? actData.availableBlocks : [...PRESET_BLOCKS.slice(0, 5)]);
    setHintsList(actData.hints && actData.hints.length > 0 ? actData.hints : ['Think step-by-step.', 'Try breaking your movement into turns and steps.']);
    setMaxBlocksStar(actData.maxBlocksStar || (actData.correctSequence?.length ? actData.correctSequence.length : 5));
    setRawJsonText(JSON.stringify(actData, null, 2));

    // Populate Tab 3: Quiz
    try {
      const quizRes = await api.getLessonQuiz(lesson.id);
      if (quizRes.data) {
        setQuizPassingScore(quizRes.data.passing_score || 70);
        setQuizQuestions(quizRes.data.questions || []);
        setQuizLoaded(true);
      } else {
        setQuizPassingScore(70);
        setQuizQuestions([]);
        setQuizLoaded(false);
      }
    } catch {
      setQuizPassingScore(70);
      setQuizQuestions([]);
      setQuizLoaded(false);
    }

    setShowForm(true);
  };

  const startNewLesson = () => {
    setEditingLesson(null);
    setActiveTab('details');
    setSaveStatus(null);

    setFormData({
      level_id: 1,
      order_index: lessons.length + 1,
      title: '',
      explanation: '',
      example: '',
      activity_type: 'drag-drop',
      is_published: true,
    });

    setActivityInstructions('Help the character reach the goal!');
    setActivityTheme('classic');
    setCharacterEmoji('🤖');
    setGoalEmoji('🏆');
    setGridRows(4);
    setGridCols(4);
    setStartPos({ row: 0, col: 0 });
    setEndPos({ row: 3, col: 3 });
    setWalls([{ row: 1, col: 1 }, { row: 2, col: 2 }]);
    setCoins([{ row: 0, col: 2 }]);
    setKeys([]);
    setDoors([]);
    setSelectedBlocks([...PRESET_BLOCKS.slice(0, 5)]);
    setHintsList(['Plan your path before running the code.']);
    setMaxBlocksStar(5);
    setRawJsonText('{}');

    setQuizPassingScore(70);
    setQuizQuestions([
      {
        question_text: 'What was the main concept in this lesson?',
        options: [
          { text: 'Sequencing instructions step by step', isCorrect: true },
          { text: 'Random guessing', isCorrect: false },
          { text: 'Closing the browser window', isCorrect: false },
        ]
      }
    ]);
    setQuizLoaded(false);

    setShowForm(true);
  };

  // Stamp Tool Canvas interaction
  const handleCellClick = (r: number, c: number) => {
    if (stampTool === 'start') {
      setStartPos({ row: r, col: c });
      setWalls(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setCoins(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setKeys(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setDoors(prev => prev.filter(w => !(w.row === r && w.col === c)));
    } else if (stampTool === 'goal') {
      setEndPos({ row: r, col: c });
      setWalls(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setCoins(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setKeys(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setDoors(prev => prev.filter(w => !(w.row === r && w.col === c)));
    } else if (stampTool === 'wall') {
      if (r === startPos.row && c === startPos.col) return;
      if (r === endPos.row && c === endPos.col) return;
      setCoins(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setKeys(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setDoors(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setWalls(prev => {
        const exists = prev.some(w => w.row === r && w.col === c);
        return exists ? prev.filter(w => !(w.row === r && w.col === c)) : [...prev, { row: r, col: c }];
      });
    } else if (stampTool === 'coin') {
      if (r === startPos.row && c === startPos.col) return;
      setWalls(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setKeys(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setDoors(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setCoins(prev => {
        const exists = prev.some(w => w.row === r && w.col === c);
        return exists ? prev.filter(w => !(w.row === r && w.col === c)) : [...prev, { row: r, col: c }];
      });
    } else if (stampTool === 'key') {
      if (r === startPos.row && c === startPos.col) return;
      setWalls(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setCoins(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setDoors(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setKeys(prev => {
        const exists = prev.some(w => w.row === r && w.col === c);
        return exists ? prev.filter(w => !(w.row === r && w.col === c)) : [...prev, { row: r, col: c }];
      });
    } else if (stampTool === 'door') {
      if (r === startPos.row && c === startPos.col) return;
      setWalls(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setCoins(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setKeys(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setDoors(prev => {
        const exists = prev.some(w => w.row === r && w.col === c);
        return exists ? prev.filter(w => !(w.row === r && w.col === c)) : [...prev, { row: r, col: c }];
      });
    } else if (stampTool === 'erase') {
      setWalls(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setCoins(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setKeys(prev => prev.filter(w => !(w.row === r && w.col === c)));
      setDoors(prev => prev.filter(w => !(w.row === r && w.col === c)));
    }
  };

  const handleThemeChange = (t: 'classic' | 'space' | 'castle' | 'forest') => {
    setActivityTheme(t);
    if (t === 'space') {
      setCharacterEmoji('🚀');
      setGoalEmoji('🪐');
    } else if (t === 'castle') {
      setCharacterEmoji('🧙‍♂️');
      setGoalEmoji('🏰');
    } else if (t === 'forest') {
      setCharacterEmoji('🦊');
      setGoalEmoji('🌳');
    } else {
      setCharacterEmoji('🤖');
      setGoalEmoji('🏆');
    }
  };

  const handleAddBlockToPalette = (preset: BlockItem) => {
    const newId = `${preset.id}-${Date.now().toString().slice(-4)}`;
    setSelectedBlocks(prev => [...prev, { ...preset, id: newId }]);
  };

  const handleRemoveBlockFromPalette = (index: number) => {
    setSelectedBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddHint = () => {
    if (!newHintText.trim()) return;
    setHintsList(prev => [...prev, newHintText.trim()]);
    setNewHintText('');
  };

  const handleRemoveHint = (idx: number) => {
    setHintsList(prev => prev.filter((_, i) => i !== idx));
  };

  // Quiz helper actions
  const handleAddQuestion = () => {
    setQuizQuestions(prev => [
      ...prev,
      {
        question_text: 'New Question',
        options: [
          { text: 'Correct Answer', isCorrect: true },
          { text: 'Incorrect Answer', isCorrect: false },
          { text: 'Another Incorrect Option', isCorrect: false },
        ]
      }
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuizQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (idx: number, text: string) => {
    setQuizQuestions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], question_text: text };
      return copy;
    });
  };

  const handleOptionTextChange = (qIdx: number, oIdx: number, text: string) => {
    setQuizQuestions(prev => {
      const copy = [...prev];
      const q = { ...copy[qIdx] };
      const opts = [...q.options];
      opts[oIdx] = { ...opts[oIdx], text };
      q.options = opts;
      copy[qIdx] = q;
      return copy;
    });
  };

  const handleSetCorrectOption = (qIdx: number, correctIdx: number) => {
    setQuizQuestions(prev => {
      const copy = [...prev];
      const q = { ...copy[qIdx] };
      q.options = q.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === correctIdx,
      }));
      copy[qIdx] = q;
      return copy;
    });
  };

  const handleAddOption = (qIdx: number) => {
    setQuizQuestions(prev => {
      const copy = [...prev];
      const q = { ...copy[qIdx] };
      q.options = [...q.options, { text: `Option ${q.options.length + 1}`, isCorrect: false }];
      copy[qIdx] = q;
      return copy;
    });
  };

  const handleRemoveOption = (qIdx: number, oIdx: number) => {
    setQuizQuestions(prev => {
      const copy = [...prev];
      const q = { ...copy[qIdx] };
      if (q.options.length <= 2) return copy; // Keep at least 2
      q.options = q.options.filter((_, i) => i !== oIdx);
      // Ensure at least one option is marked correct
      if (!q.options.some(o => o.isCorrect) && q.options.length > 0) {
        q.options[0].isCorrect = true;
      }
      copy[qIdx] = q;
      return copy;
    });
  };

  // Assemble full activity_data JSON
  const buildActivityData = () => {
    if (showRawJson) {
      try {
        return JSON.parse(rawJsonText);
      } catch {
        alert('Invalid JSON in raw editor. Please fix syntax errors before saving.');
        throw new Error('Invalid JSON');
      }
    }

    return {
      instructions: activityInstructions,
      theme: activityTheme,
      characterEmoji,
      goalEmoji,
      gridSize: { rows: gridRows, cols: gridCols },
      startPosition: startPos,
      endPosition: endPos,
      walls,
      collectibles: coins,
      keys,
      doors,
      availableBlocks: selectedBlocks,
      correctSequence: [],
      hints: hintsList,
      maxBlocksStar: maxBlocksStar || 5,
      objectives: [
        ...(coins.length > 0 ? [`Collect ${coins.length} Coin${coins.length > 1 ? 's' : ''}`] : []),
        ...(keys.length > 0 ? [`Find ${keys.length} Key${keys.length > 1 ? 's' : ''}`] : []),
        ...(doors.length > 0 ? [`Unlock ${doors.length} Door${doors.length > 1 ? 's' : ''}`] : []),
        'Reach the Goal 🏆',
      ],
    };
  };

  // Unified Save: Lesson + Activity + Quiz
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const activityData = buildActivityData();

      let savedLessonId: number;

      if (editingLesson) {
        // Update lesson
        await api.updateLesson(editingLesson.id, {
          ...formData,
          activity_data: activityData,
        });
        savedLessonId = editingLesson.id;
      } else {
        // Create lesson
        const res = await api.createLesson({
          ...formData,
          activity_data: activityData,
        });
        savedLessonId = res.data.id;
      }

      // Upsert Quiz if questions exist
      if (quizQuestions.length > 0) {
        await api.upsertLessonQuiz(savedLessonId, {
          passing_score: quizPassingScore,
          questions: quizQuestions,
        });
      }

      setSaveStatus('✅ Saved lesson, activity, and quiz successfully!');
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);

      loadData();
    } catch (err: any) {
      console.error('Failed to save:', err);
      setSaveStatus(`❌ Error: ${err.message || 'Failed to save'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lesson and its quiz?')) return;
    try {
      await api.deleteLesson(id);
      if (editingLesson && editingLesson.id === id) {
        setShowForm(false);
        setEditingLesson(null);
      }
      loadData();
    } catch (err) {
      console.error('Failed to delete lesson:', err);
    }
  };

  const levelColors = ['#4dabf7', '#f9a825', '#4caf50', '#ff9800', '#7e57c2', '#00897b'];

  const filteredLessons = lessons.filter(l =>
    l.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <Link to="/admin" className="text-muted" style={{ fontSize: '0.9rem' }}>
            ← Back to Dashboard
          </Link>
          <h1 className="page-title">Lesson Studio & Management</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (showForm) setShowForm(false);
            else startNewLesson();
          }}
        >
          {showForm ? '✕ Close Studio' : '+ Create New Lesson'}
        </button>
      </div>

      {/* Top Stats Overview */}
      <div className="dashboard-grid mb-xl">
        <div className="stat-card">
          <div className="stat-card-icon blue">📚</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Total Lessons</div>
            <div className="stat-card-value">{lessons.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">🎮</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Published Quests</div>
            <div className="stat-card-value">{lessons.filter(l => l.is_published).length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon yellow">⭐</div>
          <div className="stat-card-info">
            <div className="stat-card-label">Curriculum Levels</div>
            <div className="stat-card-value">{levels.length} Levels</div>
          </div>
        </div>
      </div>

      {/* Studio Drawer / Main Editor */}
      {showForm && (
        <div className="card mb-xl studio-card" style={{ border: '2px solid var(--color-primary)', boxShadow: '0 12px 36px rgba(0,0,0,0.12)' }}>
          {/* Studio Navigation Tabs */}
          <div className="studio-tabs-bar" style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--color-border-light)', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'details' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('details')}
            >
              📑 1. Lesson Content & Info
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'activity' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('activity')}
            >
              🎮 2. Interactive Activity Builder
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'quiz' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('quiz')}
            >
              📝 3. Quiz Builder ({quizQuestions.length} Questions)
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
              {saveStatus && (
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: saveStatus.startsWith('✅') ? 'var(--color-success)' : 'var(--color-accent-red)' }}>
                  {saveStatus}
                </span>
              )}
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={handleSaveAll}
                disabled={isSaving}
                style={{ fontWeight: 700 }}
              >
                {isSaving ? '⏳ Saving...' : '💾 Save All Changes'}
              </button>
            </div>
          </div>

          {/* TAB 1: Lesson Details & Markdown Preview */}
          {activeTab === 'details' && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>
                {editingLesson ? `✏️ Editing Lesson: ${editingLesson.title}` : '✨ Draft New Lesson'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }} className="two-col-responsive">
                <div className="form-group">
                  <label className="form-label">Lesson Title</label>
                  <input
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Master the Castle Maze"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Curriculum Level</label>
                  <select
                    className="form-select"
                    value={formData.level_id}
                    onChange={(e) => setFormData(p => ({ ...p, level_id: parseInt(e.target.value) }))}
                  >
                    {levels.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.icon_emoji} Level {l.level_number}: {l.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }} className="two-col-responsive">
                <div className="form-group">
                  <label className="form-label">Activity Type</label>
                  <select
                    className="form-select"
                    value={formData.activity_type}
                    onChange={(e) => setFormData(p => ({ ...p, activity_type: e.target.value }))}
                  >
                    <option value="drag-drop">🧩 Drag & Drop (Interactive Grid)</option>
                    <option value="game">🎮 Free Play Game</option>
                    <option value="puzzle">🧩 Code Puzzle</option>
                    <option value="pattern">🎨 Pattern Match</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Order in Level</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.order_index}
                    onChange={(e) => setFormData(p => ({ ...p, order_index: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Publish Status</label>
                  <select
                    className="form-select"
                    value={formData.is_published ? 'true' : 'false'}
                    onChange={(e) => setFormData(p => ({ ...p, is_published: e.target.value === 'true' }))}
                  >
                    <option value="true">✅ Published (Visible to Students)</option>
                    <option value="false">📝 Draft (Admin Only)</option>
                  </select>
                </div>
              </div>

              {/* Split-screen Markdown editor + preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }} className="two-col-responsive mt-md">
                <div>
                  <div className="form-group">
                    <label className="form-label">Explanation & Story (Markdown)</label>
                    <textarea
                      className="form-input"
                      rows={8}
                      value={formData.explanation}
                      onChange={(e) => setFormData(p => ({ ...p, explanation: e.target.value }))}
                      placeholder="Enter explanation, key concepts, bullet points..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Code Example / Syntax</label>
                    <textarea
                      className="form-input"
                      rows={5}
                      value={formData.example}
                      onChange={(e) => setFormData(p => ({ ...p, example: e.target.value }))}
                      placeholder="e.g. while (pathAhead) { moveForward(); }"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">👁️ Live Student Preview</label>
                  <div
                    className="card"
                    style={{
                      background: 'var(--color-bg-warm)',
                      minHeight: '340px',
                      maxHeight: '420px',
                      overflowY: 'auto',
                      padding: '16px',
                      fontSize: '0.9rem',
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>{formData.title || 'Untitled Lesson'}</h3>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {formData.explanation || <span className="text-muted">Type explanation on the left to preview...</span>}
                    </div>
                    {formData.example && (
                      <div className="mt-md">
                        <strong>Example:</strong>
                        <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '10px', borderRadius: '6px', overflowX: 'auto', marginTop: '6px' }}>
                          <code>{formData.example}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Interactive Activity Builder */}
          {activeTab === 'activity' && (
            <div>
              <div className="flex-between mb-md">
                <h3 style={{ margin: 0 }}>🎮 Visual Activity Builder</h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowRawJson(!showRawJson)}
                >
                  {showRawJson ? '🎨 Switch to Visual Stamp Tool' : '⚙️ View Raw JSON'}
                </button>
              </div>

              {showRawJson ? (
                <div className="form-group">
                  <label className="form-label">Raw activity_data JSON</label>
                  <textarea
                    className="form-input"
                    rows={16}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    value={rawJsonText}
                    onChange={(e) => setRawJsonText(e.target.value)}
                  />
                  <p className="text-muted mt-xs" style={{ fontSize: '0.8rem' }}>
                    You can edit the JSON directly or paste existing activity configurations.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Theme & Avatars selector */}
                  <div className="card mb-md" style={{ background: 'var(--color-bg-warm)', padding: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      <div>
                        <label className="form-label">Theme Environment</label>
                        <select
                          className="form-select"
                          value={activityTheme}
                          onChange={(e) => handleThemeChange(e.target.value as any)}
                        >
                          <option value="classic">🤖 Classic Tech (Slate/Blue)</option>
                          <option value="space">🚀 Cosmic Space (Nebula/Neon)</option>
                          <option value="castle">🏰 Medieval Castle (Stone/Torch)</option>
                          <option value="forest">🌲 Mystic Forest (Emerald/Moss)</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Character Avatar</label>
                        <input
                          className="form-input"
                          value={characterEmoji}
                          onChange={(e) => setCharacterEmoji(e.target.value)}
                          placeholder="e.g. 🤖, 🚀, 🧙‍♂️, 🦊"
                        />
                      </div>
                      <div>
                        <label className="form-label">Goal / Trophy</label>
                        <input
                          className="form-input"
                          value={goalEmoji}
                          onChange={(e) => setGoalEmoji(e.target.value)}
                          placeholder="e.g. 🏆, 🪐, 🏰, 💎"
                        />
                      </div>
                      <div>
                        <label className="form-label">3-Star Target Blocks</label>
                        <input
                          type="number"
                          className="form-input"
                          value={maxBlocksStar}
                          onChange={(e) => setMaxBlocksStar(parseInt(e.target.value) || 5)}
                          placeholder="Max blocks for efficiency star"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stamp Tool Bar & Grid Editor */}
                  <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-xl)' }} className="two-col-responsive mb-lg">
                    {/* Left: Stamp Tools & Grid Size */}
                    <div className="card" style={{ padding: '16px', background: 'var(--color-surface)' }}>
                      <label className="form-label mb-xs">Grid Dimensions</label>
                      <div className="flex gap-sm mb-md">
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Rows:</span>
                          <input
                            type="number"
                            min={2}
                            max={8}
                            className="form-input"
                            value={gridRows}
                            onChange={(e) => setGridRows(Math.max(2, Math.min(8, parseInt(e.target.value) || 4)))}
                            style={{ padding: '4px 8px' }}
                          />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Cols:</span>
                          <input
                            type="number"
                            min={2}
                            max={8}
                            className="form-input"
                            value={gridCols}
                            onChange={(e) => setGridCols(Math.max(2, Math.min(8, parseInt(e.target.value) || 4)))}
                            style={{ padding: '4px 8px' }}
                          />
                        </div>
                      </div>

                      <label className="form-label mb-xs">🖌️ Click Stamp Tool:</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${stampTool === 'start' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setStampTool('start')}
                          style={{ textAlign: 'left' }}
                        >
                          {characterEmoji} Start
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${stampTool === 'goal' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setStampTool('goal')}
                          style={{ textAlign: 'left' }}
                        >
                          {goalEmoji} Goal
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${stampTool === 'wall' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setStampTool('wall')}
                          style={{ textAlign: 'left' }}
                        >
                          🧱 Wall
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${stampTool === 'coin' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setStampTool('coin')}
                          style={{ textAlign: 'left' }}
                        >
                          🪙 Coin
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${stampTool === 'key' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setStampTool('key')}
                          style={{ textAlign: 'left' }}
                        >
                          🗝️ Key
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${stampTool === 'door' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setStampTool('door')}
                          style={{ textAlign: 'left' }}
                        >
                          🚪 Locked Door
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${stampTool === 'erase' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setStampTool('erase')}
                          style={{ gridColumn: 'span 2', textAlign: 'center' }}
                        >
                          ⬜ Erase Element
                        </button>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', lineHeight: 1.4 }}>
                        💡 <strong>How to design:</strong> Select a tool above, then click on the grid squares to stamp Start, Goal, Walls, Coins, Keys, or Doors!
                      </div>
                    </div>

                    {/* Right: Interactive Canvas */}
                    <div className="card text-center" style={{ padding: '20px', background: 'var(--color-surface)' }}>
                      <div className="mb-sm">
                        <label className="form-label">Activity Instructions</label>
                        <input
                          className="form-input"
                          value={activityInstructions}
                          onChange={(e) => setActivityInstructions(e.target.value)}
                          placeholder="Instructions displayed to the learner..."
                        />
                      </div>

                      {/* Interactive Canvas Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${gridCols}, 56px)`,
                          gridTemplateRows: `repeat(${gridRows}, 56px)`,
                          gap: '6px',
                          margin: '16px auto',
                          justifyContent: 'center',
                        }}
                      >
                        {Array.from({ length: gridRows * gridCols }).map((_, i) => {
                          const r = Math.floor(i / gridCols);
                          const c = i % gridCols;
                          const isStart = startPos.row === r && startPos.col === c;
                          const isGoal = endPos.row === r && endPos.col === c;
                          const isWall = walls.some(w => w.row === r && w.col === c);
                          const isCoin = coins.some(w => w.row === r && w.col === c);
                          const isKey = keys.some(w => w.row === r && w.col === c);
                          const isDoor = doors.some(w => w.row === r && w.col === c);

                          return (
                            <div
                              key={i}
                              onClick={() => handleCellClick(r, c)}
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '8px',
                                border: isStart ? '2px solid var(--color-primary)' : isGoal ? '2px solid var(--color-accent-green)' : '1px solid var(--color-border)',
                                background: isWall ? '#333' : isDoor ? '#5c3d2e' : 'var(--color-bg-warm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.6rem',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.15s ease',
                              }}
                              title={`Row ${r}, Col ${c} — Click to stamp ${stampTool}`}
                            >
                              {isStart ? characterEmoji : isGoal ? goalEmoji : isWall ? '🧱' : isDoor ? '🚪' : isKey ? '🗝️' : isCoin ? '🪙' : ''}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-md" style={{ justifyContent: 'center', fontSize: '0.85rem' }}>
                        <span>🧱 Walls: {walls.length}</span>
                        <span>🪙 Coins: {coins.length}</span>
                        <span>🗝️ Keys: {keys.length}</span>
                        <span>🚪 Doors: {doors.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Block Tray Builder */}
                  <div className="card mb-lg" style={{ background: 'var(--color-surface)', padding: '16px' }}>
                    <div className="flex-between mb-sm">
                      <label className="form-label" style={{ margin: 0 }}>
                        📦 Available Blocks for Learner ({selectedBlocks.length} blocks)
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      {selectedBlocks.map((b, idx) => (
                        <div
                          key={`${b.id}-${idx}`}
                          style={{
                            padding: '6px 12px',
                            background: b.color || 'var(--color-primary)',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>{b.label}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlockFromPalette(idx)}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginRight: '8px' }}>+ Add Block Preset:</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {PRESET_BLOCKS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleAddBlockToPalette(preset)}
                            style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Progressive Hints Manager */}
                  <div className="card" style={{ background: 'var(--color-surface)', padding: '16px' }}>
                    <label className="form-label mb-xs">💡 Progressive Hints ({hintsList.length})</label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: 0 }}>
                      Hints are revealed one at a time when learners ask for help.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {hintsList.map((hint, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'var(--color-bg-warm)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#f57f17' }}>Hint {idx + 1}:</span>
                          <span style={{ flex: 1, fontSize: '0.9rem' }}>{hint}</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRemoveHint(idx)}
                            style={{ color: 'var(--color-accent-red)', padding: '2px 6px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-sm">
                      <input
                        className="form-input"
                        placeholder="Type new hint (e.g. Try collecting the key first)..."
                        value={newHintText}
                        onChange={(e) => setNewHintText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHint())}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddHint}>
                        + Add Hint
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Quiz Builder */}
          {activeTab === 'quiz' && (
            <div>
              <div className="flex-between mb-lg">
                <div>
                  <h3 style={{ margin: 0 }}>📝 Lesson Quiz Builder</h3>
                  <p className="text-muted" style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    Quizzes reinforce the lesson concepts and award points and badges.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddQuestion}
                >
                  ➕ Add Question
                </button>
              </div>

              {/* Passing Score setting */}
              <div className="card mb-lg" style={{ background: 'var(--color-bg-warm)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <label className="form-label" style={{ margin: 0 }}>Passing Score Target: {quizPassingScore}%</label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                      Students must score at least this percentage to pass the lesson.
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={quizPassingScore}
                    onChange={(e) => setQuizPassingScore(parseInt(e.target.value))}
                    style={{ flex: 1, maxWidth: '280px' }}
                  />
                </div>
              </div>

              {/* Question list */}
              {quizQuestions.length === 0 ? (
                <div className="text-center p-xl" style={{ border: '2px dashed var(--color-border)', borderRadius: '12px' }}>
                  <p className="text-muted">No quiz questions added yet for this lesson.</p>
                  <button type="button" className="btn btn-primary btn-sm mt-xs" onClick={handleAddQuestion}>
                    ➕ Add First Question
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {quizQuestions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="card"
                      style={{
                        padding: '18px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                      }}
                    >
                      <div className="flex-between mb-sm">
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Question {qIdx + 1}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          style={{ color: 'var(--color-accent-red)', padding: '2px 8px' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>

                      <div className="form-group">
                        <input
                          className="form-input"
                          value={q.question_text}
                          onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                          placeholder="Enter question text..."
                          style={{ fontWeight: 600 }}
                        />
                      </div>

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                          Options (Select the radio button for the correct answer):
                        </span>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={opt.isCorrect}
                              onChange={() => handleSetCorrectOption(qIdx, oIdx)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              title="Mark as correct answer"
                            />
                            <input
                              className="form-input"
                              value={opt.text}
                              onChange={(e) => handleOptionTextChange(qIdx, oIdx, e.target.value)}
                              placeholder={`Option ${oIdx + 1}`}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                border: opt.isCorrect ? '2px solid var(--color-accent-green)' : undefined,
                                background: opt.isCorrect ? 'rgba(46, 125, 50, 0.05)' : undefined,
                              }}
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleRemoveOption(qIdx, oIdx)}
                                style={{ padding: '2px 6px', color: 'var(--color-text-dim)' }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}

                        {q.options.length < 5 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleAddOption(qIdx)}
                            style={{ alignSelf: 'flex-start', fontSize: '0.8rem', marginTop: '4px' }}
                          >
                            + Add Option
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Studio Footer Save Bar */}
          <div
            className="mt-xl pt-lg flex-between"
            style={{ borderTop: '2px solid var(--color-border-light)' }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleSaveAll}
              disabled={isSaving}
              style={{ fontWeight: 800, padding: '10px 32px' }}
            >
              {isSaving ? '⏳ Saving...' : '💾 Save Lesson, Activity & Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Lesson Directory / Table */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <div className="flex-between mb-lg">
          <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>All Curriculum Lessons</h3>
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              className="form-input"
              placeholder="🔍 Search lessons..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filteredLessons.map((lesson) => (
            <div
              key={lesson.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md)',
                borderLeft: `4px solid ${levelColors[(lesson.level_id - 1) % levelColors.length]}`,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-warm)',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-round)',
                  background: levelColors[(lesson.level_id - 1) % levelColors.length],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  flexShrink: 0,
                }}
              >
                {lesson.activity_type === 'drag-drop' ? '🧩' : lesson.activity_type === 'puzzle' ? '🧩' : '🎮'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{lesson.title}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Level {lesson.level_id} • Order {lesson.order_index} • {lesson.activity_type} • {lesson.is_published ? '✅ Published' : '📝 Draft'}
                </div>
              </div>
              <div className="flex gap-sm">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => startEdit(lesson)}
                  title="Open in Studio"
                  style={{ fontSize: '1rem', padding: '4px 10px' }}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(lesson.id)}
                  title="Delete Lesson"
                  style={{ fontSize: '1rem', padding: '4px 8px', color: 'var(--color-accent-red)' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
