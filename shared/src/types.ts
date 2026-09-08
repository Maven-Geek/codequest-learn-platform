// ============================================================
// CodeQuest — Shared TypeScript Types
// ============================================================

// ---- User & Roles ----

export type UserRole = 'learner' | 'parent' | 'teacher' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  display_name: string;
  avatar_url: string;
  enrollment_key?: string;
  parent_id: number | null;
  teacher_id: number | null;
  created_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  display_name: string;
  avatar_url?: string;
  enrollment_key?: string;
  parent_id?: number;
  teacher_id?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ---- Levels & Lessons ----

export interface Level {
  id: number;
  title: string;
  order_index: number;
  description: string;
  icon_emoji: string;
  lesson_count?: number;
  completed_count?: number;
  is_unlocked?: boolean;
}

export type ActivityType = 'drag-drop' | 'puzzle' | 'pattern' | 'game';

export interface DragDropBlock {
  id: string;
  type: 'move' | 'turn-left' | 'turn-right' | 'repeat' | 'if-wall' | 'pick-up' | 'action' | 'step';
  label: string;
  color: string;
  icon?: string;
  repeatCount?: number;
}

export interface DragDropActivityData {
  instructions: string;
  availableBlocks: DragDropBlock[];
  correctSequence: string[]; // block ids in correct order
  gridSize?: { rows: number; cols: number };
  startPosition?: { row: number; col: number };
  endPosition?: { row: number; col: number };
  walls?: { row: number; col: number }[];
  collectibles?: { row: number; col: number }[];
  characterEmoji?: string;
  goalEmoji?: string;
}

export interface PuzzleItem {
  id: string;
  content: string;
  type?: string;
}

export interface PuzzleActivityData {
  instructions: string;
  items: PuzzleItem[];
  correctOrder: string[]; // item ids in correct order
  puzzleType: 'sequence' | 'pattern' | 'matching';
}

export interface GameActivityData {
  instructions: string;
  gameType: 'free-play' | 'challenge';
  availableBlocks: DragDropBlock[];
  gridSize: { rows: number; cols: number };
  startPosition: { row: number; col: number };
  objectives: string[];
}

export type ActivityData = DragDropActivityData | PuzzleActivityData | GameActivityData;

export interface Lesson {
  id: number;
  level_id: number;
  order_index: number;
  title: string;
  explanation: string;
  example: string;
  activity_type: ActivityType;
  activity_data: ActivityData;
  is_published: boolean;
}

// ---- Quizzes ----

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  options: QuizOption[];
  order_index: number;
}

export interface Quiz {
  id: number;
  lesson_id: number;
  passing_score: number;
  questions?: QuizQuestion[];
}

export interface QuizSubmission {
  quiz_id: number;
  answers: { question_id: number; selected_index: number }[];
}

export interface QuizResult {
  score: number;
  passed: boolean;
  points_earned: number;
  correct_count: number;
  total_count: number;
  badges_earned: Badge[];
}

// ---- Badges ----

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_emoji: string;
  criteria: string;
}

export interface EarnedBadge extends Badge {
  earned_at: string;
}

// ---- Progress ----

export interface UserProgress {
  id: number;
  user_id: number;
  lesson_id: number;
  completed: boolean;
  quiz_score: number | null;
  quiz_passed: boolean;
  points_earned: number;
  completed_at: string | null;
  lesson_title?: string;
  level_title?: string;
}

export interface ProgressSummary {
  total_lessons: number;
  completed_lessons: number;
  total_points: number;
  current_level: string;
  badges_earned: number;
  average_quiz_score: number;
  completion_percentage: number;
}

export interface ChildReport {
  user: User;
  summary: ProgressSummary;
  progress: UserProgress[];
  badges: EarnedBadge[];
  areas_needing_improvement: string[];
}

// ---- API Response Wrappers ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlatformStats {
  total_users: number;
  total_learners: number;
  total_parents: number;
  total_teachers: number;
  total_lessons: number;
  total_quizzes: number;
  average_completion: number;
  active_learners_today: number;
}
