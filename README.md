# Pulse — Customer Intelligence Frontend

Next.js frontend for Churn Risk and the Data Analyst module, both wired
to real backend endpoints, with Supabase auth gating the whole app.

## Deploying to Vercel

1. Push this folder to its own GitHub repo.
2. On vercel.com, import the repo.
3. Add environment variables before deploying:
   - `NEXT_PUBLIC_API_URL` — your Render backend URL
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` —
     Project Settings -> API in Supabase (the ANON key here, never the
     service role key — that one stays backend-only)
4. Deploy.

## Testing the auth flow first, before anything else

1. Visit the deployed URL — should redirect to `/login` since there's
   no session yet.
2. Sign up with a real email. Check Supabase's Authentication tab —
   the user should appear there.
3. Check the `organizations` and `organization_members` tables in
   Supabase's Table Editor — a row should exist in each, created by the
   signup trigger. If not, the trigger is the first thing to debug
   (see the backend README).
4. Sign in — should land on the main app, Customer Intelligence tab.
5. Try Churn Risk with a CSV, then Data Analyst with a CSV that has a
   date column and a numeric column (to exercise the forecast path).

## Local development

```
npm install
cp .env.local.example .env.local   # fill in your actual values
npm run dev
```
