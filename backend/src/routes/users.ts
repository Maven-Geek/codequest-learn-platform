// ============================================================
// CodeQuest — User Management Routes
// ============================================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/users — Admin: list all users
router.get('/', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/users/children — Parent/Teacher: get linked children/students
router.get('/children', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    let result;
    if (role === 'parent') {
      result = await query(
        'SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE parent_id = $1',
        [userId]
      );
    } else if (role === 'teacher') {
      result = await query(
        'SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE teacher_id = $1',
        [userId]
      );
    } else if (role === 'admin') {
      result = await query(
        "SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE role = 'learner'"
      );
    } else {
      result = { rows: [] };
    }

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Get children error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch children' });
  }
});

// GET /api/users/me — Get current user
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id — Admin: update user
router.put('/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { email, role, display_name, avatar_url, parent_id, teacher_id, password } = req.body;

    const existing = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (password) {
      const password_hash = bcrypt.hashSync(password, 10);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, userId]);
    }

    await query(`
      UPDATE users SET
        email = COALESCE($1, email),
        role = COALESCE($2, role),
        display_name = COALESCE($3, display_name),
        avatar_url = COALESCE($4, avatar_url),
        parent_id = $5,
        teacher_id = $6
      WHERE id = $7
    `, [email, role, display_name, avatar_url, parent_id || null, teacher_id || null, userId]);

    const updated = await query(
      'SELECT id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at FROM users WHERE id = $1',
      [userId]
    );

    res.json({ success: true, data: updated.rows[0] });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id — Admin: delete user
router.delete('/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Prevent deleting self
    if (parseInt(userId as string) === req.user!.userId) {
      res.status(400).json({ success: false, error: 'Cannot delete your own account' });
      return;
    }

    const existing = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// GET /api/users/stats — Admin: get platform stats
router.get('/stats', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const totalUsers = await query('SELECT COUNT(*) as count FROM users');
    const totalLearners = await query("SELECT COUNT(*) as count FROM users WHERE role = 'learner'");
    const totalParents = await query("SELECT COUNT(*) as count FROM users WHERE role = 'parent'");
    const totalTeachers = await query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'");
    const totalLessons = await query('SELECT COUNT(*) as count FROM lessons WHERE is_published = true');
    const totalQuizzes = await query('SELECT COUNT(*) as count FROM quizzes');
    const avgCompletion = await query(`
      SELECT COALESCE(AVG(completion_pct), 0) as avg FROM (
        SELECT u.id, 
          CAST(COUNT(CASE WHEN up.completed = true THEN 1 END) AS FLOAT) / 
          NULLIF((SELECT COUNT(*) FROM lessons WHERE is_published = true), 0) * 100 as completion_pct
        FROM users u
        LEFT JOIN user_progress up ON u.id = up.user_id
        WHERE u.role = 'learner'
        GROUP BY u.id
      ) sub
    `);

    res.json({
      success: true,
      data: {
        total_users: parseInt(totalUsers.rows[0].count),
        total_learners: parseInt(totalLearners.rows[0].count),
        total_parents: parseInt(totalParents.rows[0].count),
        total_teachers: parseInt(totalTeachers.rows[0].count),
        total_lessons: parseInt(totalLessons.rows[0].count),
        total_quizzes: parseInt(totalQuizzes.rows[0].count),
        average_completion: Math.round(parseFloat(avgCompletion.rows[0].avg)),
        active_learners_today: parseInt(totalLearners.rows[0].count) // Simplified for prototype
      }
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
