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

  // Ensure curriculum & quizzes across all 13 lessons are upgraded with Python syntax
  await updateCurriculumWithPython();
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

// ---- Python Curriculum & Quiz Migration ----
export async function updateCurriculumWithPython(): Promise<void> {
  try {
    console.log('🐍 Checking & updating Python curriculum and quizzes across all 13 lessons...');

    interface PythonLessonData {
      levelOrder: number;
      lessonOrder: number;
      title: string;
      explanation: string;
      example: string;
      passingScore: number;
      questions: Array<{
        text: string;
        options: Array<{ text: string; isCorrect: boolean }>;
      }>;
    }

    const pythonCurriculum: PythonLessonData[] = [
      // ----------------------------------------------------
      // Level 1: Star Island — Basics of Coding & Python
      // ----------------------------------------------------
      {
        levelOrder: 1,
        lessonOrder: 1,
        title: 'What is Coding? Meet Python!',
        explanation: `# What is Coding? Meet Python! 🐍\n\nCoding is like giving step-by-step instructions to a computer! Just like you follow steps to get dressed or bake cookies, a computer follows instructions that we write for it.\n\nComputers don't speak human languages like English or French. Instead, programmers use programming languages like **Python**!\n\nPython is one of the world's most popular and friendly programming languages. It powers robots, creates video games, and even helps NASA explore outer space! 🚀\n\n### How Python Thinks: Top-to-Bottom 📜\nComputers read instructions in order, starting from the very first line down to the last line. That order is called **sequencing**!`,
        example: `## Example: Morning Routine in Python 🌅\n\nHere is what a computer program looks like in real Python code:\n\n\`\`\`python\n# My Morning Routine in Python\nprint("1. Wake up ⏰")\nprint("2. Brush teeth 🪥")\nprint("3. Get dressed 👕")\nprint("4. Eat breakfast 🥣")\nprint("5. Go to school 🎒")\n\`\`\`\n\n### Python Super-Tips 💡\n- **\`#\` (Comments):** Any line starting with \`#\` is a friendly note for humans. Python skips it!\n- **\`print(...)\`:** Tells the computer to say or display something on the screen.\n- **Quotes (\`"..."\`):** Text inside quotes is called a **string**.\n- **Sequence:** If you run line 5 before line 3, you would go to school in your pajamas! 😂 Order always matters!`,
        passingScore: 70,
        questions: [
          {
            text: 'What is coding?',
            options: [
              { text: 'Giving step-by-step instructions to a computer', isCorrect: true },
              { text: 'Playing video games all day', isCorrect: false },
              { text: 'Drawing pictures with crayons', isCorrect: false },
              { text: 'Turning off the power switch', isCorrect: false },
            ],
          },
          {
            text: 'In Python, which function displays words on the screen?',
            options: [
              { text: 'print("Hello!")', isCorrect: true },
              { text: 'shout("Hello!")', isCorrect: false },
              { text: 'speak.loudly()', isCorrect: false },
              { text: 'screen.write()', isCorrect: false },
            ],
          },
          {
            text: 'Why does the ORDER of Python lines matter?',
            options: [
              { text: 'Python reads and runs each line from top to bottom in order', isCorrect: true },
              { text: 'The computer gets tired if lines are mixed up', isCorrect: false },
              { text: 'Order does not matter at all in Python', isCorrect: false },
              { text: 'Python reads lines backwards from bottom to top', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 1,
        lessonOrder: 2,
        title: 'Giving Instructions: Python Commands',
        explanation: `# Giving Instructions: Python Commands 🗺️\n\nComputers only do exactly what you tell them. They cannot guess!\n\nImagine you have a robot friend named **Codi**. To make Codi walk to a treasure chest, you need to give **clear, step-by-step commands**.\n\nIn Python, we call commands **functions**. When you want an action to happen right now, you write parentheses \`()\` at the end:\n- 🔵 \`robot.move_forward()\` — walk one square ahead\n- 🟠 \`robot.turn_left()\` — pivot left\n- 🟢 \`robot.turn_right()\` — pivot right`,
        example: `## Example: Guiding Codi the Robot 🤖\n\nTo move Codi 2 steps forward, turn right, and walk 1 step:\n\n\`\`\`python\n# Guide Codi to the Star ⭐\nrobot.move_forward()\nrobot.move_forward()\nrobot.turn_right()\nrobot.move_forward()\n\`\`\`\n\n### Why the Parentheses \`()\`? 🔍\nIn Python, parentheses \`()\` mean **"Perform this action right now!"**\nWithout \`()\`, the robot just stares at the instruction without moving!`,
        passingScore: 70,
        questions: [
          {
            text: 'What does the Python command robot.move_forward() do?',
            options: [
              { text: 'Makes the robot walk one step ahead', isCorrect: true },
              { text: 'Makes the robot jump backwards', isCorrect: false },
              { text: 'Powers down the robot', isCorrect: false },
              { text: 'Changes the robot color', isCorrect: false },
            ],
          },
          {
            text: 'In Python, what do the parentheses () mean at the end of robot.turn_right()?',
            options: [
              { text: 'They tell Python to run or execute that command right now', isCorrect: true },
              { text: 'They are just a smile emoji', isCorrect: false },
              { text: 'They mean the robot is sleeping', isCorrect: false },
              { text: 'They delete the instruction', isCorrect: false },
            ],
          },
          {
            text: 'How many steps forward will this Python code move the robot?\nrobot.move_forward()\nrobot.move_forward()\nrobot.move_forward()',
            options: [
              { text: '3 steps', isCorrect: true },
              { text: '1 step', isCorrect: false },
              { text: '2 steps', isCorrect: false },
              { text: '0 steps', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 1,
        lessonOrder: 3,
        title: 'Sequence Matters: Code in Order',
        explanation: `# Sequence Matters: Code in Order 🎯\n\nIn programming, the **order** of instructions is everything. If you shuffle lines in the wrong order, your program gets confused and won't work!\n\nThis is called **sequencing** — executing steps in exact chronological order.\n\n**Real life example:** What happens if you try to pour cereal before putting a bowl on the table? 🥣 A giant mess on the floor!`,
        example: `## Example: Baking a Cake in Python 🎂\n\nNotice how each step logically follows the one before it:\n\n\`\`\`python\n# The Delicious Cake Program 🎂\nread_recipe()\nmix_ingredients()\npour_into_pan()\nbake_in_oven()\ndecorate_cake()\n\`\`\`\n\n### What Happens if Sequence Fails? 🚨\n\`\`\`python\n# ❌ BUGGY ORDER:\nbake_in_oven()     # Wait, the pan is empty!\ndecorate_cake()    # There is no cake yet!\nmix_ingredients()  # Too late!\n\`\`\`\nPython obeys the exact sequence you provide. Always plan your sequence before pressing Run!`,
        passingScore: 70,
        questions: [
          {
            text: 'What is "sequencing" in computer programming?',
            options: [
              { text: 'Putting instructions in the exact correct order', isCorrect: true },
              { text: 'Choosing random block colors', isCorrect: false },
              { text: 'Typing words as fast as possible', isCorrect: false },
              { text: 'Restarting the computer', isCorrect: false },
            ],
          },
          {
            text: 'What happens if Python commands are placed in the wrong sequence?',
            options: [
              { text: 'The program will do the wrong thing or crash with an error', isCorrect: true },
              { text: 'Python automatically guesses what you meant and fixes it', isCorrect: false },
              { text: 'Nothing changes, computers do not care about order', isCorrect: false },
              { text: 'The computer creates a new game', isCorrect: false },
            ],
          },
          {
            text: 'Which Python sequence makes sense for getting dressed?',
            options: [
              { text: 'put_on_socks() followed by put_on_shoes()', isCorrect: true },
              { text: 'put_on_shoes() followed by put_on_socks()', isCorrect: false },
              { text: 'go_outside() followed by put_on_shirt()', isCorrect: false },
              { text: 'sleep() followed by wake_up()', isCorrect: false },
            ],
          },
        ],
      },

      // ----------------------------------------------------
      // Level 2: Rocket Valley — Loops, Patterns, Decisions
      // ----------------------------------------------------
      {
        levelOrder: 2,
        lessonOrder: 1,
        title: 'Loops: Repeating with Python',
        explanation: `# Loops: Repeating with Python 🔄\n\nWhat if you need a robot to walk 100 steps forward? Writing \`robot.move_forward()\` 100 times would make your fingers tired! 😴\n\nInstead, programmers use a **Loop**!\n\nA loop tells the computer: *"Repeat these instructions a specific number of times."*\n\nIn Python, we write loops using the \`for\` keyword and \`range()\`!`,
        example: `## Example: Without Loop vs. Python Loop\n\n**Without a Loop** (repetitive and tiring):\n\`\`\`python\nrobot.move_forward()\nrobot.move_forward()\nrobot.move_forward()\nrobot.move_forward()\n\`\`\`\n\n**With a Python \`for\` Loop** (clean, smart, and fast! ⚡):\n\`\`\`python\nfor step in range(4):\n    robot.move_forward()\n\`\`\`\n\n### The Secrets of Python Loops 🔑\n1. **\`range(4)\`**: Tells Python to count 4 times (0, 1, 2, 3).\n2. **The Colon \`:\`**: Always put a colon \`:\` at the end of the \`for\` line!\n3. **Indentation (4 spaces)**: Notice the space before \`robot.move_forward()\`. In Python, indented lines belong **inside** the loop!`,
        passingScore: 70,
        questions: [
          {
            text: 'What is a LOOP in programming?',
            options: [
              { text: 'A way to repeat instructions multiple times without retyping them', isCorrect: true },
              { text: 'A circular computer screen', isCorrect: false },
              { text: 'A broken wire inside the mouse', isCorrect: false },
              { text: 'A type of video game boss', isCorrect: false },
            ],
          },
          {
            text: 'In Python, how do you repeat an action 5 times?',
            options: [
              { text: 'for step in range(5):', isCorrect: true },
              { text: 'repeat 5 times:', isCorrect: false },
              { text: 'loop(5):', isCorrect: false },
              { text: 'do.again(5)', isCorrect: false },
            ],
          },
          {
            text: 'In Python, how does the computer know which lines are inside a loop?',
            options: [
              { text: 'They are indented with spaces underneath the loop line', isCorrect: true },
              { text: 'They are written in ALL CAPS', isCorrect: false },
              { text: 'They are drawn in green ink', isCorrect: false },
              { text: 'They have exclamation marks at the end', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 2,
        lessonOrder: 2,
        title: 'Patterns & Repetition: Rhythmic Code',
        explanation: `# Patterns & Repetition: Rhythmic Code 🎨\n\nA **pattern** is something that repeats in a predictable rhythm.\n- In music: 🥁 Boom, Clap, Boom, Clap!\n- In dancing: 💃 Step left, step right, step left, step right!\n- In coding: 🤖 Move, Turn, Move, Turn!\n\nWhen you discover the repeating pattern unit, you can wrap it in a Python loop to do complex tasks with just a few lines of code!`,
        example: `## Example: Climbing a Staircase in Python 🪜\n\nTo climb 3 steps on a staircase, notice the pattern: **Move Forward + Turn Right + Move Forward + Turn Left**!\n\n\`\`\`python\n# Climbing 3 stairs with a Python loop\nfor stair in range(3):\n    robot.move_forward()\n    robot.turn_right()\n    robot.move_forward()\n    robot.turn_left()\n\`\`\`\n\nBecause all 4 instructions are indented inside \`for stair in range(3):\`, Python repeats the entire pattern 3 times!`,
        passingScore: 70,
        questions: [
          {
            text: 'What is a PATTERN in computer programming?',
            options: [
              { text: 'A sequence of actions that repeats in a predictable way', isCorrect: true },
              { text: 'A random mistake on screen', isCorrect: false },
              { text: 'A keyboard shortcut', isCorrect: false },
              { text: 'A single instruction that only runs once', isCorrect: false },
            ],
          },
          {
            text: 'What comes next in the pattern list: [🔴, 🔵, 🔴, 🔵, 🔴, ?]',
            options: [
              { text: '🔵', isCorrect: true },
              { text: '🔴', isCorrect: false },
              { text: '🟢', isCorrect: false },
              { text: '⭐', isCorrect: false },
            ],
          },
          {
            text: 'If a Python loop repeats a 3-step pattern 4 times, how many total actions will occur?',
            options: [
              { text: '12 actions (3 × 4)', isCorrect: true },
              { text: '7 actions (3 + 4)', isCorrect: false },
              { text: '4 actions', isCorrect: false },
              { text: '1 action', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 2,
        lessonOrder: 3,
        title: 'Making Decisions: Python If-Statements',
        explanation: `# Making Decisions: Python If-Statements 🤔\n\nIn real life, you make decisions based on conditions:\n- **If** it is raining 🌧️ $\\rightarrow$ open your umbrella ☔\n- **Else** (if it's sunny) ☀️ $\\rightarrow$ wear sunglasses 😎\n\nIn Python, we use **\`if\`** and **\`else\`** statements to give our programs a brain! The computer checks if a condition is \`True\` or \`False\`, and chooses which code to execute.`,
        example: `## Example: Robot Wall Sensor in Python 🤖🧱\n\n\`\`\`python\n# Check for walls before moving!\nif robot.is_wall_ahead():\n    robot.turn_left()\n    print("Wall detected! Turned left 🔄")\nelse:\n    robot.move_forward()\n    print("Clear path! Stepped forward 🚶")\n\`\`\`\n\n### Notice the Python Rules 📐:\n1. \`if condition:\` ends with a colon \`:\`\n2. The action to take when True is indented.\n3. \`else:\` also ends with a colon \`:\` and indented action when False.`,
        passingScore: 70,
        questions: [
          {
            text: 'What is an IF-STATEMENT (Condition) in Python?',
            options: [
              { text: 'A way for the computer to make decisions based on whether something is True or False', isCorrect: true },
              { text: 'A loop that runs forever', isCorrect: false },
              { text: 'A way to turn the screen brightness up', isCorrect: false },
              { text: 'A message sent to a printer', isCorrect: false },
            ],
          },
          {
            text: 'What punctuation symbol must be placed at the end of an if or else line in Python?',
            options: [
              { text: 'A colon (:)', isCorrect: true },
              { text: 'A question mark (?)', isCorrect: false },
              { text: 'A dollar sign ($)', isCorrect: false },
              { text: 'A period (.)', isCorrect: false },
            ],
          },
          {
            text: 'In "if robot.is_wall_ahead(): robot.turn_left()", when does the robot turn left?',
            options: [
              { text: 'Only when robot.is_wall_ahead() is True', isCorrect: true },
              { text: 'Every single time', isCorrect: false },
              { text: 'Never', isCorrect: false },
              { text: 'Only when the computer is turned off', isCorrect: false },
            ],
          },
        ],
      },

      // ----------------------------------------------------
      // Level 3: Champion Peak — Variables & Combining Skills
      // ----------------------------------------------------
      {
        levelOrder: 3,
        lessonOrder: 1,
        title: 'Variables: Python Memory Boxes',
        explanation: `# Variables: Python Memory Boxes 📦\n\nA **variable** is like a labeled container where Python stores information for later.\n\nImagine having a magic box labeled \`coins\`.\n- 📥 **Create & Store:** \`coins = 0\`\n- 🔍 **Check:** Print \`coins\` to see what is inside\n- ➕ **Update:** Whenever you pick up a coin, add 1 to it: \`coins = coins + 1\` (or \`coins += 1\`)\n\nVariables allow games to remember your score, health, inventory, and player name!`,
        example: `## Example: Coin Tracker in Python 🪙\n\n\`\`\`python\n# Setting up our inventory variable\nplayer_name = "Alex"\ncoins = 0\n\nprint("Player:", player_name)\nprint("Starting coins:", coins)\n\n# Robot collects a coin!\nrobot.move_forward()\nrobot.pick_up()\ncoins += 1    # Adds 1 coin!\n\nprint("New coin balance:", coins)\n\`\`\`\n\nIn Python:\n- \`=\` is the **assignment operator** (it puts the value into the variable box).\n- \`+= 1\` is a handy shortcut for adding 1 to the current count!`,
        passingScore: 70,
        questions: [
          {
            text: 'What is a VARIABLE in Python?',
            options: [
              { text: 'A named container that stores information or numbers', isCorrect: true },
              { text: 'A cable plugged into the wall', isCorrect: false },
              { text: 'A type of computer keyboard', isCorrect: false },
              { text: 'An error message', isCorrect: false },
            ],
          },
          {
            text: 'In Python, how do you set a variable named gems to 5?',
            options: [
              { text: 'gems = 5', isCorrect: true },
              { text: 'set gems to 5', isCorrect: false },
              { text: '5 -> gems', isCorrect: false },
              { text: 'variable: gems = 5', isCorrect: false },
            ],
          },
          {
            text: 'If score = 10 and you run "score = score + 5", what is the value of score now?',
            options: [
              { text: '15', isCorrect: true },
              { text: '10', isCorrect: false },
              { text: '5', isCorrect: false },
              { text: '50', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 3,
        lessonOrder: 2,
        title: 'Combining Everything: Building a Python Program',
        explanation: `# Combining Everything: Building a Python Program 🧩\n\nReal software engineers don't use just one concept at a time. They combine:\n- 🧭 **Sequencing** — giving instructions in exact order\n- 🔁 **Loops** (\`for ... in range():\`) — repeating actions\n- 🤔 **Conditions** (\`if / else\`) — making intelligent choices\n- 📦 **Variables** (\`score = score + 1\`) — remembering data\n\nWhen you connect these superpowers together, you can build full games, smart robots, and incredible apps!`,
        example: `## Example: The Smart Treasure Hunter 🏆\n\nHere is a complete Python program using all four pillars of coding:\n\n\`\`\`python\n# Complete Treasure Collector Program\ncoins = 0\n\n# Loop 3 times through the corridor\nfor step in range(3):\n    robot.move_forward()\n    if robot.on_coin():\n        robot.pick_up()\n        coins += 1\n        print("Collected a coin! Total:", coins)\n\n# Check winning condition at the end\nif coins == 3:\n    print("🎉 Congratulations! You won the Golden Trophy! 🏆")\nelse:\n    print("Keep searching! Some coins were missed.")\n\`\`\``,
        passingScore: 70,
        questions: [
          {
            text: 'In Python, which comparison operator checks if two values are equal inside an if-statement?',
            options: [
              { text: '== (double equals)', isCorrect: true },
              { text: '= (single equals)', isCorrect: false },
              { text: '!=', isCorrect: false },
              { text: '+', isCorrect: false },
            ],
          },
          {
            text: 'Can you combine loops, variables, and if-statements in the same Python program?',
            options: [
              { text: 'Yes! Real-world software combines all of them together', isCorrect: true },
              { text: 'No, Python only lets you use one feature per file', isCorrect: false },
              { text: 'No, loops cannot contain if-statements', isCorrect: false },
              { text: 'Only on weekends', isCorrect: false },
            ],
          },
          {
            text: 'What does coins += 1 do in Python?',
            options: [
              { text: 'Increases the value of the coins variable by 1', isCorrect: true },
              { text: 'Resets coins to 0', isCorrect: false },
              { text: 'Deletes the coins variable', isCorrect: false },
              { text: 'Multiplies coins by 10', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 3,
        lessonOrder: 3,
        title: 'Build Your Own: The Python Creator',
        explanation: `# Build Your Own: The Python Creator 🎨\n\nYou have graduated to a true Python programmer! You understand:\n- Syntax & commands (\`robot.move_forward()\`)\n- Loops (\`for step in range(n):\`)\n- Decisions (\`if / else:\`)\n- Variables (\`coins = 0\`)\n\nIn this Champion Playground, you can design your own navigation algorithm. Experiment with different paths, collect coins, and watch your Python code generate live!`,
        example: `## Example: Clean Code & Comments 💡\n\nGreat programmers write clean, readable code with comments explaining their thoughts:\n\n\`\`\`python\n# Champion Playground Navigation Algorithm\ncoins = 0\n\n# Step 1: March forward across the courtyard\nfor step in range(4):\n    robot.move_forward()\n    if robot.on_coin():\n        robot.pick_up()\n        coins += 1\n\n# Step 2: Turn towards the victory pedestal\nrobot.turn_right()\nrobot.move_forward()\nprint("Course completed with coins:", coins)\n\`\`\`\n\nRemember: Making mistakes is a natural part of coding. Test, inspect, and celebrate every fix! 🚀`,
        passingScore: 60,
        questions: [
          {
            text: 'What does the # symbol mean in Python?',
            options: [
              { text: 'It starts a comment that Python ignores, written to explain code to humans', isCorrect: true },
              { text: 'It multiplies two numbers', isCorrect: false },
              { text: 'It ends the program immediately', isCorrect: false },
              { text: 'It creates a popup window', isCorrect: false },
            ],
          },
          {
            text: 'What makes code "clean" and easy to maintain?',
            options: [
              { text: 'Clear variable names, consistent indentation, and helpful comments', isCorrect: true },
              { text: 'Writing all the code on a single line without spaces', isCorrect: false },
              { text: 'Using random single-letter names like x, y, z for everything', isCorrect: false },
              { text: 'Never testing the program', isCorrect: false },
            ],
          },
          {
            text: 'What should a Python programmer do when they see an error message?',
            options: [
              { text: 'Read the message, check the line number, fix the issue, and test again', isCorrect: true },
              { text: 'Give up and never code again', isCorrect: false },
              { text: 'Delete the entire operating system', isCorrect: false },
              { text: 'Ignore the error and hope it disappears', isCorrect: false },
            ],
          },
        ],
      },

      // ----------------------------------------------------
      // Level 4: Cosmic Citadel — Functions, Debugging, Nested Loops
      // ----------------------------------------------------
      {
        levelOrder: 4,
        lessonOrder: 1,
        title: 'Magic Functions: Reusable Spells',
        explanation: `# Magic Functions: Reusable Spells! 🪄\n\nHave you ever wished you could give a nickname to a whole bunch of steps? In coding, that's called a **Function**!\n\nInstead of writing:\n- \`robot.move_forward()\`\n- \`robot.turn_right()\`\n- \`robot.move_forward()\`\nover and over, you can bundle them into a function called \`jump_square()\`!\n\nIn Python, we create functions using the magic word **\`def\`** (short for *define*).`,
        example: `## Creating and Calling a Function in Python 🧙\n\n\`\`\`python\n# Define your reusable magic spell\ndef collect_gem():\n    robot.move_forward()\n    robot.pick_up()\n    print("Gem collected! ✨")\n\n# Call your magic spell whenever you need it!\ncollect_gem()\ncollect_gem()\n\`\`\`\n\n### Why Functions are Superpowers 🌟\n1. **\`def function_name():\`** Tells Python: *"Remember these instructions under this name!"*\n2. **Indented body:** All indented lines belong inside the function spell.\n3. **Reuse anywhere:** Call \`collect_gem()\` 10 times without rewriting the steps!`,
        passingScore: 70,
        questions: [
          {
            text: 'What Python keyword is used to define a new function?',
            options: [
              { text: 'def', isCorrect: true },
              { text: 'make', isCorrect: false },
              { text: 'function', isCorrect: false },
              { text: 'create', isCorrect: false },
            ],
          },
          {
            text: 'Why do programmers use functions?',
            options: [
              { text: 'To write code once and reuse it easily, keeping programs organized', isCorrect: true },
              { text: 'To make the computer run slower', isCorrect: false },
              { text: 'To make the file size as huge as possible', isCorrect: false },
              { text: 'To hide their code from friends', isCorrect: false },
            ],
          },
          {
            text: 'In Python, how do you call or run a function named blast_off?',
            options: [
              { text: 'blast_off()', isCorrect: true },
              { text: 'call blast_off', isCorrect: false },
              { text: 'run.blast_off', isCorrect: false },
              { text: 'blast_off[]', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 4,
        lessonOrder: 2,
        title: 'The Bug Detective: Finding & Fixing Errors',
        explanation: `# The Bug Detective 🔍🐞\n\nA **bug** is an error or mistake in code. Even the most famous programmers in the world create bugs every single day!\n\nIn Python, there are two main types of bugs:\n1. 🛑 **Syntax Errors:** Forgetting a colon \`:\`, misspelling a word, or mixing up indentation. Python can't even start running!\n2. 🔄 **Logic Errors:** The code runs without crashing, but the robot walks into a wall instead of reaching the goal!\n\n**Debugging** is like solving a mystery:\n1. 🧐 **Inspect:** Read Python's error message and check the line number.\n2. 📍 **Isolate:** Find the exact command that went wrong.\n3. 🛠️ **Fix & Test:** Correct the typo or swap the block, and test again!`,
        example: `## Example: Spotting and Fixing Python Bugs 🕵️\n\n### ❌ Buggy Code (Syntax Error):\n\`\`\`python\nif robot.is_wall_ahead()    # Missing colon!\nrobot.turn_left()           # Missing indentation!\n\`\`\`\n\n### ✅ Cleaned by the Bug Detective:\n\`\`\`python\nif robot.is_wall_ahead():   # Added colon ':'\n    robot.turn_left()       # Indented with 4 spaces!\nelse:\n    robot.move_forward()\n\`\`\`\nPython error messages are not punishments — they are helpful clues pointing right to the solution! 🔍`,
        passingScore: 70,
        questions: [
          {
            text: 'What is a "BUG" in computer programming?',
            options: [
              { text: 'A mistake or error in the code that causes unexpected behavior', isCorrect: true },
              { text: 'An insect crawled inside the keyboard', isCorrect: false },
              { text: 'A type of computer mouse', isCorrect: false },
              { text: 'A fast way to type code', isCorrect: false },
            ],
          },
          {
            text: 'If you forget the colon (:) at the end of "if robot.is_wall_ahead():", what error does Python report?',
            options: [
              { text: 'SyntaxError', isCorrect: true },
              { text: 'ColorError', isCorrect: false },
              { text: 'InternetError', isCorrect: false },
              { text: 'SleepError', isCorrect: false },
            ],
          },
          {
            text: 'What should you do when your program encounters a bug?',
            options: [
              { text: 'Inspect the line, read the clue, fix the error, and test again', isCorrect: true },
              { text: 'Throw away the laptop', isCorrect: false },
              { text: 'Skip the lesson and ignore it', isCorrect: false },
              { text: 'Press every key at the same time', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 4,
        lessonOrder: 3,
        title: 'Nested Loops: Loops Inside Loops',
        explanation: `# Loops Inside Loops! 🌀\n\nWhen a loop lives inside another loop, we call it a **Nested Loop**!\n\nThink of a clock:\n- 🕒 **Outer Loop:** 12 hours\n- ⏱️ **Inner Loop:** 60 minutes for every single hour!\nTotal minutes in half a day = 12 × 60 = 720 minutes!\n\nIn Python, nested loops let you scan 2D game grids, sweep entire rooms, and draw complex patterns with very little code!`,
        example: `## Example: 2D Grid Sweeper in Python 🧹\n\n\`\`\`python\n# Sweep 3 rows, taking 4 steps in each row\nfor row in range(3):          # Outer loop\n    print("Starting row:", row)\n    for col in range(4):      # Inner loop\n        robot.move_forward()\n    robot.turn_right()\n\`\`\`\n\n### Notice the Indentation Levels 📐:\n- \`for row in range(3):\` (Outer loop, 0 spaces)\n- \`for col in range(4):\` (Indented 4 spaces inside outer loop)\n- \`robot.move_forward()\` (Indented 8 spaces inside inner loop)`,
        passingScore: 70,
        questions: [
          {
            text: 'What is a NESTED LOOP in Python?',
            options: [
              { text: 'A loop placed inside the body of another loop', isCorrect: true },
              { text: 'A loop that never stops running', isCorrect: false },
              { text: 'A loop designed to draw birds', isCorrect: false },
              { text: 'A broken while loop', isCorrect: false },
            ],
          },
          {
            text: 'If the outer loop runs 3 times and the inner loop runs 4 times, how many times does the inner action run?',
            options: [
              { text: '12 times (3 × 4)', isCorrect: true },
              { text: '7 times (3 + 4)', isCorrect: false },
              { text: '4 times', isCorrect: false },
              { text: '1 time', isCorrect: false },
            ],
          },
          {
            text: 'How are statements inside an inner nested loop indented in Python?',
            options: [
              { text: 'Indented twice (typically 8 spaces) to show they belong inside both loops', isCorrect: true },
              { text: 'Aligned with no spaces at the start of the line', isCorrect: false },
              { text: 'Written backwards', isCorrect: false },
              { text: 'Surrounded by parentheses', isCorrect: false },
            ],
          },
        ],
      },
      {
        levelOrder: 4,
        lessonOrder: 4,
        title: 'The Grand Master Quest: Python Master',
        explanation: `# The Grand Master Quest 🌌👑\n\nYou have reached the core of the Cosmic Citadel!\n\nThis is the ultimate test combining **everything** in your programming journey:\n- 🧭 **Sequencing**: Pinpoint precision in your instructions\n- 🔁 **Loops**: Code efficiency with \`for ... in range()\`\n- 📦 **Variables**: Tracking keys and scores (\`keys += 1\`)\n- 🪄 **Functions**: Reusable modular code blocks (\`def\`)\n- 🤔 **Conditions**: Unlocking gates only when conditions are met (\`if keys > 0:\`)\n\nSolve the maze, unlock the cosmic portal, and graduate as a certified Grand Master Python Coder! 🎓`,
        example: `## The Grand Master Python Blueprint 🗺️\n\n\`\`\`python\n# Grand Master Citadel Solution\nkeys = 0\ncoins = 0\n\ndef navigate_citadel():\n    global keys, coins\n    \n    # 1. Reach the Golden Key\n    for step in range(4):\n        robot.move_forward()\n    keys += 1\n    print("🗝️ Key acquired!")\n    \n    # 2. Unlock the Cosmic Gate\n    robot.turn_right()\n    robot.move_forward()\n    if keys > 0 and robot.is_at_door():\n        robot.unlock_door()\n        print("🚪 Gate unlocked!")\n    \n    # 3. Reach the Citadel Core!\n    for step in range(2):\n        robot.move_forward()\n    print("🌌 Reached the Cosmic Citadel Core! Victory!")\n\nnavigate_citadel()\n\`\`\``,
        passingScore: 70,
        questions: [
          {
            text: 'What makes a program truly "efficient" and well-engineered?',
            options: [
              { text: 'Accomplishing the goal cleanly with the fewest, clearest instructions and reusable functions', isCorrect: true },
              { text: 'Using 100 blocks when 3 blocks could do the same job', isCorrect: false },
              { text: 'Making the computer run as hot as possible', isCorrect: false },
              { text: 'Typing without looking at the screen', isCorrect: false },
            ],
          },
          {
            text: 'Which Python features work together in the Grand Master Quest?',
            options: [
              { text: 'Sequences, loops, conditions, variables, and functions — all cooperating seamlessly!', isCorrect: true },
              { text: 'Only sequences and nothing else', isCorrect: false },
              { text: 'Only print statements', isCorrect: false },
              { text: 'Only comments', isCorrect: false },
            ],
          },
          {
            text: 'What is the most valuable superpower a programmer has?',
            options: [
              { text: 'Curiosity, persistence, and breaking big problems down into simple steps', isCorrect: true },
              { text: 'Memorizing thousands of lines of text', isCorrect: false },
              { text: 'Having a giant glowing keyboard', isCorrect: false },
              { text: 'Never asking for help', isCorrect: false },
            ],
          },
        ],
      },
    ];

    for (const item of pythonCurriculum) {
      // Find level id
      const levelRes = await query('SELECT id FROM levels WHERE order_index = $1', [item.levelOrder]);
      if (levelRes.rows.length === 0) continue;
      const levelId = levelRes.rows[0].id;

      // Update lesson
      const lessonRes = await query(
        `UPDATE lessons 
         SET title = $1, explanation = $2, example = $3 
         WHERE level_id = $4 AND order_index = $5 
         RETURNING id`,
        [item.title, item.explanation, item.example, levelId, item.lessonOrder]
      );

      if (lessonRes.rows.length === 0) continue;
      const lessonId = lessonRes.rows[0].id;

      // Ensure quiz exists
      let quizId: number;
      const quizRes = await query('SELECT id FROM quizzes WHERE lesson_id = $1', [lessonId]);
      if (quizRes.rows.length === 0) {
        const newQuiz = await query(
          'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id',
          [lessonId, item.passingScore]
        );
        quizId = newQuiz.rows[0].id;
      } else {
        quizId = quizRes.rows[0].id;
        await query('UPDATE quizzes SET passing_score = $1 WHERE id = $2', [item.passingScore, quizId]);
      }

      // Update quiz questions
      await query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);
      for (let qIdx = 0; qIdx < item.questions.length; qIdx++) {
        const q = item.questions[qIdx];
        await query(
          'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
          [quizId, q.text, JSON.stringify(q.options), qIdx + 1]
        );
      }
    }

    console.log('✅ Python curriculum and quizzes synced across all 13 lessons!');
  } catch (err) {
    console.error('Failed to update curriculum with Python:', err);
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

  // Apply Python curriculum and quizzes
  await updateCurriculumWithPython();

  console.log('✅ Database seeded with levels, lessons, quizzes, badges, and demo users');
}
