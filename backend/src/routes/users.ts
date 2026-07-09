// ============================================================
// CodeQuest — User Management Routes
// ============================================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/users — Admin: list all users
router.get('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const users = db.prepare(
      'SELECT id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at FROM users ORDER BY created_at DESC'
    ).all();

    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/users/children — Parent/Teacher: get linked children/students
router.get('/children', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;
    const role = req.user!.role;

    let children;
    if (role === 'parent') {
      children = db.prepare(
        'SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE parent_id = ?'
      ).all(userId);
    } else if (role === 'teacher') {
      children = db.prepare(
        'SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE teacher_id = ?'
      ).all(userId);
    } else if (role === 'admin') {
      children = db.prepare(
        'SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE role = ?'
      ).all('learner');
    } else {
      children = [];
    }

    res.json({ success: true, data: children });
  } catch (error: any) {
    console.error('Get children error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch children' });
  }
});

// GET /api/users/me — Get current user
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at FROM users WHERE id = ?'
    ).get(req.user!.userId);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id — Admin: update user
router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.params.id;
    const { email, role, display_name, avatar_url, parent_id, teacher_id, password } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (password) {
      const password_hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, userId);
    }

    db.prepare(`
      UPDATE users SET
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        display_name = COALESCE(?, display_name),
        avatar_url = COALESCE(?, avatar_url),
        parent_id = ?,
        teacher_id = ?
      WHERE id = ?
    `).run(email, role, display_name, avatar_url, parent_id || null, teacher_id || null, userId);

    const updated = db.prepare(
      'SELECT id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at FROM users WHERE id = ?'
    ).get(userId);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id — Admin: delete user
router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.params.id;

    // Prevent deleting self
    if (parseInt(userId) === req.user!.userId) {
      res.status(400).json({ success: false, error: 'Cannot delete your own account' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// GET /api/users/stats — Admin: get platform stats
router.get('/stats', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const totalLearners = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'learner'").get() as any;
    const totalParents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'parent'").get() as any;
    const totalTeachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'").get() as any;
    const totalLessons = db.prepare('SELECT COUNT(*) as count FROM lessons WHERE is_published = 1').get() as any;
    const totalQuizzes = db.prepare('SELECT COUNT(*) as count FROM quizzes').get() as any;
    const avgCompletion = db.prepare(`
      SELECT COALESCE(AVG(completion_pct), 0) as avg FROM (
        SELECT u.id, 
          CAST(COUNT(CASE WHEN up.completed = 1 THEN 1 END) AS FLOAT) / 
          NULLIF((SELECT COUNT(*) FROM lessons WHERE is_published = 1), 0) * 100 as completion_pct
        FROM users u
        LEFT JOIN user_progress up ON u.id = up.user_id
        WHERE u.role = 'learner'
        GROUP BY u.id
      )
    `).get() as any;

    res.json({
      success: true,
      data: {
        total_users: totalUsers.count,
        total_learners: totalLearners.count,
        total_parents: totalParents.count,
        total_teachers: totalTeachers.count,
        total_lessons: totalLessons.count,
        total_quizzes: totalQuizzes.count,
        average_completion: Math.round(avgCompletion.avg),
        active_learners_today: totalLearners.count // Simplified for prototype
      }
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
