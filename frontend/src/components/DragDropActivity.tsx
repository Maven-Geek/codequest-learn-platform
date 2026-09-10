// ============================================================
// CodeQuest — Drag & Drop Activity Component (Enhanced Studio Edition)
// ============================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { sfx } from '../utils/audio';

export interface Block {
  id: string;
  type: string;
  label: string;
  color: string;
  repeatCount?: number;
  turnDirection?: 'left' | 'right';
}

export interface DragDropActivityProps {
  activity: {
    instructions: string;
    availableBlocks: Block[];
    correctSequence: string[];
    gridSize?: { rows: number; cols: number };
    startPosition?: { row: number; col: number };
    endPosition?: { row: number; col: number };
    walls?: { row: number; col: number }[];
    collectibles?: { row: number; col: number }[];
    keys?: { row: number; col: number }[];
    doors?: { row: number; col: number }[];
    characterEmoji?: string;
    goalEmoji?: string;
    theme?: 'classic' | 'space' | 'castle' | 'forest';
    hints?: string[];
    maxBlocksStar?: number;
    objectives?: string[];
  };
  onComplete: () => void;
  onGoToQuiz?: () => void;
}

interface RobotState {
  row: number;
  col: number;
  direction: number; // 0=right, 1=down, 2=left, 3=up
  visited: string[];
  collected: string[];
  keys: string[];
  unlockedDoors: string[];
  hitWall?: boolean;
  hitDoor?: boolean;
  soundEvent?: 'step' | 'turn' | 'coin' | 'key' | 'door' | 'wall';
}

interface StarBreakdown {
  stars: number;
  star1: boolean;
  star2: boolean;
  star3: boolean;
  star2Label: string;
  star3Label: string;
  targetBlocks: number;
}

