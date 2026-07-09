// ============================================================
// CodeQuest — Quiz Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/lessons/:id/quiz — Get quiz for a lesson
router.get('/lessons/:id/quiz', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const lessonId = req.params.id;

    const quiz = db.prepare('SELECT * FROM quizzes WHERE lesson_id = ?').get(lessonId) as any;
    if (!quiz) {
      res.status(404).json({ success: false, error: 'No quiz found for this lesson' });
      return;
    }

    const questions = db.prepare(
      'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index'
    ).all(quiz.id) as any[];

    // Parse options JSON
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options || '[]')
    }));

    res.json({
      success: true,
      data: {
        ...quiz,
        questions: parsedQuestions
      }
    });
  } catch (error: any) {
    console.error('Get quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quiz' });
  }
});

// POST /api/quizzes/:id/submit — Submit quiz answers
router.post('/quizzes/:id/submit', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const quizId = req.params.id;
    const userId = req.user!.userId;
    const { answers } = req.body as { answers: { question_id: number; selected_index: number }[] };

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ success: false, error: 'Answers required' });
      return;
    }

    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId) as any;
    if (!quiz) {
      res.status(404).json({ success: false, error: 'Quiz not found' });
      return;
    }

    const questions = db.prepare(
      'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index'
    ).all(quiz.id) as any[];

    // Score the quiz
    let correctCount = 0;
    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.question_id);
      if (question) {
        const options = JSON.parse(question.options);
        if (options[answer.selected_index]?.isCorrect) {
          correctCount++;
        }
      }
    }

    const totalCount = questions.length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const passed = score >= quiz.passing_score;
    const pointsEarned = passed ? 10 + Math.floor(score / 10) : 2; // Base points + bonus for high scores

    // Update or create progress
    const existingProgress = db.prepare(
      'SELECT id FROM user_progress WHERE user_id = ? AND lesson_id = ?'
    ).get(userId, quiz.lesson_id) as any;

    if (existingProgress) {
      db.prepare(`
        UPDATE user_progress SET
          quiz_score = ?,
          quiz_passed = ?,
          completed = CASE WHEN ? = 1 THEN 1 ELSE completed END,
          points_earned = CASE WHEN ? > points_earned THEN ? ELSE points_earned END,
          completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = ?
      `).run(score, passed ? 1 : 0, passed ? 1 : 0, pointsEarned, pointsEarned, passed ? 1 : 0, existingProgress.id);
    } else {
      db.prepare(`
        INSERT INTO user_progress (user_id, lesson_id, completed, quiz_score, quiz_passed, points_earned, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
      `).run(userId, quiz.lesson_id, passed ? 1 : 0, score, passed ? 1 : 0, pointsEarned, passed ? 1 : 0);
    }

    // Check and award badges
    const badgesEarned = checkAndAwardBadges(db, userId, quiz.lesson_id, score);

    res.json({
      success: true,
      data: {
        score,
        passed,
        points_earned: pointsEarned,
        correct_count: correctCount,
        total_count: totalCount,
        badges_earned: badgesEarned
      }
    });
  } catch (error: any) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit quiz' });
  }
});

// POST /api/quizzes — Admin: create quiz for a lesson
router.post('/quizzes', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { lesson_id, passing_score, questions } = req.body;

    if (!lesson_id) {
      res.status(400).json({ success: false, error: 'lesson_id required' });
      return;
    }

    // Check if quiz already exists for this lesson
    const existing = db.prepare('SELECT id FROM quizzes WHERE lesson_id = ?').get(lesson_id);
    if (existing) {
      res.status(409).json({ success: false, error: 'Quiz already exists for this lesson' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO quizzes (lesson_id, passing_score) VALUES (?, ?)'
    ).run(lesson_id, passing_score || 70);

    const quizId = result.lastInsertRowid;

    // Insert questions if provided
    if (questions && Array.isArray(questions)) {
      const insertQ = db.prepare(
        'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES (?, ?, ?, ?)'
      );
      questions.forEach((q: any, index: number) => {
        insertQ.run(quizId, q.question_text, JSON.stringify(q.options), index + 1);
      });
    }

    res.status(201).json({ success: true, data: { id: quizId } });
  } catch (error: any) {
    console.error('Create quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to create quiz' });
  }
});

function checkAndAwardBadges(db: any, userId: number, lessonId: number, quizScore: number): any[] {
  const badges: any[] = [];
  const awardBadge = (badgeId: number) => {
    try {
      db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
      return true;
    } catch { return false; }
  };

  // First Steps: complete first lesson
  const completedCount = db.prepare(
    'SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND completed = 1'
  ).get(userId) as any;
  if (completedCount.count >= 1) {
    const badge = db.prepare("SELECT * FROM badges WHERE criteria = 'complete_first_lesson'").get() as any;
    if (badge && awardBadge(badge.id)) badges.push(badge);
  }

  // Perfect Quiz
  if (quizScore === 100) {
    const badge = db.prepare("SELECT * FROM badges WHERE criteria = 'perfect_quiz'").get() as any;
    if (badge && awardBadge(badge.id)) badges.push(badge);
  }

  // Streak of 3
  if (completedCount.count >= 3) {
    const badge = db.prepare("SELECT * FROM badges WHERE criteria = 'streak_3'").get() as any;
    if (badge && awardBadge(badge.id)) badges.push(badge);
  }

  // Level completion badges
  const checkLevel = (levelId: number, criteria: string) => {
    const levelLessons = db.prepare('SELECT COUNT(*) as count FROM lessons WHERE level_id = ? AND is_published = 1').get(levelId) as any;
    const levelCompleted = db.prepare(
      'SELECT COUNT(*) as count FROM user_progress up JOIN lessons l ON up.lesson_id = l.id WHERE l.level_id = ? AND up.user_id = ? AND up.completed = 1'
    ).get(levelId, userId) as any;
    if (levelCompleted.count >= levelLessons.count && levelLessons.count > 0) {
      const badge = db.prepare("SELECT * FROM badges WHERE criteria = ?").get(criteria) as any;
      if (badge && awardBadge(badge.id)) badges.push(badge);
    }
  };
  checkLevel(1, 'complete_level_1');
  checkLevel(2, 'complete_level_2');
  checkLevel(3, 'complete_level_3');

  // Lesson-specific badges
  const lessonBadges: Record<number, string> = {
    4: 'complete_lesson_4',
    6: 'complete_lesson_6',
    9: 'complete_lesson_9'
  };
  if (lessonBadges[lessonId]) {
    const badge = db.prepare("SELECT * FROM badges WHERE criteria = ?").get(lessonBadges[lessonId]) as any;
    if (badge && awardBadge(badge.id)) badges.push(badge);
  }

  // All lessons complete
  const totalLessons = db.prepare('SELECT COUNT(*) as count FROM lessons WHERE is_published = 1').get() as any;
  if (completedCount.count >= totalLessons.count && totalLessons.count > 0) {
    const badge = db.prepare("SELECT * FROM badges WHERE criteria = 'complete_all'").get() as any;
    if (badge && awardBadge(badge.id)) badges.push(badge);
  }

  return badges;
}

export default router;
