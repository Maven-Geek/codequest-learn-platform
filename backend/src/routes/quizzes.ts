// ============================================================
// CodeQuest — Quiz Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/lessons/:id/quiz — Get quiz for a lesson
router.get('/lessons/:id/quiz', authMiddleware, async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;

    const quizResult = await query('SELECT * FROM quizzes WHERE lesson_id = $1', [lessonId]);
    const quiz = quizResult.rows[0] as any;
    if (!quiz) {
      res.status(404).json({ success: false, error: 'No quiz found for this lesson' });
      return;
    }

    const questionsResult = await query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index',
      [quiz.id]
    );

    // Parse options JSON
    const parsedQuestions = questionsResult.rows.map((q: any) => ({
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

// POST /api/quizzes/:id/submit — Submit quiz answers (learners only)
router.post('/quizzes/:id/submit', authMiddleware, requireRole('learner'), async (req: Request, res: Response) => {
  try {
    const quizId = req.params.id;
    const userId = req.user!.userId;
    const { answers } = req.body as { answers: { question_id: number; selected_index: number }[] };

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ success: false, error: 'Answers required' });
      return;
    }

    const quizResult = await query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
    const quiz = quizResult.rows[0] as any;
    if (!quiz) {
      res.status(404).json({ success: false, error: 'Quiz not found' });
      return;
    }

    const questionsResult = await query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index',
      [quiz.id]
    );
    const questions = questionsResult.rows as any[];

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
    const existingProgress = await query(
      'SELECT id FROM user_progress WHERE user_id = $1 AND lesson_id = $2',
      [userId, quiz.lesson_id]
    );

    if (existingProgress.rows.length > 0) {
      await query(`
        UPDATE user_progress SET
          quiz_score = $1,
          quiz_passed = $2,
          completed = CASE WHEN $2 = true THEN true ELSE completed END,
          points_earned = CASE WHEN $3 > points_earned THEN $3 ELSE points_earned END,
          completed_at = CASE WHEN $2 = true THEN NOW() ELSE completed_at END
        WHERE id = $4
      `, [score, passed, pointsEarned, existingProgress.rows[0].id]);
    } else {
      await query(`
        INSERT INTO user_progress (user_id, lesson_id, completed, quiz_score, quiz_passed, points_earned, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $3 = true THEN NOW() ELSE NULL END)
      `, [userId, quiz.lesson_id, passed, score, passed, pointsEarned]);
    }

    // Check and award badges
    const badgesEarned = await checkAndAwardBadges(userId, quiz.lesson_id, score);

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
router.post('/quizzes', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { lesson_id, passing_score, questions } = req.body;

    if (!lesson_id) {
      res.status(400).json({ success: false, error: 'lesson_id required' });
      return;
    }

    // Check if quiz already exists for this lesson
    const existing = await query('SELECT id FROM quizzes WHERE lesson_id = $1', [lesson_id]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: 'Quiz already exists for this lesson' });
      return;
    }

    const result = await query(
      'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id',
      [lesson_id, passing_score || 70]
    );

    const quizId = result.rows[0].id;

    // Insert questions if provided
    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await query(
          'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
          [quizId, q.question_text, JSON.stringify(q.options), i + 1]
        );
      }
    }

    res.status(201).json({ success: true, data: { id: quizId } });
  } catch (error: any) {
    console.error('Create quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to create quiz' });
  }
});

// PUT /api/lessons/:id/quiz — Admin: create or update quiz for a lesson (atomic upsert)
router.put('/lessons/:id/quiz', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id as string, 10);
    const { passing_score, questions } = req.body;

    if (isNaN(lessonId)) {
      res.status(400).json({ success: false, error: 'Valid lesson id required' });
      return;
    }

    // Check if a quiz exists for this lesson
    const existing = await query('SELECT id FROM quizzes WHERE lesson_id = $1', [lessonId]);
    let quizId: number;

    if (existing.rows.length > 0) {
      quizId = existing.rows[0].id;
      if (passing_score !== undefined) {
        await query('UPDATE quizzes SET passing_score = $1 WHERE id = $2', [passing_score, quizId]);
      }
    } else {
      const result = await query(
        'INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, $2) RETURNING id',
        [lessonId, passing_score ?? 70]
      );
      quizId = result.rows[0].id;
    }

    // Replace questions if provided
    if (questions && Array.isArray(questions)) {
      // Clear existing questions
      await query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);

      // Insert new questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.question_text && Array.isArray(q.options) && q.options.length > 0) {
          await query(
            'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
            [quizId, q.question_text, JSON.stringify(q.options), i + 1]
          );
        }
      }
    }

    res.json({ success: true, data: { id: quizId, message: 'Quiz saved successfully' } });
  } catch (error: any) {
    console.error('Upsert quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to save quiz' });
  }
});

