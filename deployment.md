# CodeQuest — Deployment Guide (Vercel + Render + Supabase)

This guide walks you through deploying CodeQuest live on the internet using **free tiers** of three platforms:

| Service | What it hosts | Free tier |
|---------|--------------|-----------|
| **Vercel** | Frontend (React/Vite) | ✅ Free forever |
| **Render** | Backend (Node.js/Express) | ✅ Free (spins down after inactivity) |
| **Supabase** | Database (PostgreSQL) | ✅ Free (500 MB, 2 projects) |

---

## Prerequisites

Before you start, make sure:
- [x] Your code is pushed to a **GitHub repository**
- [x] You have accounts on [Vercel](https://vercel.com), [Render](https://render.com), and [Supabase](https://supabase.com)

---

## Step 1: Set Up Supabase (Database)

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `codequest`
   - **Database password**: Choose a strong password (save it!)
   - **Region**: Pick the closest to your users
4. Wait for the project to be created (~2 minutes)
5. Go to **Settings → Database**
6. Under **Connection string**, select **URI** and copy it
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.abcdef.supabase.co:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with the password you chose

> **💡 Tip:** Save this connection string somewhere safe — you'll need it for Render.

---

## Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +" → "Web Service"**
3. Connect your **GitHub repository** (`learn-platform`)
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `codequest-api` |
| **Region** | Same region as your Supabase project |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

5. Click **"Advanced"** and add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase connection string from Step 1 |
| `JWT_SECRET` | A strong random string (e.g., generate one at [randomkeygen.com](https://randomkeygen.com)) |
| `FRONTEND_URL` | Leave blank for now — you'll fill this in after Step 3 |

6. Click **"Create Web Service"**
7. Wait for the build to finish (~3-5 minutes)
8. Your backend URL will look like: `https://codequest-api.onrender.com`
9. Test it by visiting: `https://codequest-api.onrender.com/api/health`
   - You should see: `{"status":"ok","name":"CodeQuest API","version":"1.0.0"}`

> **⚠️ Note:** The first request after the service spins down (due to inactivity on the free tier) may take 30-60 seconds to respond. This is normal.

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..." → "Project"**
3. Import your **GitHub repository** (`learn-platform`)
4. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | `Vite` (should auto-detect) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

5. Add this **Environment Variable**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://codequest-api.onrender.com/api` (your Render URL + `/api`) |

6. Click **"Deploy"**
7. Wait for the build (~1-2 minutes)
8. Your frontend URL will look like: `https://learn-platform.vercel.app`

---

## Step 4: Connect Frontend URL Back to Render

Now that you have your Vercel URL, go back to Render and update the environment variable:

1. Go to your Render dashboard → `codequest-api` service
2. Click **"Environment"**
3. Set `FRONTEND_URL` to your Vercel URL (e.g., `https://learn-platform.vercel.app`)
4. Click **"Save Changes"** — the service will automatically redeploy

---

## Step 5: Test Everything

1. Visit your Vercel URL in a browser
2. Try logging in with a demo account:
   - **Admin:** `admin` / `admin123`
   - **Learner:** `coder_kid` / `learn123`
   - **Parent:** `parent1` / `parent123`
   - **Teacher:** `teacher1` / `teach123`
3. Navigate through lessons, take quizzes, check dashboards

---

## Post-Deployment Checklist

- [ ] Backend health check returns OK (`/api/health`)
- [ ] Frontend loads without console errors
- [ ] Login works with demo accounts
- [ ] Lessons load with interactive activities
- [ ] Quizzes can be submitted and scored
- [ ] Parent/Teacher dashboards show child progress
- [ ] Admin dashboard shows platform stats

---

## Environment Variables Summary

### Backend (Render)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing auth tokens |
| `FRONTEND_URL` | Your Vercel frontend URL (for CORS) |

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Your Render backend URL + `/api` |

---

## Troubleshooting

### "Failed to fetch" errors in the browser
- Check that `VITE_API_URL` on Vercel points to the correct Render URL
- Check that `FRONTEND_URL` on Render matches your Vercel URL exactly
- Open browser DevTools → Network tab to see the actual failing request

### Backend won't start on Render
- Check the Render logs for error messages
- Make sure `DATABASE_URL` is correct and includes your Supabase password
- Make sure the Root Directory is set to `backend`

### Database tables not created
- The backend automatically creates tables and seeds data on first start
- Check Render logs for "✅ Database tables created" and "✅ Database seeded"
- If you need to reset, go to Supabase → SQL Editor and run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`, then redeploy on Render

### Slow first load
- Render's free tier spins down after 15 minutes of inactivity
- The first request after spin-down takes ~30-60 seconds
- This is normal and expected on the free tier
