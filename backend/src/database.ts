// ============================================================
// CodeQuest — Database Setup + Seed Data (PostgreSQL / Supabase)
// ============================================================

import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Pool } = pg;

// ---- Enrollment Key Generator ----
export function generateEnrollmentKey(): string {
  // 6 character alphanumeric uppercase key
  return crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
}

// Connection pool — uses DATABASE_URL from Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

export function getPool(): pg.Pool {
  return pool;
}

// Helper for running queries — use this in route handlers
export async function query(text: string, params?: any[]): Promise<pg.QueryResult> {
  return pool.query(text, params);
}

// ---- Schema Creation ----

export async function initializeDatabase(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('learner', 'parent', 'teacher', 'admin')),
      display_name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '🤖',
      enrollment_key TEXT UNIQUE,
      parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS levels (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      description TEXT NOT NULL,
      icon_emoji TEXT DEFAULT '⭐'
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      explanation TEXT NOT NULL,
      example TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('drag-drop', 'puzzle', 'pattern', 'game')),
      activity_data TEXT NOT NULL DEFAULT '{}',
      is_published BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id SERIAL PRIMARY KEY,
      lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
      passing_score INTEGER NOT NULL DEFAULT 70
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '[]',
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon_emoji TEXT NOT NULL DEFAULT '🏅',
      criteria TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed BOOLEAN DEFAULT false,
      quiz_score INTEGER,
      quiz_passed BOOLEAN DEFAULT false,
      points_earned INTEGER DEFAULT 0,
      completed_at TIMESTAMPTZ,
      UNIQUE(user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      earned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, badge_id)
    );
  `);

  console.log('✅ Database tables created');

  // ---- Migration: add enrollment_key column if missing (for existing databases) ----
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_key TEXT UNIQUE`);
    // Backfill enrollment keys for existing learners that don't have one
    const learnersWithoutKey = await query(
      `SELECT id FROM users WHERE role = 'learner' AND enrollment_key IS NULL`
    );
    for (const row of learnersWithoutKey.rows) {
      let key = generateEnrollmentKey();
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const dup = await query('SELECT id FROM users WHERE enrollment_key = $1', [key]);
        if (dup.rows.length === 0) break;
        key = generateEnrollmentKey();
        attempts++;
      }
      await query('UPDATE users SET enrollment_key = $1 WHERE id = $2', [key, row.id]);
    }
    if (learnersWithoutKey.rows.length > 0) {
      console.log(`🔑 Backfilled enrollment keys for ${learnersWithoutKey.rows.length} learners`);
    }
  } catch (e) {
    // Column may already exist, ignore
  }

  // Ensure Level 4 (Cosmic Citadel) and lessons exist for existing and new databases
  await ensureLevel4Exists();
}

