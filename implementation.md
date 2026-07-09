# CodeQuest Platform Implementation

## Overview
CodeQuest is an interactive, gamified, full-stack educational platform designed to teach children programming concepts without requiring syntax typing. It provides a drag-and-drop block interface to build sequences, solve puzzles, and play games to learn logic, sequencing, patterns, and problem-solving.

## Architecture & Technology Stack
- **Monorepo Structure**: Uses NPM workspaces to manage shared types, the backend server, and the frontend app.
- **Shared Types**: TypeScript interfaces defining the API contracts, shared between backend and frontend for type safety.
- **Backend (Express + SQLite)**:
  - Framework: Express.js
  - Database: SQLite (via `better-sqlite3`) for file-based zero-configuration persistence.
  - Authentication: JWT-based stateless authentication with Role-Based Access Control (RBAC).
  - API Routes: Auth, Users, Levels, Lessons, Quizzes, Progress, Badges.
- **Frontend (React + Vite)**:
  - Framework: React 18 with TypeScript, managed via Vite.
  - Routing: React Router v6 for role-based protected routes.
  - State Management: React Context API (`AuthContext`) for authentication state.
  - Styling: Pure vanilla CSS with CSS variables, responsive design, glassmorphism UI elements, and keyframe micro-animations for a playful, dynamic aesthetic.

## Features Implemented
### 1. Authentication & RBAC
- Users can register and log in as Learner, Parent, Teacher, or Admin.
- Avatars are selectable from a predefined list of emojis.
- Protected routing limits access to pages based on user roles.

### 2. Learner Experience
- **Animated Homepage**: Features a playful hero section, floating animated blocks, and detailed explanations of concepts.
- **Level Map**: Visual, gamified map showing progression. Users unlock levels and lessons sequentially.
- **Interactive Lessons**: Tabbed interface for learning concepts, completing interactive activities, and taking quizzes.
  - **Drag-and-Drop Activities**: Interactive grid-based game where learners drag blocks (e.g., move, turn) to guide a character to a goal.
  - **Puzzles & Sequencing**: Drag-and-drop ordering activities for logic and pattern recognition.
- **Quizzes**: Instant-feedback multiple-choice questions with progress tracking.
- **Celebrations**: Confetti animations and gamified score screens (Badges and Points) shown on completing levels or quizzes.
- **Profile Dashboard**: Activity history, progress bars, total score, and a badge collection view.

### 3. Parent Dashboard
- View linked learner accounts.
- Monitor progress metrics (lessons completed, quiz scores, total points, earned badges).
- See granular progress history and specific areas for improvement.

### 4. Teacher Dashboard
- Overview of all assigned students.
- Track class progress and individual student reports.
- View detailed statuses (in progress vs. completed) for each lesson.

### 5. Admin Dashboard
- **Platform Analytics**: Total users, active learners, average completion rates, etc.
- **Lesson Manager**: CRUD operations for levels, lessons, activities, and quizzes. Manage content natively through a graphical interface.
- **User Manager**: Add, edit, or remove users. Assign learners to parents and teachers to build classroom/family hierarchies.

## Database Schema Highlights
- `Users`: Stores credentials, roles, and parent/teacher relationships.
- `Levels` & `Lessons`: Defines the learning path. Lessons store `activity_type` and JSON `activity_data`.
- `Quizzes` & `Questions`: Evaluation content linked to specific lessons.
- `Progress`: Tracks user completion per lesson, quiz scores, and timestamps.
- `Badges`: Predefined achievements that can be earned based on accumulated progress.

## Next Steps / Verification
- Wait for `npm install` to finish across the workspace.
- Start the server (`npm run dev:backend`) and populate the SQLite database with the seed script automatically run by the server initialization.
- Start the frontend (`npm run dev:frontend`).
- Test the full authentication flow, interact with the gamified level map, complete a lesson activity and quiz, and view dashboards across different roles.
