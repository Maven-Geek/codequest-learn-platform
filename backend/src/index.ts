// ============================================================
// CodeQuest — Express Server Entry Point
// ============================================================

import express from 'express';
import cors from 'cors';
import { initializeDatabase, seedDatabase } from './database';

// Route imports
import authRoutes from './routes/auth';
import lessonRoutes from './routes/lessons';
import quizRoutes from './routes/quizzes';
import progressRoutes from './routes/progress';
import userRoutes from './routes/users';
import badgeRoutes from './routes/badges';

const app = express();
const PORT = process.env.PORT || 3001;

// Allowed frontend origins — local dev + production Vercel URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', lessonRoutes);
app.use('/api', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/badges', badgeRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'CodeQuest API', version: '1.0.0' });
});

// Initialize and start
async function start() {
  try {
    // Initialize database tables
    await initializeDatabase();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`\n🚀 CodeQuest API running at http://localhost:${PORT}`);
      console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
      console.log(`\n📋 Demo accounts:`);
      console.log(`   Admin:   admin / admin123`);
      console.log(`   Learner: coder_kid / learn123`);
      console.log(`   Parent:  parent1 / parent123`);
      console.log(`   Teacher: teacher1 / teach123\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
