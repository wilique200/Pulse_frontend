# Pulse — Customer Intelligence Frontend

Next.js frontend for the churn risk / sentiment analysis app. Calls the
FastAPI backend for real predictions — no mock data.

## Deploying to Vercel

1. Push this `frontend/` folder to its own GitHub repo (same process as the
   backend repo — create a new repo, upload these files).
2. Go to vercel.com, sign in with GitHub, click "Add New" -> "Project",
   and import this repo.
3. Before deploying, add an environment variable:
   `NEXT_PUBLIC_API_URL` = your Render backend URL
   (e.g. `https://your-app.onrender.com` — no trailing slash)
4. Deploy. Vercel auto-detects Next.js, no other config needed.

## Testing once both are live

1. Open the Vercel URL.
2. On the Churn Risk tab, upload `sample_customers.csv` (provided
   alongside this project).
3. You should see 6 customers analyzed, with CU-9001, CU-9004, and
   CU-9006 landing high-risk (short tenure + month-to-month, or high
   complaint volume) and CU-9002/CU-9005 landing low-risk (long tenure,
   two-year contracts, few complaints) — a good sanity check that the
   whole pipeline (frontend -> backend -> HF Hub models) is wired up
   correctly.
4. Try the Sentiment Analysis tab — it should show a real status message
   from the backend, not a static placeholder, even though full
   predictions aren't live yet.

## Local development (if you ever have a laptop handy)

```
npm install
cp .env.local.example .env.local   # then edit it with your Render URL
npm run dev
```
