// ============================================================
// CodeQuest — Coding Puzzle Component
// ============================================================

import { useState, useRef } from 'react';

interface PuzzleItem {
  id: string;
  content: string;
}

interface CodingPuzzleProps {
  activity: {
    instructions: string;
    puzzleType: string;
    items: PuzzleItem[];
    correctOrder: string[];
  };
  onComplete: () => void;
}

export default function CodingPuzzle({ activity, onComplete }: CodingPuzzleProps) {
  // Shuffle items initially
  const [items, setItems] = useState<PuzzleItem[]>(() => {
    const shuffled = [...activity.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const draggedIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    draggedIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex.current === null) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex.current];
    newItems.splice(draggedIndex.current, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    setItems(newItems);
    draggedIndex.current = null;
    setDragOverIndex(null);
    setResult(null);
  };

  const checkAnswer = () => {
    const userOrder = items.map(item => item.id);
    const isCorrect = JSON.stringify(userOrder) === JSON.stringify(activity.correctOrder);

    if (isCorrect) {
      setResult('success');
      setTimeout(() => onComplete(), 2000);
    } else {
      setResult('error');
      setTimeout(() => setResult(null), 1500);
    }
  };

  const reset = () => {
    const shuffled = [...activity.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setItems(shuffled);
    setResult(null);
  };

  return (
    <div>
      <div className="alert alert-info mb-lg">{activity.instructions}</div>

      <div className="mb-lg">
        <label className="form-label">
          {activity.puzzleType === 'pattern' ? '🎨 Arrange the pattern:' : '📝 Put these in the correct order:'}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={() => setDragOverIndex(null)}
              onDrop={() => handleDrop(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: activity.puzzleType === 'pattern' ? 'var(--space-md) var(--space-lg)' : 'var(--space-md) var(--space-lg)',
                background: dragOverIndex === index
                  ? 'rgba(108, 92, 231, 0.15)'
                  : result === 'success'
                  ? 'rgba(0, 184, 148, 0.1)'
                  : 'var(--gradient-card)',
                border: dragOverIndex === index
                  ? '2px solid var(--color-primary)'
                  : result === 'success'
                  ? '2px solid var(--color-accent-green)'
                  : result === 'error'
                  ? '2px solid var(--color-accent-red)'
                  : '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'grab',
                transition: 'all 0.2s ease',
                userSelect: 'none' as const,
                fontSize: activity.puzzleType === 'pattern' ? '2rem' : '1rem',
              }}
            >
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 600,
                flexShrink: 0,
                fontFamily: 'var(--font-display)',
              }}>
                {index + 1}
              </span>
              <span style={{ flex: 1 }}>{item.content}</span>
              <span style={{ opacity: 0.4, fontSize: '0.9rem' }}>⠿</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-md">
        <button
          className="btn btn-primary"
          onClick={checkAnswer}
          disabled={result === 'success'}
        >
          ✅ Check Answer
        </button>
        <button className="btn btn-ghost" onClick={reset}>
          🔄 Shuffle
        </button>
      </div>

      {result === 'success' && (
        <div className="alert alert-success mt-md" style={{ fontSize: '1.1rem', textAlign: 'center' }}>
          🎉 Perfect! That's the correct order! Moving to quiz...
        </div>
      )}
      {result === 'error' && (
        <div className="alert alert-error mt-md" style={{ textAlign: 'center' }}>
          🤔 Not quite right. Try dragging the items to rearrange them!
        </div>
      )}
    </div>
  );
}
