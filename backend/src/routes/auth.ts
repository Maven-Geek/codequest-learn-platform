import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, generateEnrollmentKey } from '../database';
import { generateToken } from '../middleware/auth';
import type { RegisterRequest, LoginRequest, User } from '../../shared/src/types';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role, display_name, avatar_url, enrollment_key } = req.body as RegisterRequest & { enrollment_key?: string };

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

    // ---- Parent registration: require enrollment key ----
    if (role === 'parent') {
      if (!enrollment_key || enrollment_key.trim().length < 6) {
        res.status(400).json({ success: false, error: 'A valid enrollment key (at least 6 characters) is required to register as a parent' });
        return;
      }

      // Look up the learner with this enrollment key
      const learnerResult = await query(
        `SELECT id, parent_id, display_name FROM users WHERE enrollment_key = $1 AND role = 'learner'`,
        [enrollment_key.trim().toUpperCase()]
      );

      if (learnerResult.rows.length === 0) {
        res.status(400).json({ success: false, error: 'Invalid enrollment key. Please check the key and try again.' });
        return;
      }

      const learner = learnerResult.rows[0];

      // Block if learner already has a parent linked
      if (learner.parent_id) {
        res.status(400).json({ success: false, error: `This learner (${learner.display_name}) already has a parent linked. Please contact an administrator.` });
        return;
      }

      // Create the parent user
      const result = await query(
        'INSERT INTO users (username, email, password_hash, role, display_name, avatar_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at',
        [username, email, password_hash, role, display_name, avatar_url || '👨‍👩‍👧']
      );

      const user = result.rows[0] as User;

      // Auto-link: set the learner's parent_id to this new parent
      await query('UPDATE users SET parent_id = $1 WHERE id = $2', [user.id, learner.id]);

      const token = generateToken({ userId: user.id, username: user.username, role: user.role });
      res.status(201).json({ success: true, data: { token, user } });
      return;
    }

    // ---- Learner registration: auto-generate enrollment key ----
    if (role === 'learner') {
      let key = generateEnrollmentKey();
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const dup = await query('SELECT id FROM users WHERE enrollment_key = $1', [key]);
        if (dup.rows.length === 0) break;
        key = generateEnrollmentKey();
        attempts++;
      }

      const result = await query(
        'INSERT INTO users (username, email, password_hash, role, display_name, avatar_url, enrollment_key) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, email, role, display_name, avatar_url, enrollment_key, parent_id, teacher_id, created_at',
        [username, email, password_hash, role, display_name, avatar_url || '🤖', key]
      );

      const user = result.rows[0] as User;
      const token = generateToken({ userId: user.id, username: user.username, role: user.role });
      res.status(201).json({ success: true, data: { token, user } });
      return;
    }

    // ---- Teacher / Admin registration: no enrollment key ----
    const result = await query(
      'INSERT INTO users (username, email, password_hash, role, display_name, avatar_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, display_name, avatar_url, parent_id, teacher_id, created_at',
      [username, email, password_hash, role, display_name, avatar_url || '🤖']
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