// ---- Level 4 Migration & Setup ----
export async function ensureLevel4Exists(): Promise<void> {
  try {
    const level4Check = await query('SELECT id FROM levels WHERE order_index = 4');
    let level4Id: number;

    if (level4Check.rows.length === 0) {
      console.log('🌌 Adding Level 4: Cosmic Citadel...');
      const levelRes = await query(
        `INSERT INTO levels (title, order_index, description, icon_emoji) VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          'Cosmic Citadel',
          4,
          'Journey into deep space! Master reusable functions, conquer nested loops, and debug like a champion detective!',
          '🌌',
        ]
      );
      level4Id = levelRes.rows[0].id;
    } else {
      level4Id = level4Check.rows[0].id;
    }

    // Check if Lesson 10 exists
    const l10Check = await query('SELECT id FROM lessons WHERE level_id = $1 AND order_index = 1', [level4Id]);
    if (l10Check.rows.length === 0) {
      console.log('📚 Adding Level 4 Lessons (10, 11, 12, 13) and Quizzes...');

      // Lesson 10: Magic Functions
      const l10 = await query(
        `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          level4Id, 1, 'Magic Functions: Reusable Spells',
          `# Magic Functions: Reusable Spells! 🪄\n\nHave you ever wished you could give a nickname to a whole bunch of steps? In coding, that's called a **Function**!\n\nInstead of writing:\n- 🔵 Move Forward\n- 🟢 Turn Right\n- 🔵 Move Forward\n\nover and over, you can bundle them into a function called \`jumpSquare()\`!\n\nWhenever you want the robot to do those steps, you just call your function: **\`jumpSquare()\`**! Functions save you time and keep your code tidy.`,
          `## Creating a Function 🧙\n\n\`\`\`javascript\nfunction collectGem() {\n  moveForward();\n  pickUp();\n}\n\n// Now call your magic spell twice!\ncollectGem();\ncollectGem();\n\`\`\`\nFunctions turn big, confusing code into clean, reusable superpowers!`,
          'drag-drop',
          JSON.stringify({
            instructions: 'Define your cosmic movement spell! Guide the rocket around asteroids and collect the energy stars.',
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
          }),
        ]
      );
      const l10Id = l10.rows[0].id;
      const q10 = await query('INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [l10Id, 70]);
      await query(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
        [q10.rows[0].id, 'What is a FUNCTION in computer programming?', JSON.stringify([
          { text: 'A named block of instructions that you can reuse anytime', isCorrect: true },
          { text: 'A broken computer part', isCorrect: false },
          { text: 'A key on the keyboard that deletes words', isCorrect: false },
          { text: 'A type of video game level', isCorrect: false },
        ]), 1]
      );
      await query(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
        [q10.rows[0].id, 'Why do programmers love using functions?', JSON.stringify([
          { text: 'They make the computer run slower', isCorrect: false },
          { text: 'They avoid repeating code and make programs organized and easy to read', isCorrect: true },
          { text: 'They change the computer screen color', isCorrect: false },
        ]), 2]
      );

      // Lesson 11: The Bug Detective
      const l11 = await query(
        `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          level4Id, 2, 'The Bug Detective: Finding & Fixing Errors',
          `# The Bug Detective 🔍🐞\n\nA "bug" is an error or mistake in code. Even the smartest engineers make bugs every day!\n\n**Debugging** is like solving a mystery:\n1. 🧐 **Inspect**: Watch where the robot goes.\n2. 📍 **Isolate**: Find the exact instruction that went wrong.\n3. 🛠️ **Fix**: Swap the block and test again!\n\nNever feel discouraged by errors — finding bugs is how great coders learn!`,
          `## Spotting the Bug 🕵️\n\nIf the robot hits a wall on Step 2:\n\`\`\`text\n1. Move Forward\n2. Move Forward ❌ (Hits wall!)\n3. Turn Left\n\`\`\`\nFix it by changing Step 2 to **Turn Right** before moving forward!`,
          'drag-drop',
          JSON.stringify({
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
          }),
        ]
      );
      const l11Id = l11.rows[0].id;
      const q11 = await query('INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [l11Id, 70]);
      await query(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
        [q11.rows[0].id, 'What is a "BUG" in computer programming?', JSON.stringify([
          { text: 'An insect living inside the laptop', isCorrect: false },
          { text: 'A mistake or error in the code that makes it behave unexpectedly', isCorrect: true },
          { text: 'A special type of computer monitor', isCorrect: false },
        ]), 1]
      );
      await query(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
        [q11.rows[0].id, 'What should you do when your program hits a bug?', JSON.stringify([
          { text: 'Throw the computer away', isCorrect: false },
          { text: 'Trace the steps, find where it went wrong, and test a fix', isCorrect: true },
          { text: 'Skip the lesson completely', isCorrect: false },
        ]), 2]
      );

      // Lesson 12: Nested Loops
      const l12 = await query(
        `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          level4Id, 3, 'Nested Loops: Loops Inside Loops',
          `# Loops Inside Loops! 🌀\n\nWhen a loop lives inside another loop, we call it a **Nested Loop**!\n\nThink about jumping jacks in gym class:\n- **Outer loop**: 3 sets\n- **Inner loop**: 10 jumps per set\n\nTotal jumps = 3 × 10 = 30 jumps!\n\nIn coding, nested loops let you sweep across entire 2D grids, create patterns, or scan multiple rows in just a few blocks!`,
          `## Example: 2D Sweeper 🧹\n\n\`\`\`javascript\nrepeat (3 times) {      // Outer loop\n  repeat (3 times) {    // Inner loop\n    moveForward();\n  }\n  turnRight();\n}\n\`\`\`\nNested loops produce powerful results with minimal code!`,
          'drag-drop',
          JSON.stringify({
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
          }),
        ]
      );
      const l12Id = l12.rows[0].id;
      const q12 = await query('INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [l12Id, 70]);
      await query(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
        [q12.rows[0].id, 'What is a NESTED LOOP?', JSON.stringify([
          { text: 'A loop that never stops running', isCorrect: false },
          { text: 'A loop placed inside another loop', isCorrect: true },
          { text: 'A loop made for drawing birds', isCorrect: false },
        ]), 1]
      );
      await query(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
        [q12.rows[0].id, 'If the outer loop runs 3 times and the inner loop runs 4 times, how many times does the inner action happen?', JSON.stringify([
          { text: '7 times', isCorrect: false },
          { text: '12 times (3 × 4)', isCorrect: true },
          { text: '1 time', isCorrect: false },
        ]), 2]
      );

      // Lesson 13: The Grand Master Quest
      const l13 = await query(
        `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          level4Id, 4, 'The Grand Master Quest',
          `# The Grand Master Quest 🌌👑\n\nYou have ascended to the core of the Cosmic Citadel!\n\nThis is the ultimate test combining **everything** in your programming journey:\n- 🧭 **Sequencing**: Precision instructions\n- 🔁 **Loops**: Code efficiency\n- 🗝️ **Keys & Doors**: Unlocking locked gateways\n- 🧱 **Obstacles**: Navigating around cosmic hazards\n\nSolve the maze, unlock the portal, and become a Grand Master Coder!`,
          `## Master Quest Strategy 🗺️\n\n1. 🗝️ Fly toward the Golden Key\n2. 🚪 Step onto the Locked Cosmic Doorway to unlock it\n3. 🪙 Collect the bonus energy crystals\n4. 🌌 Touch the Citadel Core!`,
          'drag-drop',
          JSON.stringify({
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
          }),
        ]
      );
      const l13Id = l13.rows[0].id;
      const q13 = await query('INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [l13Id, 70]);
      await query(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
        [q13.rows[0].id, 'What makes a program truly "efficient"?', JSON.stringify([
          { text: 'Using 100 blocks when 3 blocks could do the same thing', isCorrect: false },
          { text: 'Accomplishing the goal cleanly with the fewest, clearest instructions', isCorrect: true },
          { text: 'Making the computer as hot as possible', isCorrect: false },
        ]), 1]
      );
      await query(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
        [q13.rows[0].id, 'What is the most powerful tool a coder has?', JSON.stringify([
          { text: 'A giant keyboard', isCorrect: false },
          { text: 'Curiosity, persistence, and logical thinking', isCorrect: true },
          { text: 'Memorizing thousands of lines of text', isCorrect: false },
        ]), 2]
      );

      // Add Badges for Level 4 safely
      const level4Badges = [
        { name: 'Cosmic Champion', desc: 'Complete all lessons in Cosmic Citadel!', icon: '🌌', criteria: 'complete_level_4' },
        { name: 'Bug Detective', desc: 'Master finding and fixing bugs!', icon: '🔍', criteria: 'bug_hunter' },
        { name: 'Grand Master', desc: 'Complete the Grand Master Quest!', icon: '👑', criteria: 'master_coder' },
      ];

      for (const b of level4Badges) {
        const bCheck = await query('SELECT id FROM badges WHERE criteria = $1', [b.criteria]);
        if (bCheck.rows.length === 0) {
          await query('INSERT INTO badges (name, description, icon_emoji, criteria) VALUES ($1, $2, $3, $4)', [b.name, b.desc, b.icon, b.criteria]);
        }
      }

      console.log('✅ Level 4: Cosmic Citadel and all lessons & quizzes ready!');
    }

    // Always ensure Level 4 lessons have generous activity configs for existing databases
    try {
      const l10Up = {
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
      await query(`UPDATE lessons SET activity_data = $1 WHERE title LIKE '%Magic Functions%'`, [JSON.stringify(l10Up)]);

      const l11Up = {
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
      await query(`UPDATE lessons SET activity_data = $1 WHERE title LIKE '%Bug Detective%'`, [JSON.stringify(l11Up)]);

      const l12Up = {
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
      await query(`UPDATE lessons SET activity_data = $1 WHERE title LIKE '%Nested Loops%'`, [JSON.stringify(l12Up)]);

      const l13Up = {
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
      await query(`UPDATE lessons SET activity_data = $1 WHERE title LIKE '%Grand Master%'`, [JSON.stringify(l13Up)]);
    } catch (_) {}
  } catch (err) {
    console.error('Failed to ensure Level 4 exists:', err);
  }
}

// ---- Seed Data ----

export async function seedDatabase(): Promise<void> {
  // Check if already seeded
  const levelCheck = await query('SELECT COUNT(*) as count FROM levels');
  if (parseInt(levelCheck.rows[0].count) > 0) {
    console.log('📦 Database already seeded, skipping');
    return;
  }

  console.log('🌱 Seeding database...');

  // ---- Levels ----
  await query(
    `INSERT INTO levels (title, order_index, description, icon_emoji) VALUES
      ('Star Island', 1, 'Begin your coding adventure! Learn what coding is and how to give instructions step by step.', '🌟'),
      ('Rocket Valley', 2, 'Blast off with loops, patterns, and making decisions in your code!', '🚀'),
      ('Champion Peak', 3, 'Reach the top! Use variables, combine skills, and create your own programs!', '🏆'),
      ('Cosmic Citadel', 4, 'Journey into deep space! Master reusable functions, conquer nested loops, and debug like a champion detective!', '🌌')`
  );

  // ---- Lessons ----

  // --- Level 1: Star Island ---

  // Lesson 1: What is Coding?
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [1, 1, 'What is Coding?',
      `# What is Coding? 🤔\n\nCoding is like giving instructions to a computer! Just like you follow steps to get dressed in the morning, a computer follows steps that we write for it.\n\n**Think about it:** When you make a sandwich, you follow steps:\n1. Get bread\n2. Add peanut butter\n3. Add jelly\n4. Put bread on top\n\nThat's what coding is — writing steps in the right order!`,
      `## Example: Morning Routine 🌅\n\nHere's a "program" for getting ready:\n\n1. ⏰ Wake up\n2. 🪥 Brush teeth\n3. 👕 Get dressed\n4. 🥣 Eat breakfast\n5. 🎒 Go to school\n\nIf you mix up the order, things get silly! Imagine going to school before getting dressed! 😂\n\n**The order matters** — and that's called **sequencing**.`,
      'drag-drop',
      JSON.stringify({
        instructions: 'Put these morning routine steps in the right order! Drag each block to the correct position.',
        availableBlocks: [
          { id: 'step-eat', type: 'step', label: '🥣 Eat breakfast', color: '#FF9F43' },
          { id: 'step-wake', type: 'step', label: '⏰ Wake up', color: '#54A0FF' },
          { id: 'step-school', type: 'step', label: '🎒 Go to school', color: '#5F27CD' },
          { id: 'step-dress', type: 'step', label: '👕 Get dressed', color: '#01A3A4' },
          { id: 'step-brush', type: 'step', label: '🪥 Brush teeth', color: '#FF6B6B' }
        ],
        correctSequence: ['step-wake', 'step-brush', 'step-dress', 'step-eat', 'step-school']
      })
    ]
  );

  // Lesson 2: Giving Instructions
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [1, 2, 'Giving Instructions',
      `# Giving Instructions 🗺️\n\nComputers only do exactly what you tell them. They can't guess!\n\nImagine you have a robot friend. To make it walk to a treasure chest, you need to give it **clear, step-by-step instructions**.\n\nEach instruction is like one block:\n- 🔵 **Move Forward** — walk one step ahead\n- 🟠 **Turn Left** — face left\n- 🟢 **Turn Right** — face right`,
      `## Example: Robot Walk 🤖\n\nTo move the robot 3 steps forward:\n\n| Step | Instruction |\n|------|------------|\n| 1 | 🔵 Move Forward |\n| 2 | 🔵 Move Forward |\n| 3 | 🔵 Move Forward |\n\nThe robot does each step one at a time, in order!`,
      'drag-drop',
      JSON.stringify({
        instructions: 'Help the robot reach the star! Drag the right blocks in the right order.',
        availableBlocks: [
          { id: 'move-1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'move-2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'move-3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'turn-r', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'move-4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'move-5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' }
        ],
        correctSequence: ['move-1', 'move-2', 'turn-r', 'move-3', 'move-4', 'move-5'],
        gridSize: { rows: 4, cols: 5 },
        startPosition: { row: 0, col: 0 },
        endPosition: { row: 3, col: 2 },
        characterEmoji: '🤖',
        goalEmoji: '⭐'
      })
    ]
  );

  // Lesson 3: Sequence Matters!
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [1, 3, 'Sequence Matters!',
      `# Sequence Matters! 🎯\n\nIn coding, the **order** of your instructions is super important. If you put things in the wrong order, your program won't work right!\n\nThis is called **sequencing** — putting steps in the correct order.\n\n**Real life example:** What happens if you try to pour milk before opening the carton? 🥛 It doesn't work!`,
      `## Example: Baking a Cake 🎂\n\nRight order:\n1. 📖 Read recipe\n2. 🥣 Mix ingredients\n3. 🫙 Pour into pan\n4. 🔥 Put in oven\n5. ⏲️ Wait to bake\n6. 🎂 Decorate!\n\nWrong order:\n1. 🔥 Put in oven (wait, what goes in?!)\n2. 🎂 Decorate (nothing to decorate!)\n\n**Sequencing = Right order = Working code!**`,
      'puzzle',
      JSON.stringify({
        instructions: 'These steps for baking a cake are all mixed up! Put them in the right order.',
        puzzleType: 'sequence',
        items: [
          { id: 'bake-decorate', content: '🎂 Decorate the cake' },
          { id: 'bake-mix', content: '🥣 Mix the ingredients' },
          { id: 'bake-pour', content: '🫙 Pour into pan' },
          { id: 'bake-read', content: '📖 Read the recipe' },
          { id: 'bake-wait', content: '⏲️ Wait to bake' },
          { id: 'bake-oven', content: '🔥 Put in oven' }
        ],
        correctOrder: ['bake-read', 'bake-mix', 'bake-pour', 'bake-oven', 'bake-wait', 'bake-decorate']
      })
    ]
  );

  // --- Level 2: Rocket Valley ---

  // Lesson 4: Loops
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [2, 1, 'Loops — Doing Things Again',
      `# Loops — Doing Things Again 🔄\n\nSometimes you need to do the same thing many times. Instead of writing the same instruction over and over, you can use a **loop**!\n\nA loop says: "Do this action X number of times."\n\n**Real life example:** When you bounce a ball 10 times, you don't think "bounce, bounce, bounce..." ten separate times. You think "bounce the ball 10 times!" That's a loop!`,
      `## Example: Without Loop vs With Loop\n\n**Without a loop** (so much writing!):\n1. 🔵 Move Forward\n2. 🔵 Move Forward\n3. 🔵 Move Forward\n4. 🔵 Move Forward\n\n**With a loop** (much easier!):\n🔁 Repeat 4 times:\n  - 🔵 Move Forward\n\nBoth do the same thing, but the loop is shorter and smarter! 🧠`,
      'drag-drop',
      JSON.stringify({
        instructions: 'Use a REPEAT block to move the robot to the star. Don\'t use too many blocks!',
        availableBlocks: [
          { id: 'repeat-4', type: 'repeat', label: '🔁 Repeat 4 times', color: '#FF9F43', repeatCount: 4 },
          { id: 'move-loop', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
          { id: 'turn-r-loop', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
          { id: 'repeat-2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#FF9F43', repeatCount: 2 },
          { id: 'move-extra', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' }
        ],
        correctSequence: ['repeat-4', 'move-loop'],
        gridSize: { rows: 1, cols: 5 },
        startPosition: { row: 0, col: 0 },
        endPosition: { row: 0, col: 4 },
        characterEmoji: '🤖',
        goalEmoji: '⭐'
      })
    ]
  );

  // Lesson 5: Patterns & Repetition
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [2, 2, 'Patterns & Repetition',
      `# Patterns & Repetition 🎨\n\nPatterns are everywhere! In music 🎵, in art 🎨, and in coding 💻.\n\nA **pattern** is something that repeats in a predictable way. When you spot a pattern, you can use **loops** to create it!\n\n**Examples:**\n- 🔴🔵🔴🔵🔴🔵 — the pattern is 🔴🔵, repeated 3 times\n- ⬆️➡️⬆️➡️ — the pattern is ⬆️➡️, repeated 2 times`,
      `## Example: Color Pattern\n\nWhat comes next?\n🟢🟡🟢🟡🟢❓\n\nThe pattern is 🟢🟡 repeating.\nSo the answer is 🟡!\n\n## Example: Shape Pattern\n\n⭐🌙⭐🌙⭐❓\n\nThe pattern is ⭐🌙 repeating.\nSo the answer is 🌙!`,
      'puzzle',
      JSON.stringify({
        instructions: 'Complete the pattern! Drag the items to fill in the missing spots.',
        puzzleType: 'pattern',
        items: [
          { id: 'p-red', content: '🔴', type: 'circle' },
          { id: 'p-blue', content: '🔵', type: 'circle' },
          { id: 'p-red2', content: '🔴', type: 'circle' },
          { id: 'p-blue2', content: '🔵', type: 'circle' },
          { id: 'p-red3', content: '🔴', type: 'circle' },
          { id: 'p-blue3', content: '🔵', type: 'circle' }
        ],
        correctOrder: ['p-red', 'p-blue', 'p-red2', 'p-blue2', 'p-red3', 'p-blue3']
      })
    ]
  );

  // Lesson 6: Making Decisions (Conditions)
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [2, 3, 'Making Decisions',
      `# Making Decisions 🤔\n\nIn real life, you make decisions all the time:\n- **If** it's raining → take an umbrella ☔\n- **If** you're hungry → eat a snack 🍎\n- **If** the light is red → stop! 🛑\n\nIn coding, we call these **conditions** or **if-statements**. The computer checks if something is true, and then decides what to do!\n\n**Pattern:** IF (something is true) → THEN (do this action)`,
      `## Example: Robot Decision\n\nOur robot is walking and might find a wall:\n\n🟩 IF wall ahead → 🟢 Turn Left\n🟩 IF no wall → 🔵 Move Forward\n\nThe robot checks at each step:\n- Is there a wall? If yes, turn.\n- No wall? Keep going!\n\nThis is how robots and programs make smart choices! 🧠`,
      'drag-drop',
      JSON.stringify({
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
      })
    ]
  );

  // --- Level 3: Champion Peak ---

  // Lesson 7: Variables
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [3, 1, 'Variables — Remembering Things',
      `# Variables — Remembering Things 📦\n\nA **variable** is like a labeled box where you can store information.\n\nImagine you have a box labeled "Score". You can:\n- 📥 **Put** a number in it: Score = 0\n- 👀 **Look** at what's inside: Score is 0\n- ✏️ **Change** what's inside: Score = Score + 10\n\nVariables help your program remember and use information!`,
      `## Example: Counting Coins 🪙\n\n**Variable:** \`coins = 0\`\n\n| Step | Action | coins value |\n|:---:|:---|:---|\n| 1 | 🪙 Pick up coin | \`coins = 1\` |\n| 2 | 🪙 Pick up coin | \`coins = 2\` |\n| 3 | 🪙 Pick up coin | \`coins = 3\` |\n\nThe variable **"coins"** keeps track of how many coins we've collected!\n\nAt the end, we can check: *"Do we have 3 coins?"* ✅`,
      'drag-drop',
      JSON.stringify({
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
      })
    ]
  );

  // Lesson 8: Combining Everything
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [3, 2, 'Combining Everything',
      `# Combining Everything 🧩\n\nNow you know:\n- ✅ **Sequencing** — putting steps in order\n- ✅ **Loops** — repeating actions\n- ✅ **Conditions** — making decisions\n- ✅ **Variables** — remembering things\n\nReal programs use **all of these together**! Let's practice combining them to solve bigger challenges.`,
      `## Example: Smart Robot\n\nHere's a program that uses everything:\n\n📦 coins = 0\n🔁 Repeat 3 times:\n  🔵 Move Forward\n  🟩 If coin here → Pick Up (coins = coins + 1)\n🟩 If coins = 3 → 🎉 Celebrate!\n\nThis program uses:\n- A **variable** (coins)\n- A **loop** (repeat 3 times)\n- **Conditions** (if coin here, if coins = 3)\n- **Sequence** (the order of everything)`,
      'puzzle',
      JSON.stringify({
        instructions: 'Put together a complete program using all the concepts you\'ve learned! Arrange these steps in the right order.',
        puzzleType: 'sequence',
        items: [
          { id: 'combo-check', content: '🟩 If coins = 3, celebrate! 🎉' },
          { id: 'combo-loop', content: '🔁 Repeat 3 times: Move & Check' },
          { id: 'combo-var', content: '📦 Set coins = 0' },
          { id: 'combo-move', content: '🔵 Move Forward' },
          { id: 'combo-pick', content: '🟩 If coin here → Pick up coin' }
        ],
        correctOrder: ['combo-var', 'combo-loop', 'combo-move', 'combo-pick', 'combo-check']
      })
    ]
  );

  // Lesson 9: Build Your Own!
  await query(
    `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [3, 3, 'Build Your Own!',
      `# Build Your Own! 🎨\n\nCongratulations! You've learned all the basics of coding:\n- Sequencing\n- Loops\n- Conditions\n- Variables\n- Patterns\n\nNow it's time for the **ultimate challenge**: create your own program! Use any blocks you want to guide the robot through a custom course.\n\nThere's no single right answer — be creative! 🌈`,
      `## Tips for Your Creation 💡\n\n1. **Plan first** — think about what you want the robot to do\n2. **Start simple** — get the basic steps right\n3. **Add loops** — can you make it shorter?\n4. **Test it** — run your program and see what happens!\n\nRemember: Real programmers try, fail, fix, and try again. That's how coding works! 💪`,
      'game',
      JSON.stringify({
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
      })
    ]
  );

  // ---- Quizzes ----
  // Quiz for Lesson 1
  const quiz1 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [1, 70]
  );
  const q1Id = quiz1.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q1Id, 'What is coding?', JSON.stringify([
      { text: 'Playing video games', isCorrect: false },
      { text: 'Giving step-by-step instructions to a computer', isCorrect: true },
      { text: 'Drawing pictures', isCorrect: false },
      { text: 'Reading books', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q1Id, 'Why does the ORDER of instructions matter?', JSON.stringify([
      { text: 'It doesn\'t matter at all', isCorrect: false },
      { text: 'Because computers do things in the order you write them', isCorrect: true },
      { text: 'Because computers are slow', isCorrect: false },
      { text: 'Because coding is hard', isCorrect: false }
    ]), 2]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q1Id, 'What is "sequencing" in coding?', JSON.stringify([
      { text: 'Making things colorful', isCorrect: false },
      { text: 'Putting instructions in the right order', isCorrect: true },
      { text: 'Counting numbers', isCorrect: false },
      { text: 'Turning off the computer', isCorrect: false }
    ]), 3]
  );

  // Quiz for Lesson 2
  const quiz2 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [2, 70]
  );
  const q2Id = quiz2.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q2Id, 'What does the "Move Forward" block do?', JSON.stringify([
      { text: 'Makes the robot jump', isCorrect: false },
      { text: 'Makes the robot walk one step ahead', isCorrect: true },
      { text: 'Makes the robot spin around', isCorrect: false },
      { text: 'Makes the robot stop', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q2Id, 'If you want the robot to turn, which blocks can you use?', JSON.stringify([
      { text: 'Move Forward', isCorrect: false },
      { text: 'Turn Left or Turn Right', isCorrect: true },
      { text: 'Pick Up', isCorrect: false },
      { text: 'Stop', isCorrect: false }
    ]), 2]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q2Id, 'How many steps does "Move Forward, Move Forward, Move Forward" make the robot take?', JSON.stringify([
      { text: '1 step', isCorrect: false },
      { text: '2 steps', isCorrect: false },
      { text: '3 steps', isCorrect: true },
      { text: '10 steps', isCorrect: false }
    ]), 3]
  );

  // Quiz for Lesson 3
  const quiz3 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [3, 70]
  );
  const q3Id = quiz3.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q3Id, 'What happens if you put coding steps in the wrong order?', JSON.stringify([
      { text: 'Nothing, it works fine', isCorrect: false },
      { text: 'The program might not work correctly', isCorrect: true },
      { text: 'The computer breaks', isCorrect: false },
      { text: 'The screen turns off', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q3Id, 'Which is the correct order for making a sandwich?', JSON.stringify([
      { text: 'Eat → Add filling → Get bread', isCorrect: false },
      { text: 'Get bread → Add filling → Eat', isCorrect: true },
      { text: 'Add filling → Get bread → Eat', isCorrect: false },
      { text: 'Eat → Get bread → Add filling', isCorrect: false }
    ]), 2]
  );

  // Quiz for Lesson 4
  const quiz4 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [4, 70]
  );
  const q4Id = quiz4.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q4Id, 'What is a LOOP in coding?', JSON.stringify([
      { text: 'A type of food', isCorrect: false },
      { text: 'A way to repeat actions multiple times', isCorrect: true },
      { text: 'A bug in the code', isCorrect: false },
      { text: 'A type of computer', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q4Id, '"Repeat 5 times: Jump" — how many times will you jump?', JSON.stringify([
      { text: '1 time', isCorrect: false },
      { text: '3 times', isCorrect: false },
      { text: '5 times', isCorrect: true },
      { text: '10 times', isCorrect: false }
    ]), 2]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q4Id, 'Why are loops useful?', JSON.stringify([
      { text: 'They make code longer', isCorrect: false },
      { text: 'They save time by not repeating the same instructions', isCorrect: true },
      { text: 'They make the computer faster', isCorrect: false },
      { text: 'They are not useful', isCorrect: false }
    ]), 3]
  );

  // Quiz for Lesson 5
  const quiz5 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [5, 70]
  );
  const q5Id = quiz5.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q5Id, 'What comes next: 🔴🔵🔴🔵🔴❓', JSON.stringify([
      { text: '🔴', isCorrect: false },
      { text: '🔵', isCorrect: true },
      { text: '🟢', isCorrect: false },
      { text: '🟡', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q5Id, 'A pattern is something that...', JSON.stringify([
      { text: 'Happens randomly', isCorrect: false },
      { text: 'Repeats in a predictable way', isCorrect: true },
      { text: 'Only happens once', isCorrect: false },
      { text: 'Is always the same color', isCorrect: false }
    ]), 2]
  );

  // Quiz for Lesson 6
  const quiz6 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [6, 70]
  );
  const q6Id = quiz6.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q6Id, 'What is a CONDITION (If-statement) in coding?', JSON.stringify([
      { text: 'A way to make the computer sing', isCorrect: false },
      { text: 'A way for the computer to make a decision based on something being true or false', isCorrect: true },
      { text: 'A type of loop', isCorrect: false },
      { text: 'A way to stop the program', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q6Id, '"If it\'s raining, take an umbrella." What is the condition?', JSON.stringify([
      { text: 'Take an umbrella', isCorrect: false },
      { text: 'It\'s raining', isCorrect: true },
      { text: 'Go outside', isCorrect: false },
      { text: 'Umbrella', isCorrect: false }
    ]), 2]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q6Id, '"If wall ahead, turn right." When does the robot turn right?', JSON.stringify([
      { text: 'Always', isCorrect: false },
      { text: 'Never', isCorrect: false },
      { text: 'Only when there is a wall ahead', isCorrect: true },
      { text: 'Only when it wants to', isCorrect: false }
    ]), 3]
  );

  // Quiz for Lesson 7
  const quiz7 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [7, 70]
  );
  const q7Id = quiz7.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q7Id, 'What is a VARIABLE?', JSON.stringify([
      { text: 'A type of game', isCorrect: false },
      { text: 'A labeled box that stores information', isCorrect: true },
      { text: 'A special computer key', isCorrect: false },
      { text: 'A type of loop', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q7Id, 'If score = 5, and you add 3, what is score now?', JSON.stringify([
      { text: '3', isCorrect: false },
      { text: '5', isCorrect: false },
      { text: '8', isCorrect: true },
      { text: '15', isCorrect: false }
    ]), 2]
  );

  // Quiz for Lesson 8
  const quiz8 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [8, 70]
  );
  const q8Id = quiz8.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q8Id, 'Which coding concepts can be COMBINED together?', JSON.stringify([
      { text: 'Only loops', isCorrect: false },
      { text: 'Only conditions', isCorrect: false },
      { text: 'Sequences, loops, conditions, and variables — all of them!', isCorrect: true },
      { text: 'None of them', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q8Id, 'What does this program do: "Set coins=0, Repeat 3 times: Move and Pick up"?', JSON.stringify([
      { text: 'Moves once and picks up one coin', isCorrect: false },
      { text: 'Moves 3 times and picks up 3 coins', isCorrect: true },
      { text: 'Does nothing', isCorrect: false },
      { text: 'Picks up 10 coins', isCorrect: false }
    ]), 2]
  );

  // Quiz for Lesson 9
  const quiz9 = await query(
    'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id', [9, 60]
  );
  const q9Id = quiz9.rows[0].id;
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q9Id, 'What is the MOST important skill in coding?', JSON.stringify([
      { text: 'Typing really fast', isCorrect: false },
      { text: 'Problem-solving and logical thinking', isCorrect: true },
      { text: 'Having the newest computer', isCorrect: false },
      { text: 'Memorizing everything', isCorrect: false }
    ]), 1]
  );
  await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
    [q9Id, 'What should you do when your program doesn\'t work?', JSON.stringify([
      { text: 'Give up', isCorrect: false },
      { text: 'Buy a new computer', isCorrect: false },
      { text: 'Try to find the problem, fix it, and try again', isCorrect: true },
      { text: 'Ask someone else to do it', isCorrect: false }
    ]), 2]
  );

  // ---- Badges ----
  await query(
    `INSERT INTO badges (name, description, icon_emoji, criteria) VALUES
      ('First Steps', 'Complete your very first lesson!', '👣', 'complete_first_lesson'),
      ('Star Student', 'Complete all lessons in Star Island!', '🌟', 'complete_level_1'),
      ('Rocket Rider', 'Complete all lessons in Rocket Valley!', '🚀', 'complete_level_2'),
      ('Champion Coder', 'Complete all lessons in Champion Peak!', '🏆', 'complete_level_3'),
      ('Quiz Whiz', 'Score 100% on any quiz!', '🧠', 'perfect_quiz'),
      ('Streak Star', 'Complete 3 lessons in a row!', '🔥', 'streak_3'),
      ('Loop Master', 'Complete the loops lesson!', '🔄', 'complete_lesson_4'),
      ('Decision Maker', 'Complete the conditions lesson!', '🤔', 'complete_lesson_6'),
      ('Code Creator', 'Complete the Build Your Own lesson!', '🎨', 'complete_lesson_9'),
      ('All Star', 'Complete every lesson on the platform!', '💫', 'complete_all')`
  );

  // ---- Default Users ----
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const learnerPasswordHash = bcrypt.hashSync('learn123', 10);
  const parentPasswordHash = bcrypt.hashSync('parent123', 10);
  const teacherPasswordHash = bcrypt.hashSync('teach123', 10);

  await query(
    `INSERT INTO users (username, email, password_hash, role, display_name, avatar_url) VALUES ($1, $2, $3, $4, $5, $6)`,
    ['admin', 'admin@codequest.com', adminPasswordHash, 'admin', 'Admin', '👑']
  );

  const learnerEnrollmentKey = generateEnrollmentKey();
  await query(
    `INSERT INTO users (username, email, password_hash, role, display_name, avatar_url, enrollment_key) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    ['coder_kid', 'kid@codequest.com', learnerPasswordHash, 'learner', 'Coder Kid', '🤖', learnerEnrollmentKey]
  );
  await query(
    `INSERT INTO users (username, email, password_hash, role, display_name, avatar_url) VALUES ($1, $2, $3, $4, $5, $6)`,
    ['parent1', 'parent@codequest.com', parentPasswordHash, 'parent', 'Parent', '👨‍👩‍👧']
  );
  await query(
    `INSERT INTO users (username, email, password_hash, role, display_name, avatar_url) VALUES ($1, $2, $3, $4, $5, $6)`,
    ['teacher1', 'teacher@codequest.com', teacherPasswordHash, 'teacher', 'Ms. Code', '👩‍🏫']
  );

  // Link child to parent and teacher
  await query('UPDATE users SET parent_id = (SELECT id FROM users WHERE username = $1) WHERE username = $2', ['parent1', 'coder_kid']);
  await query('UPDATE users SET teacher_id = (SELECT id FROM users WHERE username = $1) WHERE username = $2', ['teacher1', 'coder_kid']);

  console.log(`🔑 Learner "coder_kid" enrollment key: ${learnerEnrollmentKey}`);

  console.log('✅ Database seeded with levels, lessons, quizzes, badges, and demo users');
}
