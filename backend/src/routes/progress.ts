// ============================================================
// CodeQuest — Progress Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/progress — Get current user's progress
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const progress = db.prepare(`
      SELECT up.*, les.title as lesson_title, lev.title as level_title
      FROM user_progress up
      JOIN lessons les ON up.lesson_id = les.id
      JOIN levels lev ON les.level_id = lev.id
      WHERE up.user_id = ?
      ORDER BY les.level_id, les.order_index
    `).all(userId);

    res.json({ success: true, data: progress });
  } catch (error: any) {
    console.error('Get progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// GET /api/progress/summary — Get current user's progress summary
router.get('/summary', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const summary = buildProgressSummary(db, userId);

    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Get summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

// POST /api/progress/complete — Mark activity as complete (before quiz)
router.post('/complete', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;
    const { lesson_id } = req.body;

    if (!lesson_id) {
      res.status(400).json({ success: false, error: 'lesson_id required' });
      return;
    }

    // Create or update progress - mark activity as done but not fully complete until quiz passed
    const existing = db.prepare(
      'SELECT id FROM user_progress WHERE user_id = ? AND lesson_id = ?'
    ).get(userId, lesson_id) as any;

    if (!existing) {
      db.prepare(
        'INSERT INTO user_progress (user_id, lesson_id, completed, points_earned) VALUES (?, ?, 0, 5)'
      ).run(userId, lesson_id);
    }

    res.json({ success: true, data: { message: 'Activity progress saved' } });
  } catch (error: any) {
    console.error('Complete activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to save progress' });
  }
});

// GET /api/progress/report/:userId — Parent/Teacher: get child's report
router.get('/report/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const currentUser = req.user!;
    const targetUserId = parseInt(req.params.userId);

    // Check permissions: admin, or parent/teacher of the child
    if (currentUser.role !== 'admin') {
      const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
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

    const user = db.prepare(
      'SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE id = ?'
    ).get(targetUserId) as any;

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const summary = buildProgressSummary(db, targetUserId);

    const progress = db.prepare(`
      SELECT up.*, les.title as lesson_title, lev.title as level_title
      FROM user_progress up
      JOIN lessons les ON up.lesson_id = les.id
      JOIN levels lev ON les.level_id = lev.id
      WHERE up.user_id = ?
      ORDER BY les.level_id, les.order_index
    `).all(targetUserId);

    const badges = db.prepare(`
      SELECT b.*, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `).all(targetUserId);

    // Determine areas needing improvement
    const areas = findAreasNeedingImprovement(db, targetUserId);

    res.json({
      success: true,
      data: {
        user,
        summary,
        progress,
        badges,
        areas_needing_improvement: areas
      }
    });
  } catch (error: any) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
});

function buildProgressSummary(db: any, userId: number): any {
  const totalLessons = db.prepare('SELECT COUNT(*) as count FROM lessons WHERE is_published = 1').get() as any;
  const completedLessons = db.prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND completed = 1').get(userId) as any;
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points_earned), 0) as total FROM user_progress WHERE user_id = ?').get(userId) as any;
  const badgesEarned = db.prepare('SELECT COUNT(*) as count FROM user_badges WHERE user_id = ?').get(userId) as any;
  const avgScore = db.prepare('SELECT COALESCE(AVG(quiz_score), 0) as avg FROM user_progress WHERE user_id = ? AND quiz_score IS NOT NULL').get(userId) as any;

  // Find current level
  const currentProgress = db.prepare(`
    SELECT lev.title FROM user_progress up
    JOIN lessons les ON up.lesson_id = les.id
    JOIN levels lev ON les.level_id = lev.id
    WHERE up.user_id = ?
    ORDER BY les.level_id DESC, les.order_index DESC
    LIMIT 1
  `).get(userId) as any;

  return {
    total_lessons: totalLessons.count,
    completed_lessons: completedLessons.count,
    total_points: totalPoints.total,
    current_level: currentProgress?.title || 'Star Island',
    badges_earned: badgesEarned.count,
    average_quiz_score: Math.round(avgScore.avg),
    completion_percentage: totalLessons.count > 0 ? Math.round((completedLessons.count / totalLessons.count) * 100) : 0
  };
}

function findAreasNeedingImprovement(db: any, userId: number): string[] {
  const areas: string[] = [];

  // Find lessons with failed quizzes
  const failedQuizzes = db.prepare(`
    SELECT les.title, up.quiz_score
    FROM user_progress up
    JOIN lessons les ON up.lesson_id = les.id
    WHERE up.user_id = ? AND up.quiz_passed = 0 AND up.quiz_score IS NOT NULL
  `).all(userId) as any[];

  for (const fq of failedQuizzes) {
    areas.push(`Needs review: ${fq.title} (scored ${fq.quiz_score}%)`);
  }

  // Find levels not started
  const unstarted = db.prepare(`
    SELECT lev.title FROM levels lev
    WHERE NOT EXISTS (
      SELECT 1 FROM user_progress up
      JOIN lessons les ON up.lesson_id = les.id
      WHERE les.level_id = lev.id AND up.user_id = ?
    )
  `).all(userId) as any[];

  for (const u of unstarted) {
    areas.push(`Not started: ${u.title}`);
  }

  if (areas.length === 0) {
    areas.push('Great progress! Keep up the excellent work! 🌟');
  }

  return areas;
}

export default router;