// DELETE /api/lessons/:id/quiz — Admin: delete quiz for a lesson
router.delete('/lessons/:id/quiz', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id as string, 10);
    if (isNaN(lessonId)) {
      res.status(400).json({ success: false, error: 'Valid lesson id required' });
      return;
    }

    const existing = await query('SELECT id FROM quizzes WHERE lesson_id = $1', [lessonId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Quiz not found for this lesson' });
      return;
    }

    const quizId = existing.rows[0].id;
    await query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);
    await query('DELETE FROM quizzes WHERE id = $1', [quizId]);

    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error: any) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete quiz' });
  }
});

async function checkAndAwardBadges(userId: number, lessonId: number, quizScore: number): Promise<any[]> {
  const badges: any[] = [];
  const awardBadge = async (badgeId: number) => {
    try {
      await query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, badgeId]);
      return true;
    } catch { return false; }
  };

  // First Steps: complete first lesson
  const completedCount = await query(
    'SELECT COUNT(*) as count FROM user_progress WHERE user_id = $1 AND completed = true',
    [userId]
  );
  if (parseInt(completedCount.rows[0].count) >= 1) {
    const badge = await query("SELECT * FROM badges WHERE criteria = 'complete_first_lesson'");
    if (badge.rows[0] && await awardBadge(badge.rows[0].id)) badges.push(badge.rows[0]);
  }

  // Perfect Quiz
  if (quizScore === 100) {
    const badge = await query("SELECT * FROM badges WHERE criteria = 'perfect_quiz'");
    if (badge.rows[0] && await awardBadge(badge.rows[0].id)) badges.push(badge.rows[0]);
  }

  // Streak of 3
  if (parseInt(completedCount.rows[0].count) >= 3) {
    const badge = await query("SELECT * FROM badges WHERE criteria = 'streak_3'");
    if (badge.rows[0] && await awardBadge(badge.rows[0].id)) badges.push(badge.rows[0]);
  }

  // Level completion badges
  const checkLevel = async (levelId: number, criteria: string) => {
    const levelLessons = await query('SELECT COUNT(*) as count FROM lessons WHERE level_id = $1 AND is_published = true', [levelId]);
    const levelCompleted = await query(
      'SELECT COUNT(*) as count FROM user_progress up JOIN lessons l ON up.lesson_id = l.id WHERE l.level_id = $1 AND up.user_id = $2 AND up.completed = true',
      [levelId, userId]
    );
    if (parseInt(levelCompleted.rows[0].count) >= parseInt(levelLessons.rows[0].count) && parseInt(levelLessons.rows[0].count) > 0) {
      const badge = await query("SELECT * FROM badges WHERE criteria = $1", [criteria]);
      if (badge.rows[0] && await awardBadge(badge.rows[0].id)) badges.push(badge.rows[0]);
    }
  };
  await checkLevel(1, 'complete_level_1');
  await checkLevel(2, 'complete_level_2');
  await checkLevel(3, 'complete_level_3');

  // Lesson-specific badges
  const lessonBadges: Record<number, string> = {
    4: 'complete_lesson_4',
    6: 'complete_lesson_6',
    9: 'complete_lesson_9'
  };
  if (lessonBadges[lessonId]) {
    const badge = await query("SELECT * FROM badges WHERE criteria = $1", [lessonBadges[lessonId]]);
    if (badge.rows[0] && await awardBadge(badge.rows[0].id)) badges.push(badge.rows[0]);
  }

  // All lessons complete
  const totalLessons = await query('SELECT COUNT(*) as count FROM lessons WHERE is_published = true');
  if (parseInt(completedCount.rows[0].count) >= parseInt(totalLessons.rows[0].count) && parseInt(totalLessons.rows[0].count) > 0) {
    const badge = await query("SELECT * FROM badges WHERE criteria = 'complete_all'");
    if (badge.rows[0] && await awardBadge(badge.rows[0].id)) badges.push(badge.rows[0]);
  }

  return badges;
}

export default router;
