// ============================================================
// CodeQuest — Coding Lab Routes (Multi-language, Sandbox,
// Challenges, Code Golf, Snippets, Streaks & Comparison)
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware } from '../middleware/auth';
import { CodingLanguage, CodingLanguageInfo, CodeComparisonSample } from '../../../shared/src/types';

const router = Router();

// Language catalog data
const LANGUAGES: CodingLanguageInfo[] = [
  {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    badge: 'Beginner Friendly',
    tagline: 'Clean, readable, and powerful',
    description: 'The world\'s most popular beginner language. Uses plain English-like syntax, indentation instead of brackets, and is used by NASA, Google, and game creators!',
    difficulty: 'Beginner',
    defaultTemplate: `# Python 3 Coding Playground 🐍\nhero_name = "Code Explorer"\nlevel = 5\npower = 99.5\n\ndef greet(name):\n    """Friendly greeting function."""\n    return f"Welcome to CodeQuest, {name}!"\n\nprint(greet(hero_name))\nprint(f"Level: {level} | Power: {power}")\n`
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '⚡',
    badge: 'Web Standard',
    tagline: 'The language of the Internet',
    description: 'Every website in the world runs JavaScript! Fast, dynamic, and versatile. Learn to create interactive apps, browser games, and dynamic animations!',
    difficulty: 'Intermediate',
    defaultTemplate: `// JavaScript Coding Playground ⚡\nlet heroName = "Code Explorer";\nlet level = 5;\nlet skills = ["Coding", "Problem Solving", "Creativity"];\n\nfunction showStats(name, lvl) {\n    console.log("Hero: " + name);\n    console.log("Level: " + lvl);\n    console.log("Skills: " + skills.join(", "));\n}\n\nshowStats(heroName, level);\n`
  },
  {
    id: 'java',
    name: 'Java',
    icon: '☕',
    badge: 'Strongly Typed',
    tagline: 'Enterprise-grade OOP power',
    description: 'The language behind Minecraft and Android apps! Teaches disciplined strong typing, object-oriented concepts, and rock-solid software architecture.',
    difficulty: 'Advanced',
    defaultTemplate: `// Java Coding Playground ☕\npublic class Main {\n    public static void main(String[] args) {\n        String heroName = "Code Explorer";\n        int level = 5;\n        boolean ready = true;\n        \n        System.out.println("Hero: " + heroName);\n        System.out.println("Level: " + level);\n        System.out.println("Ready: " + ready);\n    }\n}\n`
  }
];

// Code comparison samples (Recommendation #2)
const COMPARISON_SAMPLES: CodeComparisonSample[] = [
  {
    title: 'Declaring Variables',
    concept: 'Variables',
    description: 'How variables and basic types are declared in each language.',
    python: `# Python uses dynamic typing and snake_case\nhero_name = "Alex"\nscore = 150\nis_ready = True\n\nprint(hero_name, score, is_ready)`,
    javascript: `// JavaScript uses let/const and camelCase\nlet heroName = "Alex";\nlet score = 150;\nlet isReady = true;\n\nconsole.log(heroName, score, isReady);`,
    java: `// Java requires explicit types and semicolons\npublic class Main {\n    public static void main(String[] args) {\n        String heroName = "Alex";\n        int score = 150;\n        boolean isReady = true;\n        \n        System.out.println(heroName + " " + score + " " + isReady);\n    }\n}`
  },
  {
    title: 'Lists & Arrays',
    concept: 'Data Structures',
    description: 'How to store and access collections of items.',
    python: `# Python Lists\nitems = ["Shield", "Sword", "Potion"]\nitems.append("Amulet")\n\nprint("First item:", items[0])\nprint("Total:", len(items))`,
    javascript: `// JavaScript Arrays\nlet items = ["Shield", "Sword", "Potion"];\nitems.push("Amulet");\n\nconsole.log("First item:", items[0]);\nconsole.log("Total:", items.length);`,
    java: `// Java Arrays\npublic class Main {\n    public static void main(String[] args) {\n        String[] items = {"Shield", "Sword", "Potion"};\n        \n        System.out.println("First item: " + items[0]);\n        System.out.println("Total: " + items.length);\n    }\n}`
  },
  {
    title: 'Conditionals (If / Else)',
    concept: 'Logic',
    description: 'Branching logic and decision making.',
    python: `# Python: indentation and colons\nlevel = 8\n\nif level >= 10:\n    print("Master Rank")\nelif level >= 5:\n    print("Adept Rank")\nelse:\n    print("Novice Rank")`,
    javascript: `// JavaScript: parentheses and braces\nlet level = 8;\n\nif (level >= 10) {\n    console.log("Master Rank");\n} else if (level >= 5) {\n    console.log("Adept Rank");\n} else {\n    console.log("Novice Rank");\n}`,
    java: `// Java: typed variable, parentheses, braces\npublic class Main {\n    public static void main(String[] args) {\n        int level = 8;\n        \n        if (level >= 10) {\n            System.out.println("Master Rank");\n        } else if (level >= 5) {\n            System.out.println("Adept Rank");\n        } else {\n            System.out.println("Novice Rank");\n        }\n    }\n}`
  },
  {
    title: 'Repeating Loops',
    concept: 'Loops',
    description: 'Iterating over numbers or sequences.',
    python: `# Python: for ... in range()\nfor i in range(1, 4):\n    print(f"Lap {i}")`,
    javascript: `// JavaScript: standard 3-part for loop\nfor (let i = 1; i <= 3; i++) {\n    console.log(\`Lap \${i}\`);\n}`,
    java: `// Java: typed 3-part for loop\npublic class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 3; i++) {\n            System.out.println("Lap " + i);\n        }\n    }\n}`
  },
  {
    title: 'Reusable Functions',
    concept: 'Functions',
    description: 'Creating modular, reusable blocks of code.',
    python: `# Python: def keyword and return\ndef calculate_score(gems, bonus):\n    """Returns total score."""\n    return (gems * 10) + bonus\n\nprint(calculate_score(5, 20)) # 70`,
    javascript: `// JavaScript: function keyword\nfunction calculateScore(gems, bonus) {\n    return (gems * 10) + bonus;\n}\n\nconsole.log(calculateScore(5, 20)); // 70`,
    java: `// Java: static method with typed return and params\npublic class Main {\n    public static int calculateScore(int gems, int bonus) {\n        return (gems * 10) + bonus;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(calculateScore(5, 20)); // 70\n    }\n}`
  }
];

