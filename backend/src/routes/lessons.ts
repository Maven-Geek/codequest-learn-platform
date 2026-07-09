// ============================================================
// CodeQuest — Lesson & Level Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/levels — List all levels with lesson counts and user progress
router.get('/levels', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(`
      SELECT l.*,
        (SELECT COUNT(*) FROM lessons WHERE level_id = l.id AND is_published = true) as lesson_count,
        (SELECT COUNT(*) FROM user_progress up
         JOIN lessons les ON up.lesson_id = les.id
         WHERE les.level_id = l.id AND up.user_id = $1 AND up.completed = true) as completed_count
      FROM levels l
      ORDER BY l.order_index
    `, [userId]);

    // Determine which levels are unlocked
    const levels = result.rows;
    const levelsWithAccess = levels.map((level: any, index: number) => {
      let is_unlocked = false;
      if (index === 0) {
        is_unlocked = true; // First level always unlocked
      } else {
        const prevLevel = levels[index - 1] as any;
        is_unlocked = parseInt(prevLevel.completed_count) >= parseInt(prevLevel.lesson_count) && parseInt(prevLevel.lesson_count) > 0;
      }
      return { ...level, is_unlocked };
    });

    res.json({ success: true, data: levelsWithAccess });
  } catch (error: any) {
    console.error('Get levels error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch levels' });
  }
});

// GET /api/levels/:id/lessons — Get lessons in a level
router.get('/levels/:id/lessons', authMiddleware, async (req: Request, res: Response) => {
  try {
    const levelId = req.params.id;
    const userId = req.user!.userId;

    const result = await query(`
      SELECT les.*,
        up.completed as is_completed,
        up.quiz_score,
        up.quiz_passed,
        up.points_earned
      FROM lessons les
      LEFT JOIN user_progress up ON up.lesson_id = les.id AND up.user_id = $1
      WHERE les.level_id = $2 AND les.is_published = true
      ORDER BY les.order_index
    `, [userId, levelId]);

    // Parse activity_data JSON
    const parsed = result.rows.map((l: any) => ({
      ...l,
      activity_data: JSON.parse(l.activity_data || '{}'),
      is_completed: !!l.is_completed
    }));

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Get lessons error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lessons' });
  }
});

// GET /api/lessons/:id — Get single lesson detail
router.get('/lessons/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user!.userId;

    const result = await query(`
      SELECT les.*,
        lev.title as level_title,
        up.completed as is_completed,
        up.quiz_score,
        up.quiz_passed,
        up.points_earned
      FROM lessons les
      JOIN levels lev ON les.level_id = lev.id
      LEFT JOIN user_progress up ON up.lesson_id = les.id AND up.user_id = $1
      WHERE les.id = $2
    `, [userId, lessonId]);

    const lesson = result.rows[0] as any;

    if (!lesson) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    lesson.activity_data = JSON.parse(lesson.activity_data || '{}');
    lesson.is_completed = !!lesson.is_completed;

    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Get lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lesson' });
  }
});

// POST /api/lessons — Admin: create lesson
router.post('/lessons', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { level_id, order_index, title, explanation, example, activity_type, activity_data, is_published } = req.body;

    if (!level_id || !title || !explanation || !activity_type) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const result = await query(
      'INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data, is_published) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [level_id, order_index || 0, title, explanation, example || '', activity_type, JSON.stringify(activity_data || {}), is_published !== false]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Create lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lesson' });
  }
});

// PUT /api/lessons/:id — Admin: update lesson
router.put('/lessons/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    const { level_id, order_index, title, explanation, example, activity_type, activity_data, is_published } = req.body;

    const existing = await query('SELECT id FROM lessons WHERE id = $1', [lessonId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    await query(`
      UPDATE lessons SET
        level_id = COALESCE($1, level_id),
        order_index = COALESCE($2, order_index),
        title = COALESCE($3, title),
        explanation = COALESCE($4, explanation),
        example = COALESCE($5, example),
        activity_type = COALESCE($6, activity_type),
        activity_data = COALESCE($7, activity_data),
        is_published = COALESCE($8, is_published)
      WHERE id = $9
    `, [
      level_id, order_index, title, explanation, example, activity_type,
      activity_data ? JSON.stringify(activity_data) : null,
      is_published !== undefined ? is_published : null,
      lessonId
    ]);

    const updated = await query('SELECT * FROM lessons WHERE id = $1', [lessonId]);

    res.json({ success: true, data: updated.rows[0] });
  } catch (error: any) {
    console.error('Update lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lesson' });
  }
});

// DELETE /api/lessons/:id — Admin: delete lesson
router.delete('/lessons/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;

    const existing = await query('SELECT id FROM lessons WHERE id = $1', [lessonId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    await query('DELETE FROM lessons WHERE id = $1', [lessonId]);

    res.json({ success: true, data: { message: 'Lesson deleted' } });
  } catch (error: any) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lesson' });
  }
});

// GET /api/lessons-all — Admin: get all lessons including unpublished
router.get('/lessons-all', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT les.*, lev.title as level_title
      FROM lessons les
      JOIN levels lev ON les.level_id = lev.id
      ORDER BY lev.order_index, les.order_index
    `);

    const parsed = result.rows.map((l: any) => ({
      ...l,
      activity_data: JSON.parse(l.activity_data || '{}')
    }));

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Get all lessons error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lessons' });
  }
});

export default router;
