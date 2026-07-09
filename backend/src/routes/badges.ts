// ============================================================
// CodeQuest — Badge Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/badges — List all badges
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(`
      SELECT b.*, 
        CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as earned,
        ub.earned_at
      FROM badges b
      LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
      ORDER BY b.id
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Get badges error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

// GET /api/badges/earned — Get current user's earned badges
router.get('/earned', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(`
      SELECT b.*, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Get earned badges error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch earned badges' });
  }
});

export default router;
