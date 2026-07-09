// ============================================================
// CodeQuest — Drag & Drop Activity Component
// ============================================================

import { useState, useRef } from 'react';

interface Block {
  id: string;
  type: string;
  label: string;
  color: string;
}

interface DragDropActivityProps {
  activity: {
    instructions: string;
    availableBlocks: Block[];
    correctSequence: string[];
    gridSize?: { rows: number; cols: number };
    startPosition?: { row: number; col: number };
    endPosition?: { row: number; col: number };
    walls?: { row: number; col: number }[];
    collectibles?: { row: number; col: number }[];
    characterEmoji?: string;
    goalEmoji?: string;
  };
  onComplete: () => void;
}

export default function DragDropActivity({ activity, onComplete }: DragDropActivityProps) {
  const [palette, setPalette] = useState<Block[]>([...activity.availableBlocks]);
  const [dropZone, setDropZone] = useState<Block[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [characterPos, setCharacterPos] = useState(activity.startPosition || { row: 0, col: 0 });
  const [visitedCells, setVisitedCells] = useState<Set<string>>(new Set());
  const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set());
  const draggedItem = useRef<{ block: Block; source: 'palette' | 'dropzone'; index: number } | null>(null);

  const getBlockClass = (type: string) => {
    const map: Record<string, string> = {
      'move': 'block-move',
      'turn-left': 'block-turn-left',
      'turn-right': 'block-turn-right',
      'repeat': 'block-repeat',
      'if-wall': 'block-if-wall',
      'pick-up': 'block-pick-up',
      'action': 'block-action',
      'step': 'block-step',
    };
    return map[type] || 'block-action';
  };

  const handleDragStart = (block: Block, source: 'palette' | 'dropzone', index: number) => {
    draggedItem.current = { block, source, index };
  };

  const handleDropOnZone = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!draggedItem.current) return;

    const { block, source, index } = draggedItem.current;

    if (source === 'palette') {
      setPalette(prev => prev.filter((_, i) => i !== index));
      setDropZone(prev => [...prev, block]);
    }
    draggedItem.current = null;
  };

  const handleDropOnPalette = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem.current) return;

    const { block, source, index } = draggedItem.current;

    if (source === 'dropzone') {
      setDropZone(prev => prev.filter((_, i) => i !== index));
      setPalette(prev => [...prev, block]);
    }
    draggedItem.current = null;
  };

  const checkAnswer = () => {
    const userSequence = dropZone.map(b => b.id);
    const isCorrect = JSON.stringify(userSequence) === JSON.stringify(activity.correctSequence);

    if (isCorrect) {
      setResult('success');
      // Animate character if grid exists
      if (activity.gridSize) {
        animateCharacter();
      }
      setTimeout(() => onComplete(), 2000);
    } else {
      setResult('error');
      setTimeout(() => setResult(null), 1500);
    }
  };

  const animateCharacter = () => {
    setIsRunning(true);
    const start = activity.startPosition || { row: 0, col: 0 };
    setCharacterPos(start);
    setVisitedCells(new Set([`${start.row}-${start.col}`]));
    setCollectedItems(new Set());

    let currentRow = start.row;
    let currentCol = start.col;
    let direction = 0; // 0=right, 1=down, 2=left, 3=up
    const moves: { row: number; col: number }[] = [];

    // Simple simulation
    for (const block of dropZone) {
      if (block.type === 'move') {
        const dr = [0, 1, 0, -1][direction];
        const dc = [1, 0, -1, 0][direction];
        currentRow += dr;
        currentCol += dc;
        moves.push({ row: currentRow, col: currentCol });
      } else if (block.type === 'turn-right') {
        direction = (direction + 1) % 4;
      } else if (block.type === 'turn-left') {
        direction = (direction + 3) % 4;
      } else if (block.type === 'repeat') {
        // For repeat, just add moves
        const repeatCount = (block as any).repeatCount || 2;
        for (let i = 0; i < repeatCount; i++) {
          const dr = [0, 1, 0, -1][direction];
          const dc = [1, 0, -1, 0][direction];
          currentRow += dr;
          currentCol += dc;
          moves.push({ row: currentRow, col: currentCol });
        }
      } else if (block.type === 'pick-up') {
        // Collect items at current position
        moves.push({ row: currentRow, col: currentCol });
      }
    }

    // Animate the moves
    moves.forEach((pos, i) => {
      setTimeout(() => {
        setCharacterPos(pos);
        setVisitedCells(prev => new Set([...prev, `${pos.row}-${pos.col}`]));
        if (activity.collectibles?.some(c => c.row === pos.row && c.col === pos.col)) {
          setCollectedItems(prev => new Set([...prev, `${pos.row}-${pos.col}`]));
        }
      }, (i + 1) * 500);
    });

    setTimeout(() => setIsRunning(false), (moves.length + 1) * 500);
  };

  const reset = () => {
    setPalette([...activity.availableBlocks]);
    setDropZone([]);
    setResult(null);
    setCharacterPos(activity.startPosition || { row: 0, col: 0 });
    setVisitedCells(new Set());
    setCollectedItems(new Set());
  };

  return (
    <div>
      <div className="alert alert-info mb-lg">{activity.instructions}</div>

      {/* Grid visualization */}
      {activity.gridSize && (
        <div className="text-center mb-lg">
          <div className="character-grid" style={{
            gridTemplateColumns: `repeat(${activity.gridSize.cols}, 60px)`,
            gridTemplateRows: `repeat(${activity.gridSize.rows}, 60px)`,
          }}>
            {Array.from({ length: activity.gridSize.rows * activity.gridSize.cols }).map((_, i) => {
              const row = Math.floor(i / activity.gridSize!.cols);
              const col = i % activity.gridSize!.cols;
              const isCharacter = characterPos.row === row && characterPos.col === col;
              const isGoal = activity.endPosition?.row === row && activity.endPosition?.col === col;
              const isWall = activity.walls?.some(w => w.row === row && w.col === col);
              const isVisited = visitedCells.has(`${row}-${col}`);
              const isCollectible = activity.collectibles?.some(c => c.row === row && c.col === col) && !collectedItems.has(`${row}-${col}`);

              return (
                <div
                  key={i}
                  className={`grid-cell ${isWall ? 'wall' : ''} ${isVisited ? 'visited' : ''} ${isCharacter ? 'character' : ''} ${isGoal && !isCharacter ? 'goal' : ''} ${isCollectible ? 'collectible' : ''}`}
                >
                  {isCharacter ? (activity.characterEmoji || '🤖') : isGoal ? (activity.goalEmoji || '⭐') : isCollectible ? '🪙' : ''}
                </div>
              );
            })}
          </div>
          {activity.collectibles && (
            <p className="text-muted mt-sm">🪙 Coins collected: {collectedItems.size}/{activity.collectibles.length}</p>
          )}
        </div>
      )}

      {/* Available blocks (palette) */}
      <div className="mb-md">
        <label className="form-label">📦 Available Blocks (drag from here)</label>
        <div
          className="block-palette"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropOnPalette}
        >
          {palette.length === 0 && (
            <div className="drop-zone-placeholder">All blocks used! ✓</div>
          )}
          {palette.map((block, i) => (
            <div
              key={`p-${block.id}-${i}`}
              className={`code-block ${getBlockClass(block.type)}`}
              draggable
              onDragStart={() => handleDragStart(block, 'palette', i)}
            >
              {block.label}
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div className="mb-lg">
        <label className="form-label">🎯 Your Program (drop blocks here in order)</label>
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''} ${result === 'success' ? 'correct' : result === 'error' ? 'incorrect' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDropOnZone}
          style={{
            borderColor: result === 'success' ? 'var(--color-accent-green)' : result === 'error' ? 'var(--color-accent-red)' : undefined,
            background: result === 'success' ? 'rgba(0, 184, 148, 0.1)' : result === 'error' ? 'rgba(255, 107, 107, 0.1)' : undefined,
          }}
        >
          {dropZone.length === 0 && (
            <div className="drop-zone-placeholder">
              👆 Drag blocks here to build your program!
            </div>
          )}
          {dropZone.map((block, i) => (
            <div
              key={`d-${block.id}-${i}`}
              className={`code-block ${getBlockClass(block.type)}`}
              draggable
              onDragStart={() => handleDragStart(block, 'dropzone', i)}
            >
              <span style={{ marginRight: '4px', opacity: 0.6 }}>{i + 1}.</span>
              {block.label}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-md">
        <button
          className="btn btn-primary"
          onClick={checkAnswer}
          disabled={dropZone.length === 0 || isRunning || result === 'success'}
        >
          {isRunning ? '⏳ Running...' : '▶️ Run Program'}
        </button>
        <button className="btn btn-ghost" onClick={reset} disabled={isRunning}>
          🔄 Reset
        </button>
      </div>

      {result === 'success' && (
        <div className="alert alert-success mt-md" style={{ fontSize: '1.1rem', textAlign: 'center' }}>
          🎉 Perfect! Your program is correct! Moving to quiz...
        </div>
      )}
      {result === 'error' && (
        <div className="alert alert-error mt-md" style={{ textAlign: 'center' }}>
          🤔 Not quite right. Try rearranging the blocks!
        </div>
      )}
    </div>
  );
}
