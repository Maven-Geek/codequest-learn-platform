// ============================================================
// CodeQuest — Auth Routes (Register + Login)
// ============================================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database';
import { generateToken } from '../middleware/auth';
import type { RegisterRequest, LoginRequest, User } from '../../shared/src/types';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role, display_name, avatar_url, parent_id, teacher_id } = req.body as RegisterRequest;

    if (!username || !email || !password || !role || !display_name) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Check if username already exists
    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: 'Username already taken' });
      return;
    }

    const password_hash = bcrypt.hashSync(password, 10);

    const result = await query(
      'INSERT INTO users (username, email, password_hash, role, display_name, avatar_url, parent_id, teacher_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at',
      [username, email, password_hash, role, display_name, avatar_url || '🤖', parent_id || null, teacher_id || null]
    );

    const user = result.rows[0] as User;
    const token = generateToken({ userId: user.id, username: user.username, role: user.role });

    res.status(201).json({ success: true, data: { token, user } });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Username and password required' });
      return;
    }

    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0] as any;

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    const { password_hash, ...safeUser } = user;
    const token = generateToken({ userId: user.id, username: user.username, role: user.role });

    res.json({ success: true, data: { token, user: safeUser } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

export default router;
