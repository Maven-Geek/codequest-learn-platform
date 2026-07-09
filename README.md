# CodeQuest Learning Platform

CodeQuest is a comprehensive, interactive learning platform designed to teach coding through gamified lessons, puzzles, and challenges. The platform features tailored experiences for Students, Teachers, Parents, and Administrators.

## Project Structure

This project is structured as an npm monorepo (workspace) consisting of three main packages:

- **`frontend/`**: A React application built with Vite, TypeScript, and styled for a premium, interactive user experience. It contains various dashboards, a level map, and interactive coding/drag-and-drop puzzles.
- **`backend/`**: A Node.js/Express server handling authentication, user roles, lesson progression, quizzes, and badge achievements. It uses a SQLite database for local development.
- **`shared/`**: Shared TypeScript types and utilities used across both the frontend and backend to ensure end-to-end type safety.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (v7 or higher, which includes workspace support)

## Getting Started

### 1. Install Dependencies

From the root directory, install all dependencies for all workspaces at once:

```bash
npm install
```

### 2. Run the Application locally

You can start both the frontend and backend development servers concurrently with a single command from the root directory:

```bash
npm run dev
```

Alternatively, you can run them individually:

- **Backend only:** `npm run dev:backend`
- **Frontend only:** `npm run dev:frontend`

### 3. Access the Application

Once the development servers are running:
- **Frontend:** Typically accessible at `http://localhost:5173` (check your terminal output)
- **Backend API:** Check your backend configuration for the port (commonly `http://localhost:3000` or `http://localhost:5000`)

## Features

- **Role-Based Dashboards:** Separate experiences for Admins, Teachers, Parents, and Students.
- **Interactive Lessons:** Engage with coding puzzles and drag-and-drop activities.
- **Gamified Progression:** Navigate through a Level Map and earn badges as you progress.
- **Progress Tracking:** Teachers and Parents can monitor student progress.
- **Authentication:** Secure login and registration flows.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS (or Vanilla CSS)
- **Backend:** Node.js, Express, TypeScript, SQLite
- **Tooling:** npm workspaces, concurrently
