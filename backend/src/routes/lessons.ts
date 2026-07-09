// ============================================================
// CodeQuest — Lesson & Level Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/levels — List all levels with lesson counts and user progress
router.get('/levels', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const levels = db.prepare(`
      SELECT l.*,
        (SELECT COUNT(*) FROM lessons WHERE level_id = l.id AND is_published = 1) as lesson_count,
        (SELECT COUNT(*) FROM user_progress up
         JOIN lessons les ON up.lesson_id = les.id
         WHERE les.level_id = l.id AND up.user_id = ? AND up.completed = 1) as completed_count
      FROM levels l
      ORDER BY l.order_index
    `).all(userId);

    // Determine which levels are unlocked
    const levelsWithAccess = (levels as any[]).map((level, index) => {
      let is_unlocked = false;
      if (index === 0) {
        is_unlocked = true; // First level always unlocked
      } else {
        const prevLevel = levels[index - 1] as any;
        is_unlocked = prevLevel.completed_count >= prevLevel.lesson_count && prevLevel.lesson_count > 0;
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
router.get('/levels/:id/lessons', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const levelId = req.params.id;
    const userId = req.user!.userId;

    const lessons = db.prepare(`
      SELECT les.*,
        up.completed as is_completed,
        up.quiz_score,
        up.quiz_passed,
        up.points_earned
      FROM lessons les
      LEFT JOIN user_progress up ON up.lesson_id = les.id AND up.user_id = ?
      WHERE les.level_id = ? AND les.is_published = 1
      ORDER BY les.order_index
    `).all(userId, levelId);

    // Parse activity_data JSON
    const parsed = (lessons as any[]).map(l => ({
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
router.get('/lessons/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const lessonId = req.params.id;
    const userId = req.user!.userId;

    const lesson = db.prepare(`
      SELECT les.*,
        lev.title as level_title,
        up.completed as is_completed,
        up.quiz_score,
        up.quiz_passed,
        up.points_earned
      FROM lessons les
      JOIN levels lev ON les.level_id = lev.id
      LEFT JOIN user_progress up ON up.lesson_id = les.id AND up.user_id = ?
      WHERE les.id = ?
    `).get(userId, lessonId) as any;

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
router.post('/lessons', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { level_id, order_index, title, explanation, example, activity_type, activity_data, is_published } = req.body;

    if (!level_id || !title || !explanation || !activity_type) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(level_id, order_index || 0, title, explanation, example || '', activity_type, JSON.stringify(activity_data || {}), is_published !== false ? 1 : 0);

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Create lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lesson' });
  }
});

// PUT /api/lessons/:id — Admin: update lesson
router.put('/lessons/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const lessonId = req.params.id;
    const { level_id, order_index, title, explanation, example, activity_type, activity_data, is_published } = req.body;

    const existing = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    db.prepare(`
      UPDATE lessons SET
        level_id = COALESCE(?, level_id),
        order_index = COALESCE(?, order_index),
        title = COALESCE(?, title),
        explanation = COALESCE(?, explanation),
        example = COALESCE(?, example),
        activity_type = COALESCE(?, activity_type),
        activity_data = COALESCE(?, activity_data),
        is_published = COALESCE(?, is_published)
      WHERE id = ?
    `).run(
      level_id, order_index, title, explanation, example, activity_type,
      activity_data ? JSON.stringify(activity_data) : null,
      is_published !== undefined ? (is_published ? 1 : 0) : null,
      lessonId
    );

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);

    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Update lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lesson' });
  }
});

// DELETE /api/lessons/:id — Admin: delete lesson
router.delete('/lessons/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const lessonId = req.params.id;

    const existing = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    db.prepare('DELETE FROM lessons WHERE id = ?').run(lessonId);

    res.json({ success: true, data: { message: 'Lesson deleted' } });
  } catch (error: any) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lesson' });
  }
});

// GET /api/lessons-all — Admin: get all lessons including unpublished
router.get('/lessons-all', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const lessons = db.prepare(`
      SELECT les.*, lev.title as level_title
      FROM lessons les
      JOIN levels lev ON les.level_id = lev.id
      ORDER BY lev.order_index, les.order_index
    `).all();

    const parsed = (lessons as any[]).map(l => ({
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
