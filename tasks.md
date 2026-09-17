# CodeQuest — Build Tasks

## Phase 1: Project Setup
- [x] Root package.json with npm workspaces
- [x] Shared types library (types.ts)

## Phase 2: Backend
- [x] Backend package.json + tsconfig
- [x] Database setup + seed data (database.ts)
- [x] Auth middleware (JWT + RBAC)
- [x] Auth routes (register, login)
- [x] Lesson & Level routes (CRUD)
- [x] Quiz routes (fetch + submit + scoring)
- [x] Progress routes (track + report)
- [x] User management routes
- [x] Badge routes
- [x] Server entry point (index.ts)

## Phase 3: Frontend — Foundation
- [x] Frontend package.json + vite config + index.html
- [x] Design system (index.css)
- [x] API client + Auth context
- [x] App.tsx with router
- [x] Navbar component

## Phase 4: Frontend — Learner Pages
- [x] HomePage
- [x] LoginPage + RegisterPage
- [x] LevelMapPage + LevelMap component
- [x] LessonPage (explanation + activity + quiz flow)
- [x] DragDropActivity component
- [x] CodingPuzzle component
- [x] QuizPlayer component
- [x] CharacterCanvas component (integrated into DragDropActivity)
- [x] BadgeDisplay + ProgressBar components (integrated)
- [x] ProfilePage

## Phase 5: Frontend — Dashboard Pages
- [x] ParentDashboard
- [x] TeacherDashboard
- [x] AdminDashboard
- [x] LessonManager (CRUD)
- [x] UserManager

## Phase 6: Verification
- [x] Backend starts and seeds correctly
- [x] Frontend starts and renders
- [x] End-to-end user flows verified

## Phase 7: Multi-Language Coding Lab (Python, JavaScript, Java)
- [x] Shared Types for Coding, Languages, Snippets, Challenges, Golf (`shared/src/types.ts`)
- [x] Database Schema Migrations for Coding Levels, Preferences, Streaks (`backend/src/database.ts`)
- [x] Levels 5, 6, 7 Seeding with 27 multi-language lessons across Python, JavaScript, Java (`backend/src/codingSeed.ts`)
- [x] Language preference persistence in DB (`users.preferred_coding_language`)
- [x] Unlocked coding levels (no prerequisite required) integrated into existing Level Map
- [x] Real-time code execution with Pyodide WebAssembly for Python & live eval for JavaScript (Rec #3)
- [x] Syntax-highlighted Code Editor with line numbers, auto-indent, auto-closing brackets (`frontend/src/components/CodeEditor.tsx`)
- [x] 3-Card & Compact Language Selector component (`frontend/src/components/LanguageSelector.tsx`)
- [x] Coding Activity orchestrator with mission briefs, progressive hints, and testing (`frontend/src/components/CodingActivity.tsx`)
- [x] Free-form Code Playground & Sandbox page with templates & export (`frontend/src/pages/PlaygroundPage.tsx` - Rec #1)
- [x] Side-by-side 3-Language Code Comparison view (`frontend/src/components/CodeComparison.tsx` - Rec #2)
- [x] Collectible Code Snippet Library & Spell Book (`frontend/src/components/SnippetLibrary.tsx` - Rec #4)
- [x] Daily Quests & Coding Challenges (`frontend/src/pages/ChallengesPage.tsx` - Rec #5)
- [x] Code Golf character counter, timer, and live leaderboard (Rec #6)
- [x] Language Mastery Badges: Bronze, Silver, Gold for Python, JS, Java + Streaker + Golfer (Rec #7)
- [x] Daily Coding Streak tracking system with fire 🔥 counter (Rec #8)
- [x] Error Debugging lessons with intentional bugs to find and fix (Rec #9)
- [x] Mini-Projects including Smart Calculator and Score Calculator (Rec #10)
- [x] Pseudo-code to Real Code translation lessons (Rec #11)
- [x] Comment & Documentation lessons (Python docstrings, JSDoc, Javadoc) (Rec #12)
- [x] Full TypeScript and production Vite bundling verified

