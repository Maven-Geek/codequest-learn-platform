# Free Platforms for Live Deployment

For a project like this with a distinct frontend and a Node.js backend, you can completely host it for free using a combination of different platforms. Since you have a monorepo setup (both frontend and backend in one GitHub repository), these platforms will automatically pull your code from GitHub and deploy it.

Here are the best free platforms for each part of your stack:

## 1. Frontend Hosting (React / Vite)
These platforms are incredibly fast, have great free tiers, and integrate directly with GitHub so they automatically update whenever you push new code:
* **Vercel** (Highly Recommended): Created by the team behind Next.js. It's incredibly fast, easy to set up for Vite/React, and provides free SSL and a `.vercel.app` subdomain.
* **Netlify**: Very similar to Vercel and just as good for frontend apps. Great continuous deployment from GitHub.
* **GitHub Pages**: Free, but better suited for static sites. Vercel or Netlify are much better for React/Vite apps.

## 2. Backend Hosting (Node.js / Express)
Backend hosting requires a platform that can run a persistent server. The free tiers here usually "spin down" (go to sleep) after a period of inactivity, which means the first request after being idle might take a few seconds to wake up.
* **Render** (Highly Recommended): Excellent free tier for Node.js backends. Very easy to link to your GitHub repo and configure it to just run your `backend/` folder.
* **Railway**: A modern, extremely developer-friendly platform. It has a generous free tier (though it's based on a $5/month usage credit rather than being strictly "free forever").
* **Fly.io**: Gives you free virtual machines. Great performance, but the setup is a bit more technical (requires writing a Dockerfile or using their command-line tool).
* **Glitch**: Good for small experiments, but Render or Railway are better for full applications.

## 3. Database Hosting (If you are using one)
If your backend connects to a database, you'll need somewhere to host the data:
* **Supabase** or **Firebase**: Excellent free tiers if you want a complete Database-as-a-Service.
* **MongoDB Atlas**: The best choice if you are using MongoDB. Their free shared cluster (M0) is very generous and more than enough for learning/small projects.
* **Neon**: A great free serverless Postgres database if you are using SQL.

## My Recommendation for CodeQuest:
Since you are a solo developer looking for the easiest setup:
1. Deploy the **Frontend to Vercel**. (You just tell Vercel that the "Root Directory" is `frontend`).
2. Deploy the **Backend to Render**. (You tell Render the "Root Directory" is `backend`).
3. Deploy the **Database to MongoDB Atlas** (if you're using Mongo) or **Neon** (if you're using Postgres).
