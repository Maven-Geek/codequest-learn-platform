// ============================================================
// CodeQuest — Progress Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/progress — Get current user's progress
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(`
      SELECT up.*, les.title as lesson_title, lev.title as level_title
      FROM user_progress up
      JOIN lessons les ON up.lesson_id = les.id
      JOIN levels lev ON les.level_id = lev.id
      WHERE up.user_id = $1
      ORDER BY les.level_id, les.order_index
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Get progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// GET /api/progress/summary — Get current user's progress summary
router.get('/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const summary = await buildProgressSummary(userId);

    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Get summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

// POST /api/progress/complete — Mark activity as complete (learners only)
router.post('/complete', authMiddleware, requireRole('learner'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { lesson_id } = req.body;

    if (!lesson_id) {
      res.status(400).json({ success: false, error: 'lesson_id required' });
      return;
    }

    // Create or update progress - mark activity as done but not fully complete until quiz passed
    const existing = await query(
      'SELECT id FROM user_progress WHERE user_id = $1 AND lesson_id = $2',
      [userId, lesson_id]
    );

    if (existing.rows.length === 0) {
      await query(
        'INSERT INTO user_progress (user_id, lesson_id, completed, points_earned) VALUES ($1, $2, false, 5)',
        [userId, lesson_id]
      );
    }

    res.json({ success: true, data: { message: 'Activity progress saved' } });
  } catch (error: any) {
    console.error('Complete activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to save progress' });
  }
});

// GET /api/progress/report/:userId — Parent/Teacher: get child's report
router.get('/report/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const targetUserId = parseInt(req.params.userId as string);

    // Check permissions: admin, or parent/teacher of the child
    if (currentUser.role !== 'admin') {
      const targetResult = await query('SELECT * FROM users WHERE id = $1', [targetUserId]);
      const targetUser = targetResult.rows[0] as any;
      if (!targetUser) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const isParent = currentUser.role === 'parent' && targetUser.parent_id === currentUser.userId;
      const isTeacher = currentUser.role === 'teacher' && targetUser.teacher_id === currentUser.userId;

      if (!isParent && !isTeacher) {
        res.status(403).json({ success: false, error: 'Not authorized to view this report' });
        return;
      }
    }

    const userResult = await query(
      'SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE id = $1',
      [targetUserId]
    );
    const user = userResult.rows[0];

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const summary = await buildProgressSummary(targetUserId);

    const progressResult = await query(`
      SELECT up.*, les.title as lesson_title, lev.title as level_title
      FROM user_progress up
      JOIN lessons les ON up.lesson_id = les.id
      JOIN levels lev ON les.level_id = lev.id
      WHERE up.user_id = $1
      ORDER BY les.level_id, les.order_index
    `, [targetUserId]);

    const badgesResult = await query(`
      SELECT b.*, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `, [targetUserId]);

    // Determine areas needing improvement
    const areas = await findAreasNeedingImprovement(targetUserId);

    res.json({
      success: true,
      data: {
        user,
        summary,
        progress: progressResult.rows,
        badges: badgesResult.rows,
        areas_needing_improvement: areas
      }
    });
  } catch (error: any) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
});

async function buildProgressSummary(userId: number): Promise<any> {
  const totalLessons = await query('SELECT COUNT(*) as count FROM lessons WHERE is_published = true');
  const completedLessons = await query('SELECT COUNT(*) as count FROM user_progress WHERE user_id = $1 AND completed = true', [userId]);
  const totalPoints = await query('SELECT COALESCE(SUM(points_earned), 0) as total FROM user_progress WHERE user_id = $1', [userId]);
  const badgesEarned = await query('SELECT COUNT(*) as count FROM user_badges WHERE user_id = $1', [userId]);
  const avgScore = await query('SELECT COALESCE(AVG(quiz_score), 0) as avg FROM user_progress WHERE user_id = $1 AND quiz_score IS NOT NULL', [userId]);

  // Find current level
  const currentProgress = await query(`
    SELECT lev.title FROM user_progress up
    JOIN lessons les ON up.lesson_id = les.id
    JOIN levels lev ON les.level_id = lev.id
    WHERE up.user_id = $1
    ORDER BY les.level_id DESC, les.order_index DESC
    LIMIT 1
  `, [userId]);

  const total = parseInt(totalLessons.rows[0].count);
  const completed = parseInt(completedLessons.rows[0].count);

  return {
    total_lessons: total,
    completed_lessons: completed,
    total_points: parseInt(totalPoints.rows[0].total),
    current_level: currentProgress.rows[0]?.title || 'Star Island',
    badges_earned: parseInt(badgesEarned.rows[0].count),
    average_quiz_score: Math.round(parseFloat(avgScore.rows[0].avg)),
    completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

async function findAreasNeedingImprovement(userId: number): Promise<string[]> {
  const areas: string[] = [];

  // Find lessons with failed quizzes
  const failedQuizzes = await query(`
    SELECT les.title, up.quiz_score
    FROM user_progress up
    JOIN lessons les ON up.lesson_id = les.id
    WHERE up.user_id = $1 AND up.quiz_passed = false AND up.quiz_score IS NOT NULL
  `, [userId]);

  for (const fq of failedQuizzes.rows as any[]) {
    areas.push(`Needs review: ${fq.title} (scored ${fq.quiz_score}%)`);
  }

  // Find levels not started
  const unstarted = await query(`
    SELECT lev.title FROM levels lev
    WHERE NOT EXISTS (
      SELECT 1 FROM user_progress up
      JOIN lessons les ON up.lesson_id = les.id
      WHERE les.level_id = lev.id AND up.user_id = $1
    )
  `, [userId]);

  for (const u of unstarted.rows as any[]) {
    areas.push(`Not started: ${u.title}`);
  }

  if (areas.length === 0) {
    areas.push('Great progress! Keep up the excellent work! 🌟');
  }

  return areas;
}

export default router;