export default function DragDropActivity({ activity, onComplete, onGoToQuiz }: DragDropActivityProps) {
  const startPos = activity.startPosition || { row: 0, col: 0 };
  const theme = activity.theme || 'classic';

  // Theme-based default emojis
  const defaultAvatars: Record<string, { char: string; goal: string; wall: string }> = {
    classic: { char: '🤖', goal: '🏆', wall: '🧱' },
    space: { char: '🚀', goal: '🪐', wall: '☄️' },
    castle: { char: '🧙‍♂️', goal: '🏰', wall: '🧱' },
    forest: { char: '🦊', goal: '🌳', wall: '🪨' },
  };
  const charEmoji = activity.characterEmoji || defaultAvatars[theme]?.char || '🤖';
  const goalEmoji = activity.goalEmoji || defaultAvatars[theme]?.goal || '🏆';
  const wallEmoji = defaultAvatars[theme]?.wall || '🧱';

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
  const [collectedKeys, setCollectedKeys] = useState<Set<string>>(new Set());
  const [unlockedDoors, setUnlockedDoors] = useState<Set<string>>(new Set());
  const [hitWall, setHitWall] = useState(false);
  const [bumpCount, setBumpCount] = useState(0);

  // Audio mute state
  const [muted, setMuted] = useState(sfx.getMuted());

  // Progressive hints state
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState(1);

  // Star rating outcome
  const [starResult, setStarResult] = useState<StarBreakdown | null>(null);

  const draggedItem = useRef<{ block: Block; source: 'palette' | 'dropzone'; index: number } | null>(null);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      animationTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  // Sync palette if activity changes
  useEffect(() => {
    reset();
  }, [activity]);

  const clearPendingAnimations = () => {
    animationTimeouts.current.forEach(clearTimeout);
    animationTimeouts.current = [];
  };

  const toggleSound = () => {
    const isMutedNow = sfx.toggleMute();
    setMuted(isMutedNow);
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

  // Pure simulation engine: calculates robot path with keys, locked doors, and collectibles
  const computeSimulationSteps = (blocks: Block[]): RobotState[] => {
    const start = activity.startPosition || { row: 0, col: 0 };
    const rows = activity.gridSize?.rows || 1;
    const cols = activity.gridSize?.cols || 1;
    const walls = activity.walls || [];
    const collectibles = activity.collectibles || [];
    const keys = activity.keys || [];
    const doors = activity.doors || [];

    const states: RobotState[] = [
      {
        row: start.row,
        col: start.col,
        direction: 0,
        visited: [`${start.row}-${start.col}`],
        collected: [],
        keys: [],
        unlockedDoors: [],
      },
    ];

    let curRow = start.row;
    let curCol = start.col;
    let curDir = 0;
    const curVisited = new Set<string>([`${start.row}-${start.col}`]);
    const curCollected = new Set<string>();
    const curKeys = new Set<string>();
    const curUnlockedDoors = new Set<string>();

    const hasPickUpBlock = activity.availableBlocks.some(b => b.type === 'pick-up');

    const tryMoveTo = (nextRow: number, nextCol: number): { success: boolean; hitDoor?: boolean } => {
      const isOutOfBounds = nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols;
      const isWall = walls.some(w => w.row === nextRow && w.col === nextCol);

      if (isOutOfBounds || isWall) {
        return { success: false, hitDoor: false };
      }

      // Check if target is a locked door
      const isDoor = doors.some(d => d.row === nextRow && d.col === nextCol);
      if (isDoor) {
        const doorCoord = `${nextRow}-${nextCol}`;
        if (!curUnlockedDoors.has(doorCoord)) {
          // Check if we have an unused key
          if (curKeys.size > curUnlockedDoors.size) {
            // Unlock door!
            curUnlockedDoors.add(doorCoord);
          } else {
            // Door is locked and no keys
            return { success: false, hitDoor: true };
          }
        }
      }

      curRow = nextRow;
      curCol = nextCol;
      curVisited.add(`${curRow}-${curCol}`);

      // Auto-collect key if stepped on
      const isKeyCell = keys.some(k => k.row === curRow && k.col === curCol);
      if (isKeyCell) {
        curKeys.add(`${curRow}-${curCol}`);
      }

      // Collectible auto-collected if stepped on (pick-up block also explicitly collects)
      if (collectibles.some(c => c.row === curRow && c.col === curCol)) {
        curCollected.add(`${curRow}-${curCol}`);
      }

      return { success: true };
    };

    const executeAction = (b: Block): boolean => {
      if (b.type === 'move') {
        const dr = [0, 1, 0, -1][curDir];
        const dc = [1, 0, -1, 0][curDir];
        const nextRow = curRow + dr;
        const nextCol = curCol + dc;

        const res = tryMoveTo(nextRow, nextCol);

        if (!res.success) {
          states.push({
            row: curRow,
            col: curCol,
            direction: curDir,
            visited: Array.from(curVisited),
            collected: Array.from(curCollected),
            keys: Array.from(curKeys),
            unlockedDoors: Array.from(curUnlockedDoors),
            hitWall: true,
            hitDoor: res.hitDoor,
            soundEvent: 'wall',
          });
          return false;
        } else {
          // Determine audio cue
          let soundCue: 'step' | 'coin' | 'key' | 'door' = 'step';
          const atKey = keys.some(k => k.row === curRow && k.col === curCol);
          const atDoor = doors.some(d => d.row === curRow && d.col === curCol);
          const atCoin = collectibles.some(c => c.row === curRow && c.col === curCol);

          if (atDoor && curUnlockedDoors.has(`${curRow}-${curCol}`)) soundCue = 'door';
          else if (atKey) soundCue = 'key';
          else if (atCoin) soundCue = 'coin';

          states.push({
            row: curRow,
            col: curCol,
            direction: curDir,
            visited: Array.from(curVisited),
            collected: Array.from(curCollected),
            keys: Array.from(curKeys),
            unlockedDoors: Array.from(curUnlockedDoors),
            soundEvent: soundCue,
          });
          return true;
        }
      } else if (b.type === 'turn-right') {
        curDir = (curDir + 1) % 4;
        states.push({
          row: curRow,
          col: curCol,
          direction: curDir,
          visited: Array.from(curVisited),
          collected: Array.from(curCollected),
          keys: Array.from(curKeys),
          unlockedDoors: Array.from(curUnlockedDoors),
          soundEvent: 'turn',
        });
        return true;
      } else if (b.type === 'turn-left') {
        curDir = (curDir + 3) % 4;
        states.push({
          row: curRow,
          col: curCol,
          direction: curDir,
          visited: Array.from(curVisited),
          collected: Array.from(curCollected),
          keys: Array.from(curKeys),
          unlockedDoors: Array.from(curUnlockedDoors),
          soundEvent: 'turn',
        });
        return true;
      } else if (b.type === 'pick-up') {
        let sound: 'coin' | 'key' | 'step' = 'step';
        if (collectibles.some(c => c.row === curRow && c.col === curCol)) {
          curCollected.add(`${curRow}-${curCol}`);
          sound = 'coin';
        }
        if (keys.some(k => k.row === curRow && k.col === curCol)) {
          curKeys.add(`${curRow}-${curCol}`);
          sound = 'key';
        }
        states.push({
          row: curRow,
          col: curCol,
          direction: curDir,
          visited: Array.from(curVisited),
          collected: Array.from(curCollected),
          keys: Array.from(curKeys),
          unlockedDoors: Array.from(curUnlockedDoors),
          soundEvent: sound,
        });
        return true;
      } else if (b.type === 'if-wall') {
        const dr = [0, 1, 0, -1][curDir];
        const dc = [1, 0, -1, 0][curDir];
        const wallAhead = walls.some(w => w.row === curRow + dr && w.col === curCol + dc);

        if (wallAhead) {
          const isTurnLeft = (b as any).turnDirection === 'left' || b.label?.toLowerCase().includes('left');
          const isTurnRight = (b as any).turnDirection === 'right' || b.label?.toLowerCase().includes('right');

          if (isTurnLeft) {
            curDir = (curDir + 3) % 4;
          } else if (isTurnRight) {
            curDir = (curDir + 1) % 4;
          } else {
            curDir = curRow >= rows - 1 ? (curDir + 3) % 4 : (curDir + 1) % 4;
          }

          states.push({
            row: curRow,
            col: curCol,
            direction: curDir,
            visited: Array.from(curVisited),
            collected: Array.from(curCollected),
            keys: Array.from(curKeys),
            unlockedDoors: Array.from(curUnlockedDoors),
            soundEvent: 'turn',
          });
        }
        return true;
      }
      return true;
    };

    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i];

      if (block.type === 'repeat') {
        const repeatCount = (block as any).repeatCount || 2;

        // Check for immediate nested repeat block (Repeat A inside/following Repeat B)
        if (i + 1 < blocks.length && blocks[i + 1].type === 'repeat') {
          const innerRepeat = blocks[i + 1];
          const innerCount = (innerRepeat as any).repeatCount || 2;
          const innerSpan = Math.max(1, (innerRepeat as any).repeatSpan || 1);
          const targetBlocks = blocks.slice(i + 2, i + 2 + innerSpan);

          outerLoop: for (let o = 0; o < repeatCount; o++) {
            for (let inn = 0; inn < innerCount; inn++) {
              for (const tb of targetBlocks) {
                const ok = executeAction(tb);
                if (!ok) break outerLoop;
              }
            }
          }
          i += 2 + targetBlocks.length;
          continue;
        }

        // Single repeat block with configurable repeatSpan (default 1)
        const span = Math.max(1, (block as any).repeatSpan || 1);
        const targetBlocks = blocks.slice(i + 1, i + 1 + span);

        repeatLoop: for (let r = 0; r < repeatCount; r++) {
          for (const tb of targetBlocks) {
            const ok = executeAction(tb);
            if (!ok) break repeatLoop;
          }
        }
        i += 1 + targetBlocks.length;
        continue;
      }

      executeAction(block);
      i++;
    }

    return states;
  };

  const playStepSound = (step: RobotState) => {
    if (step.hitWall) {
      sfx.wall();
    } else if (step.soundEvent === 'key') {
      sfx.key();
    } else if (step.soundEvent === 'door') {
      sfx.door();
    } else if (step.soundEvent === 'coin') {
      sfx.coin();
    } else if (step.soundEvent === 'turn') {
      sfx.turn();
    } else {
      sfx.step();
    }
  };

  const computeStars = (currentDropZone: Block[], totalBumps: number, lastStep?: RobotState): StarBreakdown => {
    const totalCoins = activity.collectibles?.length || 0;
    const totalKeys = activity.keys?.length || 0;
    const totalTreasures = totalCoins + totalKeys;

    let star1 = true;
    let star2 = false;
    let star2Label = '';

    if (totalTreasures > 0) {
      const collectedTreasures = lastStep ? (lastStep.collected.length + lastStep.keys.length) : (collectedItems.size + collectedKeys.size);
      star2 = collectedTreasures >= totalTreasures;
      star2Label = `Collected all treasures (${collectedTreasures}/${totalTreasures})`;
    } else {
      star2 = totalBumps === 0;
      star2Label = star2 ? 'Flawless navigation (0 wall bumps)' : 'Avoid bumping into walls';
    }

    const targetBlocks = activity.maxBlocksStar || (activity.correctSequence?.length ? activity.correctSequence.length : 5);
    const star3 = currentDropZone.length <= targetBlocks;
    const star3Label = `Code efficiency challenge (Used ${currentDropZone.length} / ≤ ${targetBlocks} blocks)`;

    let count = 1;
    if (star2) count++;
    if (star3) count++;

    return {
      stars: count,
      star1,
      star2,
      star3,
      star2Label,
      star3Label,
      targetBlocks,
    };
  };

  const isSequenceCorrect = (currentDropZone: Block[]) => {
    if (!activity.correctSequence || activity.correctSequence.length === 0) {
      const usedEnoughBlocks = currentDropZone.length >= 4;
      const visitedEnoughSquares = visitedCells.size >= 3;
      const collectedCoins = (activity.collectibles && activity.collectibles.length > 0)
        ? collectedItems.size >= 1
        : true;
      return usedEnoughBlocks && (visitedEnoughSquares || collectedCoins);
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

    const totalCoins = activity.collectibles?.length || 0;
    const totalKeys = activity.keys?.length || 0;
    const collectedAll = (totalCoins === 0 || lastStep.collected.length >= totalCoins) &&
      (totalKeys === 0 || lastStep.keys.length >= totalKeys);

    const keysSatisfied = totalKeys === 0 || lastStep.keys.length >= totalKeys;
    const isFreePlay = !activity.correctSequence || activity.correctSequence.length === 0;
    const isCorrect = isSequenceCorrect(currentDropZone);

    // Goal reached with all keys collected (or correct custom sequence) completes the level!
    const successCondition = (reachedGoal && keysSatisfied) || isCorrect;

    if (successCondition) {
      setResult('success');
      sfx.success();

      const stars = computeStars(currentDropZone, bumpCount, lastStep);
      setStarResult(stars);

      // Procedural star fanfare pings
      for (let s = 1; s <= stars.stars; s++) {
        setTimeout(() => sfx.star(), 350 + s * 220);
      }

      onComplete();
    }
  };

  // Called whenever blocks change in dropZone — triggers live robot movement
  const applyNewDropZone = (newDropZone: Block[], newPalette: Block[]) => {
    clearPendingAnimations();
    setDropZone(newDropZone);
    setPalette(newPalette);
    setFeedbackMessage(null);
    sfx.drop();

    const prevStates = computeSimulationSteps(dropZone);
    const newStates = computeSimulationSteps(newDropZone);

    if (newStates.length > prevStates.length) {
      setIsRunning(true);
      const newSteps = newStates.slice(prevStates.length);

      newSteps.forEach((step, idx) => {
        const t = setTimeout(() => {
          setCharacterPos({ row: step.row, col: step.col });
          setDirection(step.direction);
          setVisitedCells(new Set(step.visited));
          setCollectedItems(new Set(step.collected));
          setCollectedKeys(new Set(step.keys));
          setUnlockedDoors(new Set(step.unlockedDoors));

          playStepSound(step);

          if (step.hitWall) {
            setHitWall(true);
            setBumpCount(prev => prev + 1);
            setFeedbackMessage(step.hitDoor ? '🔒 Locked door! Collect a key 🗝️ first.' : '💥 Wall ahead! The robot couldn\'t move there.');
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
      const lastStep = newStates[newStates.length - 1];
      setCharacterPos({ row: lastStep.row, col: lastStep.col });
      setDirection(lastStep.direction);
      setVisitedCells(new Set(lastStep.visited));
      setCollectedItems(new Set(lastStep.collected));
      setCollectedKeys(new Set(lastStep.keys));
      setUnlockedDoors(new Set(lastStep.unlockedDoors));
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

  const addBlock = (block: Block, index: number) => {
    clearPendingAnimations();
    setIsRunning(false);
    setResult(null);
    setStarResult(null);
    setFeedbackMessage(null);
    const newPalette = palette.filter((_, i) => i !== index);
    const newDropZone = [...dropZone, { ...block, repeatSpan: (block as any).repeatSpan || 1 }];
    applyNewDropZone(newDropZone, newPalette);
  };

  const removeBlock = (index: number) => {
    clearPendingAnimations();
    setIsRunning(false);
    setResult(null);
    setStarResult(null);
    setFeedbackMessage(null);
    if (index < 0 || index >= dropZone.length) return;
    const block = dropZone[index];
    const newDropZone = dropZone.filter((_, i) => i !== index);
    const newPalette = [...palette, block];
    applyNewDropZone(newDropZone, newPalette);
  };

  const updateRepeatSpan = (index: number, span: number) => {
    clearPendingAnimations();
    setIsRunning(false);
    setResult(null);
    setStarResult(null);
    setFeedbackMessage(null);
    const newDropZone = [...dropZone];
    newDropZone[index] = { ...newDropZone[index], repeatSpan: span } as any;
    applyNewDropZone(newDropZone, palette);
  };

  const reset = () => {
    clearPendingAnimations();
    setPalette([...activity.availableBlocks]);
    setDropZone([]);
    setResult(null);
    setStarResult(null);
    setFeedbackMessage(null);
    const start = activity.startPosition || { row: 0, col: 0 };
    setCharacterPos(start);
    setDirection(0);
    setVisitedCells(new Set([`${start.row}-${start.col}`]));
    setCollectedItems(new Set());
    setCollectedKeys(new Set());
    setUnlockedDoors(new Set());
    setBumpCount(0);
    setIsRunning(false);
  };

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
    setCollectedKeys(new Set());
    setUnlockedDoors(new Set());

    const allStates = computeSimulationSteps(dropZone);
    allStates.slice(1).forEach((step, idx) => {
      const t = setTimeout(() => {
        setCharacterPos({ row: step.row, col: step.col });
        setDirection(step.direction);
        setVisitedCells(new Set(step.visited));
        setCollectedItems(new Set(step.collected));
        setCollectedKeys(new Set(step.keys));
        setUnlockedDoors(new Set(step.unlockedDoors));

        playStepSound(step);

        if (step.hitWall) {
          setHitWall(true);
          setBumpCount(prev => prev + 1);
          setFeedbackMessage(step.hitDoor ? '🔒 Locked door! Collect a key 🗝️ first.' : '💥 Wall ahead! The robot couldn\'t move there.');
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

  // Theme styling tokens
  const themeClass = `theme-${theme}`;

  return (
    <div className={`activity-wrapper ${themeClass}`}>
      {/* Top action bar: Instructions + Audio Mute + Hints Toggle */}
      <div className="activity-top-bar mb-md">
        <div className="alert alert-info flex-1 m-0">
          <span>{activity.instructions}</span>
        </div>
        <div className="activity-controls-bar">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleSound}
            title={muted ? 'Unmute procedural sound effects' : 'Mute sound effects'}
            style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {muted ? '🔇 Muted' : '🔊 Sound'}
          </button>
          {activity.hints && activity.hints.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowHints(!showHints)}
              style={{
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: showHints ? 'var(--color-primary)' : undefined,
              }}
            >
              💡 Hints ({activity.hints.length})
            </button>
          )}
        </div>
      </div>

      {/* Progressive Hints Accordion */}
      {showHints && activity.hints && activity.hints.length > 0 && (
        <div className="card mb-md hints-panel" style={{ border: '2px solid #fbc02d', background: 'rgba(251, 192, 45, 0.08)' }}>
          <div className="flex-between mb-xs">
            <h4 style={{ margin: 0, color: '#f57f17', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💡 Coding Hints (Hint {revealedHints} of {activity.hints.length})
            </h4>
            {revealedHints < activity.hints.length && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setRevealedHints(prev => Math.min(prev + 1, activity.hints!.length))}
                style={{ fontSize: '0.8rem', color: '#f57f17', fontWeight: 600 }}
              >
                👉 Reveal Next Hint ({revealedHints + 1}/{activity.hints.length})
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activity.hints.slice(0, revealedHints).map((hint, hIdx) => (
              <div
                key={hIdx}
                style={{
                  padding: '8px 12px',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid #fbc02d',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Hint {hIdx + 1}:</strong> {hint}
              </div>
            ))}
          </div>
        </div>
      )}

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
              className={`character-grid ${themeClass} ${hitWall ? 'shake' : ''}`}
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
                const isKey =
                  activity.keys?.some(k => k.row === row && k.col === col) &&
                  !collectedKeys.has(`${row}-${col}`);
                const isDoor = activity.doors?.some(d => d.row === row && d.col === col);
                const isDoorUnlocked = unlockedDoors.has(`${row}-${col}`);

                return (
                  <div
                    key={i}
                    className={`grid-cell ${isWall ? 'wall' : ''} ${isVisited ? 'visited' : ''} ${isCharacter ? 'character' : ''
                      } ${isGoal && !isCharacter ? 'goal' : ''} ${isCollectible ? 'collectible' : ''} ${isKey ? 'key-cell' : ''
                      } ${isDoor ? (isDoorUnlocked ? 'door-open' : 'door-locked') : ''}`}
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
                          {charEmoji}
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
                      <span style={{ fontSize: '2rem' }}>{goalEmoji}</span>
                    ) : isKey ? (
                      <span style={{ fontSize: '1.5rem', animation: 'bounce 1s infinite alternate' }} title="Key 🗝️">
                        🗝️
                      </span>
                    ) : isDoor ? (
                      <span style={{ fontSize: '1.5rem' }} title={isDoorUnlocked ? 'Unlocked Door 🔓' : 'Locked Door 🚪'}>
                        {isDoorUnlocked ? '🔓' : '🚪'}
                      </span>
                    ) : isCollectible ? (
                      <span style={{ fontSize: '1.5rem' }}>🪙</span>
                    ) : isWall ? (
                      <span style={{ fontSize: '1.5rem', opacity: 0.85 }}>{wallEmoji}</span>
                    ) : (
                      ''
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Item counter badges */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }} className="mt-sm">
            {activity.collectibles && activity.collectibles.length > 0 && (
              <span className="badge-inventory" style={{ padding: '4px 12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light)', fontSize: '0.85rem' }}>
                🪙 Coins: {collectedItems.size} / {activity.collectibles.length}
              </span>
            )}
            {activity.keys && activity.keys.length > 0 && (
              <span className="badge-inventory" style={{ padding: '4px 12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light)', fontSize: '0.85rem' }}>
                🗝️ Keys: {collectedKeys.size} / {activity.keys.length}
              </span>
            )}
            {activity.doors && activity.doors.length > 0 && (
              <span className="badge-inventory" style={{ padding: '4px 12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light)', fontSize: '0.85rem' }}>
                🚪 Doors Unlocked: {unlockedDoors.size} / {activity.doors.length}
              </span>
            )}
          </div>

          {/* Objective checklist */}
          {activity.objectives && activity.objectives.length > 0 && (
            <div
              className="mt-sm"
              style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}
            >
              {activity.objectives.map((obj, idx) => {
                let met = false;
                const lower = obj.toLowerCase();

                if (lower.includes('key')) {
                  const target = activity.keys?.length || 1;
                  met = collectedKeys.size >= target;
                } else if (lower.includes('door')) {
                  const target = activity.doors?.length || 1;
                  met = unlockedDoors.size >= target;
                } else if (lower.includes('coin')) {
                  const match = lower.match(/\b(\d+)\s+coin/);
                  const targetCoins = match ? parseInt(match[1]) : 1;
                  met = collectedItems.size >= targetCoins;
                } else if (lower.includes('block')) {
                  const match = lower.match(/\b(\d+)\s+block/);
                  const targetBlocks = match ? parseInt(match[1]) : 4;
                  met = dropZone.length >= targetBlocks;
                } else if (lower.includes('square')) {
                  const match = lower.match(/\b(\d+)\+?\s*(?:different\s*)?square/);
                  const targetSquares = match ? parseInt(match[1]) : 3;
                  met = visitedCells.size >= targetSquares;
                } else if (lower.includes('trophy') || lower.includes('goal')) {
                  const reachedTrophy = activity.endPosition
                    ? characterPos.row === activity.endPosition.row && characterPos.col === activity.endPosition.col
                    : false;
                  met = reachedTrophy || visitedCells.size >= 5;
                } else {
                  met = true;
                }

                return (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.85rem',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: met ? 'rgba(46, 125, 50, 0.15)' : 'var(--color-surface)',
                      border: met ? '1px solid var(--color-success-light)' : '1px solid var(--color-border-light)',
                      color: met ? 'var(--color-success)' : 'var(--color-text-dim)',
                      fontWeight: 600,
                      transition: 'all 0.25s ease',
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
            <div className="drop-zone-placeholder">All blocks placed! ✓</div>
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
          className={`drop-zone ${dragOver ? 'drag-over' : ''} ${result === 'success' ? 'correct' : result === 'error' ? 'incorrect' : ''
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
          {(() => {
            // Calculate which blocks are inside loops or part of nested loops
            const loopInfo: { [idx: number]: { isNestedOuter?: boolean; isNestedInner?: boolean; totalNestedCount?: number; insideLoopOf?: number } } = {};
            let k = 0;
            while (k < dropZone.length) {
              const b = dropZone[k];
              if (b.type === 'repeat') {
                const count1 = (b as any).repeatCount || 2;
                if (k + 1 < dropZone.length && dropZone[k + 1].type === 'repeat') {
                  const inner = dropZone[k + 1];
                  const count2 = (inner as any).repeatCount || 2;
                  const span = Math.max(1, (inner as any).repeatSpan || 1);
                  loopInfo[k] = { isNestedOuter: true, totalNestedCount: count1 * count2 };
                  loopInfo[k + 1] = { isNestedInner: true, totalNestedCount: count1 * count2 };
                  for (let s = 1; s <= span && k + 1 + s < dropZone.length; s++) {
                    loopInfo[k + 1 + s] = { insideLoopOf: k + 1 };
                  }
                  k += 2 + span;
                  continue;
                } else {
                  const span = Math.max(1, (b as any).repeatSpan || 1);
                  for (let s = 1; s <= span && k + s < dropZone.length; s++) {
                    loopInfo[k + s] = { insideLoopOf: k };
                  }
                  k += 1 + span;
                  continue;
                }
              }
              k++;
            }

            return dropZone.map((block, i) => {
              const info = loopInfo[i];
              const isInsideLoop = Boolean(info?.insideLoopOf !== undefined);
              const isNestedOuter = Boolean(info?.isNestedOuter);
              const isNestedInner = Boolean(info?.isNestedInner);

              return (
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
                    marginLeft: isInsideLoop ? '22px' : '0px',
                    borderLeft: isInsideLoop ? '4px solid #da77f2' : undefined,
                    boxShadow: isNestedOuter || isNestedInner ? '0 0 10px rgba(218, 119, 242, 0.4)' : undefined,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ marginRight: '2px', opacity: 0.7, fontWeight: 700 }}>{i + 1}.</span>
                    {isInsideLoop && (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(218, 119, 242, 0.25)', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                        ↳ in loop
                      </span>
                    )}
                    <span>{block.label}</span>

                    {/* Outer / Inner Loop Badges */}
                    {isNestedOuter && (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255, 215, 0, 0.25)', color: '#ffeaa7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(255, 215, 0, 0.4)' }}>
                        🌀 Outer Loop
                      </span>
                    )}
                    {isNestedInner && (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(0, 206, 209, 0.25)', color: '#81ecec', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(0, 206, 209, 0.4)' }}>
                        🌀 Inner Loop ({info?.totalNestedCount}x total!)
                      </span>
                    )}

                    {/* Loop range selector */}
                    {block.type === 'repeat' && (
                      <div
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <span style={{ opacity: 0.85 }}>Repeats:</span>
                        <select
                          value={(block as any).repeatSpan || 1}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateRepeatSpan(i, parseInt(e.target.value));
                          }}
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: '#ffffff',
                            border: '1px solid rgba(255, 255, 255, 0.35)',
                            borderRadius: '3px',
                            padding: '1px 4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                          title="Choose how many following blocks are inside this repeat loop"
                        >
                          <option value={1} style={{ background: '#222f3e', color: '#fff' }}>next 1 block</option>
                          <option value={2} style={{ background: '#222f3e', color: '#fff' }}>next 2 blocks</option>
                          <option value={3} style={{ background: '#222f3e', color: '#fff' }}>next 3 blocks</option>
                          <option value={4} style={{ background: '#222f3e', color: '#fff' }}>next 4 blocks</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Cancel Button */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeBlock(i);
                    }}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      marginLeft: '8px',
                      lineHeight: 1,
                      zIndex: 10,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 71, 87, 0.7)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)')}
                    title="Remove block and return to Available Blocks"
                    aria-label={`Remove block ${block.label}`}
                  >
                    ✕
                  </button>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Action Buttons */}
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

      {/* Success Celebration Card with 3-Star Rating */}
      {result === 'success' && starResult && (
        <div
          className="card alert-success mt-md text-center p-lg celebration-box"
          style={{
            background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.12), rgba(0, 184, 148, 0.18))',
            border: '2px solid var(--color-accent-green)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0, 184, 148, 0.2)',
          }}
        >
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>
            🎉 Quest Completed!
          </div>

          {/* 3 Stars Display */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '2.4rem',
              margin: '12px 0 6px 0',
            }}
          >
            <span style={{ filter: 'drop-shadow(0 2px 8px rgba(255,215,0,0.6))' }}>⭐</span>
            <span style={{ opacity: starResult.star2 ? 1 : 0.25, filter: starResult.star2 ? 'drop-shadow(0 2px 8px rgba(255,215,0,0.6))' : undefined }}>
              ⭐
            </span>
            <span style={{ opacity: starResult.star3 ? 1 : 0.25, filter: starResult.star3 ? 'drop-shadow(0 2px 8px rgba(255,215,0,0.6))' : undefined }}>
              ⭐
            </span>
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fbc02d', marginBottom: '12px' }}>
            {starResult.stars === 3
              ? '🌟 Master Coder! 3/3 Stars Earned!'
              : starResult.stars === 2
                ? '⭐ Great Job! 2/3 Stars Earned!'
                : '⭐ Level Cleared! 1/3 Stars Earned!'}
          </div>

          {/* Star Challenges Details */}
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              gap: '6px',
              textAlign: 'left',
              background: 'var(--color-surface)',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-light)',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>
              ⭐ Star 1: Reached the goal safely ✓
            </div>
            <div style={{ color: starResult.star2 ? 'var(--color-success)' : 'var(--color-text-dim)', fontWeight: 600 }}>
              {starResult.star2 ? '⭐' : '⚪'} Star 2: {starResult.star2Label}
            </div>
            <div style={{ color: starResult.star3 ? 'var(--color-success)' : 'var(--color-text-dim)', fontWeight: 600 }}>
              {starResult.star3 ? '⭐' : '⚪'} Star 3: {starResult.star3Label}
            </div>
          </div>

          <p style={{ margin: '0 0 14px 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Ready to test your knowledge, or keep experimenting with new block combinations?
          </p>

          {onGoToQuiz && (
            <button
              className="btn btn-success btn-lg"
              onClick={onGoToQuiz}
              style={{
                boxShadow: '0 4px 14px rgba(46, 125, 50, 0.4)',
                padding: '10px 24px',
                fontSize: '1.05rem',
                fontWeight: 700,
              }}
            >
              📝 Proceed to Quiz →
            </button>
          )}
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
