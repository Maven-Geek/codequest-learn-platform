// ============================================================
// CodeQuest — Coding Puzzle Component
// ============================================================

import { useState, useRef } from 'react';

interface PuzzleItem {
  id: string;
  content: string;
  type?: string;
  color?: string;
}

interface CodingPuzzleProps {
  activity: {
    instructions: string;
    puzzleType?: string;
    items: PuzzleItem[];
    correctOrder: string[];
    [key: string]: any;
  };
  onComplete: () => void;
}

export default function CodingPuzzle({ activity, onComplete }: CodingPuzzleProps) {
  const isPattern = activity.puzzleType === 'pattern' || (activity as any).activity_type === 'pattern';

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

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
    const newItems = [...items];
    const draggedItem = newItems[fromIndex];
    newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, draggedItem);
    setItems(newItems);
    draggedIndex.current = null;
    setDragOverIndex(null);
    setResult(null);
  };

  const handleDragStart = (index: number) => {
    draggedIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex.current === null) return;
    moveItem(draggedIndex.current, targetIndex);
  };

  const checkAnswer = () => {
    if (!activity.correctOrder || items.length !== activity.correctOrder.length) {
      setResult('error');
      setTimeout(() => setResult(null), 1500);
      return;
    }

    // 1. Direct exact ID order comparison
    const userOrder = items.map(item => item.id);
    const isIdExactMatch = JSON.stringify(userOrder) === JSON.stringify(activity.correctOrder);

    if (isIdExactMatch) {
      setResult('success');
      setTimeout(() => onComplete(), 2000);
      return;
    }

    // Resolve expected items from correctOrder
    const expectedItems: (PuzzleItem | string)[] = activity.correctOrder.map(target => {
      const found = activity.items.find(i => i.id === target);
      return found || target;
    });

    const matchesOrder = (targetList: (PuzzleItem | string)[]) => {
      return items.every((item, index) => {
        const expected = targetList[index];

        if (typeof expected === 'object' && expected !== null) {
          if (item.id === expected.id) return true;
          if (expected.color || item.color) {
            if (expected.color?.trim().toLowerCase() !== item.color?.trim().toLowerCase()) {
              return false;
            }
          }
          if (expected.type || item.type) {
            if (expected.type?.trim().toLowerCase() !== item.type?.trim().toLowerCase()) {
              return false;
            }
          }
          return item.content?.trim() === expected.content?.trim();
        }

        const expectedStr = expected as string;
        if (item.id === expectedStr) return true;
        if (item.content?.trim() === expectedStr?.trim()) return true;
        if (item.color && item.color.trim().toLowerCase() === expectedStr?.trim().toLowerCase()) return true;

        return false;
      });
    };

    // 2. Pattern / Color / Visual Content matching
    // Check forward pattern sequence first
    let isCorrect = matchesOrder(expectedItems);

    // 3. For pattern puzzles, allow both orientations / cyclic shifts (e.g. Blue-Red-Blue-Red... as well as Red-Blue-Red-Blue...)
    if (!isCorrect && isPattern) {
      for (let shift = 1; shift < expectedItems.length; shift++) {
        const shiftedTarget = [
          ...expectedItems.slice(shift),
          ...expectedItems.slice(0, shift)
        ];
        if (matchesOrder(shiftedTarget)) {
          isCorrect = true;
          break;
        }
      }
    }

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
          {isPattern ? '🎨 Arrange the pattern:' : '📝 Put these in the correct order:'}
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
                padding: isPattern ? 'var(--space-md) var(--space-lg)' : 'var(--space-md) var(--space-lg)',
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
                fontSize: isPattern ? '2rem' : '1rem',
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
              <span style={{ flex: 1, ...(item.color ? { color: item.color } : {}) }}>
                {item.content || (
                  item.color ? (
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: item.color
                    }} />
                  ) : null
                )}
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.8rem',
                    opacity: index === 0 ? 0.25 : 0.8,
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    lineHeight: '1.2'
                  }}
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(index, index - 1);
                  }}
                  title="Move up"
                  aria-label={`Move item ${index + 1} up`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.8rem',
                    opacity: index === items.length - 1 ? 0.25 : 0.8,
                    cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                    lineHeight: '1.2'
                  }}
                  disabled={index === items.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(index, index + 1);
                  }}
                  title="Move down"
                  aria-label={`Move item ${index + 1} down`}
                >
                  ▼
                </button>
                <span style={{ opacity: 0.4, fontSize: '0.9rem', cursor: 'grab' }}>⠿</span>
              </div>
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
          {isPattern
            ? "🎉 Perfect! That's the correct pattern! Moving to quiz..."
            : "🎉 Perfect! That's the correct order! Moving to quiz..."}
        </div>
      )}
      {result === 'error' && (
        <div className="alert alert-error mt-md" style={{ textAlign: 'center' }}>
          {isPattern
            ? "🤔 Not quite right. Try arranging the pattern again!"
            : "🤔 Not quite right. Try dragging the items to rearrange them!"}
        </div>
      )}
    </div>
  );
}