// GET /api/coding/languages — List supported languages with details
router.get('/languages', (_req: Request, res: Response) => {
  res.json({ success: true, data: LANGUAGES });
});

// GET /api/coding/comparison — Get side-by-side language comparison samples (Recommendation #2)
router.get('/comparison', (_req: Request, res: Response) => {
  res.json({ success: true, data: COMPARISON_SAMPLES });
});

// GET /api/coding/preference — Get user's preferred coding language
router.get('/preference', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await query(
      'SELECT preferred_coding_language, coding_streak_count, last_coding_streak_date FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        preferred_coding_language: user?.preferred_coding_language || 'python',
        coding_streak_count: user?.coding_streak_count || 0,
        last_coding_streak_date: user?.last_coding_streak_date || null
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch language preference' });
  }
});

// PUT /api/coding/preference — Update user's persistent language in DB (User Answer #1)
router.put('/preference', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { language } = req.body;

    if (!['python', 'javascript', 'java'].includes(language)) {
      res.status(400).json({ success: false, error: 'Invalid language. Must be python, javascript, or java' });
      return;
    }

    await query(
      'UPDATE users SET preferred_coding_language = $1 WHERE id = $2',
      [language, userId]
    );

    res.json({ success: true, data: { preferred_coding_language: language } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update language preference' });
  }
});

// POST /api/coding/streak — Update or check daily coding streak (Recommendation #8)
router.post('/streak', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userResult = await query(
      'SELECT coding_streak_count, last_coding_streak_date FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];
    const today = new Date().toISOString().split('T')[0];
    let streak = user?.coding_streak_count || 0;
    const lastDate = user?.last_coding_streak_date ? new Date(user.last_coding_streak_date).toISOString().split('T')[0] : null;

    let updated = false;
    if (!lastDate) {
      streak = 1;
      updated = true;
    } else if (lastDate === today) {
      // Already recorded today
      updated = false;
    } else {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        streak += 1;
      } else {
        // Streak broken, restart at 1
        streak = 1;
      }
      updated = true;
    }

    if (updated) {
      await query(
        'UPDATE users SET coding_streak_count = $1, last_coding_streak_date = $2 WHERE id = $3',
        [streak, today, userId]
      );

      // Check if 3-day streak badge should be awarded
      if (streak >= 3) {
        const badgeRes = await query('SELECT id FROM badges WHERE criteria = $1', ['coding_streak_3']);
        if (badgeRes.rows.length > 0) {
          const badgeId = badgeRes.rows[0].id;
          const userBadge = await query('SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2', [userId, badgeId]);
          if (userBadge.rows.length === 0) {
            await query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [userId, badgeId]);
          }
        }
      }
    }

    res.json({ success: true, data: { streak, updated, lastDate: today } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update streak' });
  }
});

