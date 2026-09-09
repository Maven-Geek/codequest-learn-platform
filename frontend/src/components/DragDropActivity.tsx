// ============================================================
// CodeQuest — Drag & Drop Activity Component
// ============================================================

import { useState, useRef, useEffect } from 'react';

interface Block {
  id: string;
  type: string;
  label: string;
  color: string;
  repeatCount?: number;
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
    objectives?: string[];
  };
  onComplete: () => void;
}

interface RobotState {
  row: number;
  col: number;
  direction: number; // 0=right, 1=down, 2=left, 3=up
  visited: string[];
  collected: string[];
  hitWall?: boolean;
}

export default function DragDropActivity({ activity, onComplete }: DragDropActivityProps) {
  const startPos = activity.startPosition || { row: 0, col: 0 };

  const [palette, setPalette] = useState<Block[]>([...activity.availableBlocks]);
  const [dropZone, setDropZone] = useState<Block[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [characterPos, setCharacterPos] = useState(startPos);
  const [direction, setDirection] = useState(0); // 0=right, 1=down, 2=left, 3=up
  const [visitedCells, setVisitedCells] = useState<Set<string>>(new Set([`${startPos.row}-${startPos.col}`]));
  const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set());
  const [hitWall, setHitWall] = useState(false);

  const draggedItem = useRef<{ block: Block; source: 'palette' | 'dropzone'; index: number } | null>(null);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Clear pending animation timeouts on unmount
  useEffect(() => {
    return () => {
      animationTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  const clearPendingAnimations = () => {
    animationTimeouts.current.forEach(clearTimeout);
    animationTimeouts.current = [];
  };

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

  // Pure simulation engine: calculates robot path given blocks in order
  const computeSimulationSteps = (blocks: Block[]): RobotState[] => {
    const start = activity.startPosition || { row: 0, col: 0 };
    const rows = activity.gridSize?.rows || 1;
    const cols = activity.gridSize?.cols || 1;
    const walls = activity.walls || [];
    const collectibles = activity.collectibles || [];

    const states: RobotState[] = [
      {
        row: start.row,
        col: start.col,
        direction: 0,
        visited: [`${start.row}-${start.col}`],
        collected: [],
      },
    ];

    let curRow = start.row;
    let curCol = start.col;
    let curDir = 0;
    const curVisited = new Set<string>([`${start.row}-${start.col}`]);
    const curCollected = new Set<string>();

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (block.type === 'move') {
        const dr = [0, 1, 0, -1][curDir];
        const dc = [1, 0, -1, 0][curDir];
        const nextRow = curRow + dr;
        const nextCol = curCol + dc;

        const isWall = walls.some(w => w.row === nextRow && w.col === nextCol);
        const isOutOfBounds = nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols;

        if (isWall || isOutOfBounds) {
          states.push({
            row: curRow,
            col: curCol,
            direction: curDir,
            visited: Array.from(curVisited),
            collected: Array.from(curCollected),
            hitWall: true,
          });
        } else {
          curRow = nextRow;
          curCol = nextCol;
          curVisited.add(`${curRow}-${curCol}`);

          // If this cell has a collectible and no pick-up block exists, auto-collect
          const hasPickUpBlock = activity.availableBlocks.some(b => b.type === 'pick-up');
          if (!hasPickUpBlock && collectibles.some(c => c.row === curRow && c.col === curCol)) {
            curCollected.add(`${curRow}-${curCol}`);
          }

          states.push({
            row: curRow,
            col: curCol,
            direction: curDir,
            visited: Array.from(curVisited),
            collected: Array.from(curCollected),
          });
        }
      } else if (block.type === 'turn-right') {
        curDir = (curDir + 1) % 4;
        states.push({
          row: curRow,
          col: curCol,
          direction: curDir,
          visited: Array.from(curVisited),
          collected: Array.from(curCollected),
        });
      } else if (block.type === 'turn-left') {
        curDir = (curDir + 3) % 4;
        states.push({
          row: curRow,
          col: curCol,
          direction: curDir,
          visited: Array.from(curVisited),
          collected: Array.from(curCollected),
        });
      } else if (block.type === 'repeat') {
        const repeatCount = (block as any).repeatCount || 2;
        const nextBlock = blocks[i + 1];
        if (nextBlock && nextBlock.type === 'move') {
          for (let r = 0; r < repeatCount; r++) {
            const dr = [0, 1, 0, -1][curDir];
            const dc = [1, 0, -1, 0][curDir];
            const nextRow = curRow + dr;
            const nextCol = curCol + dc;
            const isWall = walls.some(w => w.row === nextRow && w.col === nextCol);
            const isOutOfBounds = nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols;

            if (!isWall && !isOutOfBounds) {
              curRow = nextRow;
              curCol = nextCol;
              curVisited.add(`${curRow}-${curCol}`);
              const hasPickUpBlock = activity.availableBlocks.some(b => b.type === 'pick-up');
              if (!hasPickUpBlock && collectibles.some(c => c.row === curRow && c.col === curCol)) {
                curCollected.add(`${curRow}-${curCol}`);
              }
              states.push({
                row: curRow,
                col: curCol,
                direction: curDir,
                visited: Array.from(curVisited),
                collected: Array.from(curCollected),
              });
            } else {
              states.push({
                row: curRow,
                col: curCol,
                direction: curDir,
                visited: Array.from(curVisited),
                collected: Array.from(curCollected),
                hitWall: true,
              });
              break;
            }
          }
          i++; // skip consumed inner block
        }
      } else if (block.type === 'pick-up') {
        if (collectibles.some(c => c.row === curRow && c.col === curCol)) {
          curCollected.add(`${curRow}-${curCol}`);
        }
        states.push({
          row: curRow,
          col: curCol,
          direction: curDir,
          visited: Array.from(curVisited),
          collected: Array.from(curCollected),
        });
      } else if (block.type === 'if-wall') {
        const dr = [0, 1, 0, -1][curDir];
        const dc = [1, 0, -1, 0][curDir];
        const wallAhead = walls.some(w => w.row === curRow + dr && w.col === curCol + dc);

        if (wallAhead) {
          const isTurnLeft = (block as any).turnDirection === 'left' || block.label?.toLowerCase().includes('left');
          const isTurnRight = (block as any).turnDirection === 'right' || block.label?.toLowerCase().includes('right');
          const nextBlock = blocks[i + 1];

          if (isTurnLeft) {
            curDir = (curDir + 3) % 4; // Turn Left (faces UP)
          } else if (isTurnRight) {
            curDir = (curDir + 1) % 4;
          } else if (nextBlock && (nextBlock.type === 'turn-right' || nextBlock.type === 'turn-left')) {
            if (nextBlock.type === 'turn-right') {
              if (curRow >= rows - 1) curDir = (curDir + 3) % 4;
              else curDir = (curDir + 1) % 4;
            } else {
              curDir = (curDir + 3) % 4;
            }
            i++;
          } else {
            if (curRow >= rows - 1) curDir = (curDir + 3) % 4;
            else curDir = (curDir + 1) % 4;
          }

          states.push({
            row: curRow,
            col: curCol,
            direction: curDir,
            visited: Array.from(curVisited),
            collected: Array.from(curCollected),
          });
        }
      }
    }

    return states;
  };

  const isSequenceCorrect = (currentDropZone: Block[]) => {
    if (!activity.correctSequence || activity.correctSequence.length === 0) {
      const usedEnoughBlocks = currentDropZone.length >= 4;
      const visitedEnoughSquares = visitedCells.size >= 3;
      return usedEnoughBlocks && visitedEnoughSquares;
    }

    const userBlocks = currentDropZone.map(b => {
      const { id, ...rest } = b as any;
      return rest;
    });

    const correctBlocks = activity.correctSequence.map(id => {
      const block = activity.availableBlocks.find(b => b.id === id);
      if (block) {
        const { id: _, ...rest } = block as any;
        return rest;
      }
      return { type: id };
    });

    return JSON.stringify(userBlocks) === JSON.stringify(correctBlocks);
  };

  const checkAutoGoalReached = (lastStep: RobotState, currentDropZone: Block[]) => {
    if (result === 'success') return;

    const reachedGoal = activity.endPosition
      ? lastStep.row === activity.endPosition.row && lastStep.col === activity.endPosition.col
      : false;

    const collectedAll = !activity.collectibles || activity.collectibles.length === 0
      ? true
      : lastStep.collected.length >= activity.collectibles.length;

    const isCorrect = isSequenceCorrect(currentDropZone);

    // Auto-complete (Option A): Goal reached with required collectibles, or sequence matched
    if ((reachedGoal && collectedAll) || isCorrect) {
      setResult('success');
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      animationTimeouts.current.push(timer);
    }
  };

  // Called whenever blocks change in dropZone — triggers live robot movement
  const applyNewDropZone = (newDropZone: Block[], newPalette: Block[]) => {
    clearPendingAnimations();
    setDropZone(newDropZone);
    setPalette(newPalette);
    setFeedbackMessage(null);

    const prevStates = computeSimulationSteps(dropZone);
    const newStates = computeSimulationSteps(newDropZone);

    if (newStates.length > prevStates.length) {
      // Robot moves forward through the new steps
      setIsRunning(true);
      const newSteps = newStates.slice(prevStates.length);

      newSteps.forEach((step, idx) => {
        const t = setTimeout(() => {
          setCharacterPos({ row: step.row, col: step.col });
          setDirection(step.direction);
          setVisitedCells(new Set(step.visited));
          setCollectedItems(new Set(step.collected));
          if (step.hitWall) {
            setHitWall(true);
            setFeedbackMessage('💥 Wall ahead! The robot couldn\'t move there.');
            const bumpTimer = setTimeout(() => setHitWall(false), 700);
            animationTimeouts.current.push(bumpTimer);
          }
        }, (idx + 1) * 350);
        animationTimeouts.current.push(t);
      });

      const totalTime = newSteps.length * 350;
      const endTimer = setTimeout(() => {
        setIsRunning(false);
        const lastStep = newStates[newStates.length - 1];
        checkAutoGoalReached(lastStep, newDropZone);
      }, totalTime + 60);
      animationTimeouts.current.push(endTimer);
    } else {
      // Block was removed or reordered — instantly rewind to the last state
      const lastStep = newStates[newStates.length - 1];
      setCharacterPos({ row: lastStep.row, col: lastStep.col });
      setDirection(lastStep.direction);
      setVisitedCells(new Set(lastStep.visited));
      setCollectedItems(new Set(lastStep.collected));
      setIsRunning(false);
      checkAutoGoalReached(lastStep, newDropZone);
    }
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
      const newPalette = palette.filter((_, i) => i !== index);
      const newDropZone = [...dropZone, block];
      applyNewDropZone(newDropZone, newPalette);
    }
    draggedItem.current = null;
  };

  const handleDropOnPalette = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem.current) return;

    const { block, source, index } = draggedItem.current;

    if (source === 'dropzone') {
      const newDropZone = dropZone.filter((_, i) => i !== index);
      const newPalette = [...palette, block];
      applyNewDropZone(newDropZone, newPalette);
    }
    draggedItem.current = null;
  };

  // Click-to-add / click-to-remove for tap & mobile accessibility
  const addBlock = (block: Block, index: number) => {
    if (isRunning || result === 'success') return;
    const newPalette = palette.filter((_, i) => i !== index);
    const newDropZone = [...dropZone, block];
    applyNewDropZone(newDropZone, newPalette);
  };

  const removeBlock = (index: number) => {
    if (isRunning || result === 'success') return;
    const block = dropZone[index];
    const newDropZone = dropZone.filter((_, i) => i !== index);
    const newPalette = [...palette, block];
    applyNewDropZone(newDropZone, newPalette);
  };

  const reset = () => {
    clearPendingAnimations();
    setPalette([...activity.availableBlocks]);
    setDropZone([]);
    setResult(null);
    setFeedbackMessage(null);
    const start = activity.startPosition || { row: 0, col: 0 };
    setCharacterPos(start);
    setDirection(0);
    setVisitedCells(new Set([`${start.row}-${start.col}`]));
    setCollectedItems(new Set());
    setIsRunning(false);
  };

  // Replays full program from start to finish
  const runFullProgram = () => {
    if (dropZone.length === 0 || isRunning || result === 'success') return;
    clearPendingAnimations();
    setIsRunning(true);
    setResult(null);
    setFeedbackMessage(null);

    const start = activity.startPosition || { row: 0, col: 0 };
    setCharacterPos(start);
    setDirection(0);
    setVisitedCells(new Set([`${start.row}-${start.col}`]));
    setCollectedItems(new Set());

    const allStates = computeSimulationSteps(dropZone);
    allStates.slice(1).forEach((step, idx) => {
      const t = setTimeout(() => {
        setCharacterPos({ row: step.row, col: step.col });
        setDirection(step.direction);
        setVisitedCells(new Set(step.visited));
        setCollectedItems(new Set(step.collected));
        if (step.hitWall) {
          setHitWall(true);
          setFeedbackMessage('💥 Wall ahead! The robot couldn\'t move there.');
          const bumpTimer = setTimeout(() => setHitWall(false), 700);
          animationTimeouts.current.push(bumpTimer);
        }
      }, (idx + 1) * 350);
      animationTimeouts.current.push(t);
    });

    const totalTime = (allStates.length - 1) * 350;
    const endTimer = setTimeout(() => {
      setIsRunning(false);
      const lastStep = allStates[allStates.length - 1];
      checkAutoGoalReached(lastStep, dropZone);

      const reachedGoal = activity.endPosition
        ? lastStep.row === activity.endPosition.row && lastStep.col === activity.endPosition.col
        : false;
      const isCorrect = isSequenceCorrect(dropZone);

      if (!reachedGoal && !isCorrect && !result) {
        setResult('error');
        const errTimer = setTimeout(() => setResult(null), 1800);
        animationTimeouts.current.push(errTimer);
      }
    }, totalTime + 100);
    animationTimeouts.current.push(endTimer);
  };

  return (
    <div>
      <div className="alert alert-info mb-lg">{activity.instructions}</div>

      {feedbackMessage && (
        <div className="alert alert-warning mb-md" style={{ textAlign: 'center' }}>
          {feedbackMessage}
        </div>
      )}

      {/* Grid visualization */}
      {activity.gridSize && (
        <div className="text-center mb-lg">
          <div className="character-grid-scroll">
            <div
              className={`character-grid ${hitWall ? 'shake' : ''}`}
              style={{
                gridTemplateColumns: `repeat(${activity.gridSize.cols}, 60px)`,
                gridTemplateRows: `repeat(${activity.gridSize.rows}, 60px)`,
                margin: '0 auto',
              }}
            >
              {Array.from({ length: activity.gridSize.rows * activity.gridSize.cols }).map((_, i) => {
                const row = Math.floor(i / activity.gridSize!.cols);
                const col = i % activity.gridSize!.cols;
                const isCharacter = characterPos.row === row && characterPos.col === col;
                const isGoal = activity.endPosition?.row === row && activity.endPosition?.col === col;
                const isWall = activity.walls?.some(w => w.row === row && w.col === col);
                const isVisited = visitedCells.has(`${row}-${col}`);
                const isCollectible =
                  activity.collectibles?.some(c => c.row === row && c.col === col) &&
                  !collectedItems.has(`${row}-${col}`);

                return (
                  <div
                    key={i}
                    className={`grid-cell ${isWall ? 'wall' : ''} ${isVisited ? 'visited' : ''} ${
                      isCharacter ? 'character' : ''
                    } ${isGoal && !isCharacter ? 'goal' : ''} ${isCollectible ? 'collectible' : ''}`}
                    style={{
                      position: 'relative',
                      border: isCharacter && isGoal ? '3px solid var(--color-accent-green)' : undefined,
                    }}
                  >
                    {isCharacter ? (
                      <div
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '2rem',
                            display: 'inline-block',
                            transform: direction === 2 ? 'scaleX(-1)' : undefined,
                            transition: 'transform 0.25s ease',
                          }}
                        >
                          {activity.characterEmoji || '🤖'}
                        </span>
                        {/* Facing direction badge */}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            fontSize: '0.65rem',
                            background: 'var(--color-primary)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            lineHeight: 1,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                          title={
                            direction === 0
                              ? 'Facing Right'
                              : direction === 1
                              ? 'Facing Down'
                              : direction === 2
                              ? 'Facing Left'
                              : 'Facing Up'
                          }
                        >
                          {direction === 0 ? '▶' : direction === 1 ? '▼' : direction === 2 ? '◀' : '▲'}
                        </span>
                      </div>
                    ) : isGoal ? (
                      <span style={{ fontSize: '2rem' }}>{activity.goalEmoji || '⭐'}</span>
                    ) : isCollectible ? (
                      <span style={{ fontSize: '1.5rem' }}>🪙</span>
                    ) : isWall ? (
                      <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>🧱</span>
                    ) : (
                      ''
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {activity.collectibles && activity.collectibles.length > 0 && (
            <p className="text-muted mt-sm">
              🪙 Coins collected: {collectedItems.size}/{activity.collectibles.length}
            </p>
          )}
          {activity.objectives && activity.objectives.length > 0 && (
            <div
              className="mt-sm"
              style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}
            >
              {activity.objectives.map((obj, idx) => {
                let met = false;
                if (obj.toLowerCase().includes('4 blocks')) met = dropZone.length >= 4;
                else if (obj.toLowerCase().includes('3 different squares')) met = visitedCells.size >= 3;
                else met = true;

                return (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.85rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: met ? 'rgba(0, 184, 148, 0.15)' : 'var(--color-surface)',
                      color: met ? 'var(--color-accent-green)' : 'var(--color-text-dim)',
                      fontWeight: 600,
                    }}
                  >
                    {met ? '✓' : '○'} {obj}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Available blocks (palette) */}
      <div className="mb-md">
        <label className="form-label">📦 Available Blocks (tap or drag into program)</label>
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
              onClick={() => addBlock(block, i)}
              style={{ cursor: 'pointer' }}
              title="Click or drag into your program"
            >
              {block.label}
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div className="mb-lg">
        <label className="form-label">🎯 Your Program (robot moves live as you drop!)</label>
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''} ${
            result === 'success' ? 'correct' : result === 'error' ? 'incorrect' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDropOnZone}
          style={{
            borderColor:
              result === 'success'
                ? 'var(--color-accent-green)'
                : result === 'error'
                ? 'var(--color-accent-red)'
                : undefined,
            background:
              result === 'success'
                ? 'rgba(0, 184, 148, 0.1)'
                : result === 'error'
                ? 'rgba(255, 107, 107, 0.1)'
                : undefined,
          }}
        >
          {dropZone.length === 0 && (
            <div className="drop-zone-placeholder">
              👆 Drag or tap blocks above to build your program! The robot will move live!
            </div>
          )}
          {dropZone.map((block, i) => (
            <div
              key={`d-${block.id}-${i}`}
              className={`code-block ${getBlockClass(block.type)}`}
              draggable
              onDragStart={() => handleDragStart(block, 'dropzone', i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: 'var(--space-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '6px', opacity: 0.6 }}>{i + 1}.</span>
                {block.label}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBlock(i);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  marginLeft: '8px',
                  lineHeight: 1,
                }}
                title="Remove block"
                aria-label={`Remove block ${block.label}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-md">
        <button
          className="btn btn-primary"
          onClick={runFullProgram}
          disabled={dropZone.length === 0 || isRunning || result === 'success'}
        >
          {isRunning ? '⏳ Running...' : '▶️ Replay / Run Program'}
        </button>
        <button className="btn btn-ghost" onClick={reset} disabled={isRunning}>
          🔄 Reset
        </button>
      </div>

      {result === 'success' && (
        <div className="alert alert-success mt-md" style={{ fontSize: '1.1rem', textAlign: 'center' }}>
          🎉 Perfect! The robot reached the goal! Moving to quiz...
        </div>
      )}
      {result === 'error' && (
        <div className="alert alert-error mt-md" style={{ textAlign: 'center' }}>
          🤔 Not quite at the goal yet. Try rearranging the blocks!
        </div>
      )}
    </div>
  );
}
