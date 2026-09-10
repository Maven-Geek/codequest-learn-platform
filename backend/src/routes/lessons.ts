// ============================================================
// CodeQuest — Lesson & Level Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/levels — List all levels with lesson counts and user progress
router.get('/levels', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(`
      SELECT l.*,
        (SELECT COUNT(*) FROM lessons WHERE level_id = l.id AND is_published = true) as lesson_count,
        (SELECT COUNT(*) FROM user_progress up
         JOIN lessons les ON up.lesson_id = les.id
         WHERE les.level_id = l.id AND up.user_id = $1 AND up.completed = true) as completed_count
      FROM levels l
      ORDER BY l.order_index
    `, [userId]);

    // Determine which levels are unlocked
    const levels = result.rows;
    const levelsWithAccess = levels.map((level: any, index: number) => {
      let is_unlocked = false;
      if (index === 0) {
        is_unlocked = true; // First level always unlocked
      } else {
        const prevLevel = levels[index - 1] as any;
        is_unlocked = parseInt(prevLevel.completed_count) >= parseInt(prevLevel.lesson_count) && parseInt(prevLevel.lesson_count) > 0;
      }
      return { ...level, is_unlocked };
    });

    res.json({ success: true, data: levelsWithAccess });
  } catch (error: any) {
    console.error('Get levels error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch levels' });
  }
});