// GET /api/coding/snippets — Get user's snippet library + collectible spell book (Recommendation #4)
router.get('/snippets', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const lang = req.query.language as string | undefined;

    let queryStr = `
      SELECT * FROM code_snippets 
      WHERE (user_id = $1 OR is_spell_book = true)
    `;
    const params: any[] = [userId];

    if (lang) {
      queryStr += ` AND language = $2`;
      params.push(lang);
    }

    queryStr += ` ORDER BY created_at DESC`;

    const result = await query(queryStr, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch snippets' });
  }
});

// POST /api/coding/snippets — Save new code snippet (Recommendation #4)
router.post('/snippets', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { title, language, code, description } = req.body;

    if (!title || !language || !code) {
      res.status(400).json({ success: false, error: 'Title, language, and code are required' });
      return;
    }

    const result = await query(
      `INSERT INTO code_snippets (user_id, title, language, code, description, is_spell_book)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [userId, title, language, code, description || '']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save snippet' });
  }
});

// DELETE /api/coding/snippets/:id — Delete user snippet
router.delete('/snippets/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const snippetId = req.params.id;

    await query('DELETE FROM code_snippets WHERE id = $1 AND user_id = $2', [snippetId, userId]);
    res.json({ success: true, message: 'Snippet deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete snippet' });
  }
});

// GET /api/coding/challenges — Daily quests & challenges (Recommendation #5)
router.get('/challenges', authMiddleware, async (req: Request, res: Response) => {
  try {
    const lang = req.query.language as string | undefined;
    let queryStr = 'SELECT * FROM coding_challenges';
    const params: any[] = [];

    if (lang) {
      queryStr += ' WHERE language = $1';
      params.push(lang);
    }
    queryStr += ' ORDER BY difficulty, id';

    const result = await query(queryStr, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch challenges' });
  }
});

// GET /api/coding/challenges/:id/leaderboard — Code Golf Leaderboard (Recommendation #6)
router.get('/challenges/:id/leaderboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const challengeId = req.params.id;

    const result = await query(
      `SELECT cs.*, u.display_name as user_display_name, u.avatar_url
       FROM challenge_submissions cs
       JOIN users u ON cs.user_id = u.id
       WHERE cs.challenge_id = $1 AND cs.completed = true
       ORDER BY cs.code_length ASC, cs.created_at ASC
       LIMIT 20`,
      [challengeId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// POST /api/coding/challenges/:id/submit — Submit code golf challenge (Recommendation #6)
router.post('/challenges/:id/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const challengeId = req.params.id;
    const { code, execution_time_ms } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, error: 'Code is required' });
      return;
    }

    const challengeRes = await query('SELECT * FROM coding_challenges WHERE id = $1', [challengeId]);
    if (challengeRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Challenge not found' });
      return;
    }
    const challenge = challengeRes.rows[0];

    // Validate solution pattern if configured
    let passed = true;
    if (challenge.solution_pattern) {
      const regex = new RegExp(challenge.solution_pattern, 'i');
      if (!regex.test(code)) {
        passed = false;
      }
    }

    const codeLength = code.trim().length;

    // Record submission
    const subRes = await query(
      `INSERT INTO challenge_submissions (challenge_id, user_id, code, code_length, execution_time_ms, completed)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [challengeId, userId, code, codeLength, execution_time_ms || 0, passed]
    );

    // Award Code Golfer badge if completed
    if (passed) {
      const badgeRes = await query('SELECT id FROM badges WHERE criteria = $1', ['code_golf_completed']);
      if (badgeRes.rows.length > 0) {
        const badgeId = badgeRes.rows[0].id;
        const userBadge = await query('SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2', [userId, badgeId]);
        if (userBadge.rows.length === 0) {
          await query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [userId, badgeId]);
        }
      }
    }

    res.json({
      success: true,
      data: {
        passed,
        codeLength,
        xpEarned: passed ? challenge.xp_reward : 0,
        submission: subRes.rows[0]
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to submit challenge' });
  }
});

// POST /api/coding/validate — Validate user code against patterns (Client/Server Pattern Checker)
router.post('/validate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code, patterns, expectedOutput } = req.body;
    if (!code) {
      res.json({ success: true, data: { passed: false, message: 'No code submitted.' } });
      return;
    }

    const failedPatterns: string[] = [];
    if (Array.isArray(patterns)) {
      for (const p of patterns) {
        const regex = new RegExp(p);
        if (!regex.test(code)) {
          failedPatterns.push(p);
        }
      }
    }

    const passed = failedPatterns.length === 0;
    res.json({
      success: true,
      data: {
        passed,
        failedCount: failedPatterns.length,
        expectedOutput
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to validate code' });
  }
});

export default router;