function normalizeLessonActivityData(lesson: any) {
  let data = typeof lesson.activity_data === 'string' ? JSON.parse(lesson.activity_data || '{}') : (lesson.activity_data || {});
  if (lesson.id === 6 || lesson.title === 'Making Decisions') {
    if (!data.availableBlocks || data.availableBlocks.length < 7) {
      data = {
        ...data,
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
      };
    }
  }

  if (lesson.id === 7 || lesson.title === 'Variables — Remembering Things' || lesson.title?.includes('Variables')) {
    if (!data.availableBlocks || data.availableBlocks.length < 9) {
      data = {
        ...data,
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
      };
    }
  }

  if (lesson.id === 9 || lesson.title === 'Build Your Own!' || lesson.title?.includes('Build Your Own')) {
    data = {
      ...data,
      instructions: 'Welcome to the Champion Playground! 🎨 Build your own program to collect coins, navigate the castle pillars, and reach the trophy! There are many ways to solve it — be creative!',
      gameType: 'free-play',
      availableBlocks: [
        { id: 'fp-move1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
        { id: 'fp-move2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
        { id: 'fp-move3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
        { id: 'fp-move4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
        { id: 'fp-move5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
        { id: 'fp-move6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
        { id: 'fp-turnl', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
        { id: 'fp-turnr', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
        { id: 'fp-turnl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
        { id: 'fp-turnr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
        { id: 'fp-repeat', type: 'repeat', label: '🔁 Repeat 2 times', color: '#FF9F43', repeatCount: 2 },
        { id: 'fp-repeat3', type: 'repeat', label: '🔁 Repeat 3 times', color: '#FF9F43', repeatCount: 3 },
        { id: 'fp-pickup1', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
        { id: 'fp-pickup2', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
        { id: 'fp-pickup3', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
        { id: 'fp-pickup4', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' }
      ],
      gridSize: { rows: 5, cols: 5 },
      startPosition: { row: 4, col: 0 },
      endPosition: { row: 0, col: 4 },
      walls: [
        { row: 1, col: 1 },
        { row: 1, col: 3 },
        { row: 3, col: 1 },
        { row: 3, col: 3 }
      ],
      collectibles: [
        { row: 0, col: 2 },
        { row: 2, col: 0 },
        { row: 2, col: 2 },
        { row: 2, col: 4 },
        { row: 4, col: 2 }
      ],
      objectives: [
        'Collect at least 2 coins 🪙',
        'Use at least 4 blocks 🧱',
        'Reach the trophy 🏆 or visit 5+ squares!'
      ],
      characterEmoji: '🤖',
      goalEmoji: '🏆'
    };
  }

  // Lesson 10 / Magic Functions (Space Theme)
  if (
    lesson.title?.includes('Magic Functions') ||
    lesson.title?.includes('Reusable Spells') ||
    (lesson.id === 10 && !lesson.title?.includes('Variables')) ||
    (lesson.id === 11 && (lesson.title?.includes('Magic') || data?.theme === 'space' || !lesson.title?.includes('Bug')))
  ) {
    if (!data.availableBlocks || data.availableBlocks.filter((b: any) => b.type === 'move').length < 6) {
      data = {
        ...data,
        instructions: 'Define your cosmic movement spell! Guide the rocket around asteroids, collect the energy stars, and dock at Saturn!',
        theme: 'space',
        characterEmoji: '🚀',
        goalEmoji: '🪐',
        gridSize: { rows: 4, cols: 5 },
        startPosition: { row: 0, col: 0 },
        endPosition: { row: 3, col: 4 },
        walls: [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
        collectibles: [{ row: 0, col: 3 }, { row: 2, col: 4 }],
        availableBlocks: [
          { id: 'l10-m1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l10-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l10-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l10-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l10-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l10-m6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l10-m7', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l10-m8', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l10-tr1', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l10-tr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l10-tl1', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l10-tl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l10-r2-1', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l10-r2-2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l10-r3-1', type: 'repeat', label: '🔁 Repeat 3 times', color: '#da77f2', repeatCount: 3 },
        ],
        hints: [
          'Fly straight right across Row 0 to collect the first energy star at (0, 3).',
          'Turn Right at (0, 4) to face South, safely bypassing the asteroid cluster.',
          'Fly straight down Column 4 to reach Saturn at (3, 4)! Use Repeat blocks for a 3-star rating!'
        ],
        maxBlocksStar: 6,
      };
    }
  }

  // Lesson 11 / The Bug Detective (Castle Theme)
  if (
    lesson.title?.includes('Bug Detective') ||
    lesson.title?.includes('Finding & Fixing Errors') ||
    (lesson.id === 11 && lesson.title?.includes('Bug'))
  ) {
    if (!data.availableBlocks || data.availableBlocks.filter((b: any) => b.type === 'move').length < 6) {
      data = {
        ...data,
        instructions: 'Be a bug detective! The old program had wall collisions. Plan the correct route through the castle corridor.',
        theme: 'castle',
        characterEmoji: '🧙‍♂️',
        goalEmoji: '👑',
        gridSize: { rows: 4, cols: 4 },
        startPosition: { row: 0, col: 0 },
        endPosition: { row: 3, col: 3 },
        walls: [{ row: 0, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
        collectibles: [{ row: 1, col: 0 }, { row: 3, col: 1 }],
        availableBlocks: [
          { id: 'l11-m1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l11-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l11-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l11-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l11-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l11-m6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l11-m7', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l11-m8', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l11-tr1', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l11-tr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l11-tl1', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l11-tl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l11-r2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l11-r3', type: 'repeat', label: '🔁 Repeat 3 times', color: '#da77f2', repeatCount: 3 },
        ],
        hints: [
          'The top path is blocked by castle walls. Turn Right to head South down column 0!',
          'Collect the first crystal at (1, 0) and continue to the bottom corner (3, 0).',
          'Turn Left to face East and head straight towards the Crown at (3, 3)!'
        ],
        maxBlocksStar: 7,
      };
    }
  }

  // Lesson 12 / Nested Loops (Forest Theme)
  if (
    lesson.title?.includes('Nested Loops') ||
    lesson.title?.includes('Loops Inside Loops') ||
    lesson.id === 12
  ) {
    if (!data.availableBlocks || data.availableBlocks.filter((b: any) => b.type === 'repeat').length < 7) {
      data = {
        ...data,
        instructions: 'Use nested loops to sweep the enchanted forest and gather all magical crystals!',
        theme: 'forest',
        characterEmoji: '🦊',
        goalEmoji: '🌳',
        gridSize: { rows: 5, cols: 5 },
        startPosition: { row: 0, col: 0 },
        endPosition: { row: 4, col: 4 },
        walls: [{ row: 1, col: 2 }, { row: 3, col: 2 }],
        collectibles: [{ row: 0, col: 2 }, { row: 2, col: 2 }, { row: 4, col: 2 }],
        availableBlocks: [
          { id: 'l12-m1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l12-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l12-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l12-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l12-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l12-m6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l12-m7', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l12-m8', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l12-tr1', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l12-tr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l12-tl1', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l12-tl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l12-r2-1', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l12-r2-2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l12-r2-3', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l12-r2-4', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l12-r2-5', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l12-r2-6', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l12-r3', type: 'repeat', label: '🔁 Repeat 3 times', color: '#da77f2', repeatCount: 3 },
          { id: 'l12-r4', type: 'repeat', label: '🔁 Repeat 4 times', color: '#da77f2', repeatCount: 4 },
        ],
        hints: [
          'Repeat blocks allow you to glide through multiple squares with minimal code.',
          'Collect all 3 coins on your path to the Ancient Tree at (4, 4).'
        ],
        maxBlocksStar: 6,
      };
    }
  }

  // Lesson 13 / 14: The Grand Master Quest (Citadel Gate Theme)
  if (
    lesson.title?.includes('Grand Master') ||
    lesson.title?.includes('Citadel') ||
    lesson.id === 13 ||
    lesson.id === 14
  ) {
    if (!data.availableBlocks || data.availableBlocks.filter((b: any) => b.type === 'repeat').length < 7 || data.availableBlocks.filter((b: any) => b.type === 'turn-right').length < 3) {
      data = {
        ...data,
        instructions: 'The Grand Master Challenge! Find the Key 🗝️ to unlock the Cosmic Gate 🚪, gather the crystals, and reach the Citadel Core!',
        theme: 'space',
        characterEmoji: '🚀',
        goalEmoji: '🌌',
        gridSize: { rows: 5, cols: 5 },
        startPosition: { row: 0, col: 0 },
        endPosition: { row: 4, col: 4 },
        keys: [{ row: 0, col: 4 }],
        doors: [{ row: 2, col: 2 }],
        walls: [{ row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 3, col: 3 }],
        collectibles: [{ row: 1, col: 4 }, { row: 4, col: 1 }],
        availableBlocks: [
          { id: 'l13-m1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m7', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m8', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m9', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m10', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m11', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-m12', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'l13-tr1', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l13-tr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l13-tr3', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l13-tr4', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'l13-tl1', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l13-tl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l13-tl3', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l13-tl4', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
          { id: 'l13-r2-1', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l13-r2-2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l13-r2-3', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l13-r2-4', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l13-r2-5', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l13-r2-6', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
          { id: 'l13-r3', type: 'repeat', label: '🔁 Repeat 3 times', color: '#da77f2', repeatCount: 3 },
          { id: 'l13-r4', type: 'repeat', label: '🔁 Repeat 4 times', color: '#da77f2', repeatCount: 4 },
        ],
        hints: [
          'Head straight right across the top row to collect the Key at (0, 4).',
          'Once you have the Key, the locked gate at (2, 2) can be opened.',
          'Pass through the gate and fly to the Citadel Core at (4, 4)!'
        ],
        maxBlocksStar: 18,
      };
    }
  }
  return data;
}

// GET /api/levels/:id/lessons — Get lessons in a level
router.get('/levels/:id/lessons', authMiddleware, async (req: Request, res: Response) => {
  try {
    const levelId = req.params.id;
    const userId = req.user!.userId;

    const result = await query(`
      SELECT les.*,
        up.completed as is_completed,
        up.quiz_score,
        up.quiz_passed,
        up.points_earned
      FROM lessons les
      LEFT JOIN user_progress up ON up.lesson_id = les.id AND up.user_id = $1
      WHERE les.level_id = $2 AND les.is_published = true
      ORDER BY les.order_index
    `, [userId, levelId]);

    // Parse activity_data JSON
    const parsed = result.rows.map((l: any) => {
      let example = l.example;
      if (l.id === 7 || l.title?.includes('Variables') || (example && (example.includes('coins value') || example.includes('StepActioncoins')))) {
        example = `## Example: Counting Coins 🪙\n\n**Variable:** \`coins = 0\`\n\n| Step | Action | coins value |\n|:---:|:---|:---|\n| 1 | 🪙 Pick up coin | \`coins = 1\` |\n| 2 | 🪙 Pick up coin | \`coins = 2\` |\n| 3 | 🪙 Pick up coin | \`coins = 3\` |\n\nThe variable **"coins"** keeps track of how many coins we've collected!\n\nAt the end, we can check: *"Do we have 3 coins?"* ✅`;
      }
      return {
        ...l,
        example,
        activity_data: normalizeLessonActivityData(l),
        is_completed: !!l.is_completed
      };
    });

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Get lessons error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lessons' });
  }
});

// GET /api/lessons/:id — Get single lesson detail
router.get('/lessons/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user!.userId;

    const result = await query(`
      SELECT les.*,
        lev.title as level_title,
        up.completed as is_completed,
        up.quiz_score,
        up.quiz_passed,
        up.points_earned
      FROM lessons les
      JOIN levels lev ON les.level_id = lev.id
      LEFT JOIN user_progress up ON up.lesson_id = les.id AND up.user_id = $1
      WHERE les.id = $2
    `, [userId, lessonId]);

    const lesson = result.rows[0] as any;

    if (!lesson) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    lesson.activity_data = normalizeLessonActivityData(lesson);
    if (lesson.id === 7 || lesson.title?.includes('Variables') || (lesson.example && (lesson.example.includes('coins value') || lesson.example.includes('StepActioncoins')))) {
      lesson.example = `## Example: Counting Coins 🪙\n\n**Variable:** \`coins = 0\`\n\n| Step | Action | coins value |\n|:---:|:---|:---|\n| 1 | 🪙 Pick up coin | \`coins = 1\` |\n| 2 | 🪙 Pick up coin | \`coins = 2\` |\n| 3 | 🪙 Pick up coin | \`coins = 3\` |\n\nThe variable **"coins"** keeps track of how many coins we've collected!\n\nAt the end, we can check: *"Do we have 3 coins?"* ✅`;
    }
    lesson.is_completed = !!lesson.is_completed;

    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Get lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lesson' });
  }
});

// POST /api/lessons — Admin: create lesson
router.post('/lessons', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { level_id, order_index, title, explanation, example, activity_type, activity_data, is_published } = req.body;

    if (!level_id || !title || !explanation || !activity_type) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const result = await query(
      'INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data, is_published) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [level_id, order_index || 0, title, explanation, example || '', activity_type, JSON.stringify(activity_data || {}), is_published !== false]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Create lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lesson' });
  }
});

// PUT /api/lessons/:id — Admin: update lesson
router.put('/lessons/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    const { level_id, order_index, title, explanation, example, activity_type, activity_data, is_published } = req.body;

    const existing = await query('SELECT id FROM lessons WHERE id = $1', [lessonId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    await query(`
      UPDATE lessons SET
        level_id = COALESCE($1, level_id),
        order_index = COALESCE($2, order_index),
        title = COALESCE($3, title),
        explanation = COALESCE($4, explanation),
        example = COALESCE($5, example),
        activity_type = COALESCE($6, activity_type),
        activity_data = COALESCE($7, activity_data),
        is_published = COALESCE($8, is_published)
      WHERE id = $9
    `, [
      level_id, order_index, title, explanation, example, activity_type,
      activity_data ? JSON.stringify(activity_data) : null,
      is_published !== undefined ? is_published : null,
      lessonId
    ]);

    const updated = await query('SELECT * FROM lessons WHERE id = $1', [lessonId]);

    res.json({ success: true, data: updated.rows[0] });
  } catch (error: any) {
    console.error('Update lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lesson' });
  }
});

// DELETE /api/lessons/:id — Admin: delete lesson
router.delete('/lessons/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;

    const existing = await query('SELECT id FROM lessons WHERE id = $1', [lessonId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    await query('DELETE FROM lessons WHERE id = $1', [lessonId]);

    res.json({ success: true, data: { message: 'Lesson deleted' } });
  } catch (error: any) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lesson' });
  }
});

// GET /api/lessons-all — Admin: get all lessons including unpublished
router.get('/lessons-all', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT les.*, lev.title as level_title
      FROM lessons les
      JOIN levels lev ON les.level_id = lev.id
      ORDER BY lev.order_index, les.order_index
    `);

    const parsed = result.rows.map((l: any) => ({
      ...l,
      activity_data: JSON.parse(l.activity_data || '{}')
    }));

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Get all lessons error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lessons' });
  }
});

export default router;
