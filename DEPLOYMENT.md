# Deployment Guide

Frontend on **Vercel**, backend on **Render**, database on **MongoDB Atlas** — all
free tiers, all building straight from GitHub. Nothing needs to be built on your
machine.

Deploy the **backend first**: the frontend needs its URL, and the backend needs
the frontend's URL for CORS. That circular dependency is resolved in step 4.

---

## 1. MongoDB Atlas (database)

1. Create a free account at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Build a Database → M0 (free)**.
3. **Database Access → Add New Database User** — note the username and password.
4. **Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)**.
   Render's outbound IPs are not fixed on the free plan, so an allowlist will not work.
5. **Connect → Drivers → copy the connection string**, then replace `<password>`
   with the real password and add the database name:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ai-finance-tracker?retryWrites=true&w=majority
   ```

---

## 2. Backend on Render

1. Push this repository to GitHub (see the README).
2. At [render.com](https://render.com): **New → Blueprint**, select the repo.
   Render reads [`render.yaml`](render.yaml) and configures the service.
3. When prompted, fill in:

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | the Atlas string from step 1 |
   | `JWT_SECRET` | a long random string (see below) |
   | `FRONTEND_URL` | `http://localhost:5173` for now — corrected in step 4 |
   | `OPENAI_API_KEY` | your key, or leave blank for the heuristic engine |

   Generate a secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Deploy, then confirm `https://YOUR-API.onrender.com/health` returns
   `{"success":true,"status":"ok","database":"connected", ... }`.

> The free plan sleeps after ~15 minutes idle, so the first request after a
> pause takes 30–50 seconds. This is expected, not a bug.

---

## 3. Frontend on Vercel

1. At [vercel.com](https://vercel.com): **Add New → Project**, import the repo.
2. Set **Root Directory** to `client`. Vercel then picks up
   [`client/vercel.json`](client/vercel.json) — the Vite preset plus the SPA
   rewrite that keeps React Router working on a hard refresh.
3. Add one environment variable:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |

   The `/api` suffix is required — every request path is appended to it.

4. Deploy, and note the resulting URL.

---

## 4. Close the CORS loop

Back in Render, set `FRONTEND_URL` to the exact Vercel origin — no trailing
slash, no path:

```
https://ai-finance-tracker.vercel.app
```

Save and let the service redeploy. The backend rejects any origin not on its
whitelist, so a mismatch here is the single most common cause of a working
API that the deployed site cannot reach.

---

## 5. Verify

- [ ] `/health` responds with `"database":"connected"`
- [ ] Signup on the live site succeeds and lands on the dashboard
- [ ] Adding a transaction updates the dashboard charts
- [ ] The Insights page shows a provider badge and does not error
- [ ] Reports → **Export PDF** downloads a file
- [ ] A hard refresh on `/transactions` loads the page instead of a 404
      (this is what the SPA rewrite fixes)

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Not allowed by CORS` in the browser console | `FRONTEND_URL` does not match the site origin exactly | Copy the origin from the address bar, drop the trailing slash |
| Requests hit `localhost:5000` in production | `VITE_API_URL` missing at build time | Set it in Vercel, then **redeploy** — Vite inlines env vars at build, not runtime |
| 404 on refresh of a sub-route | SPA rewrite not applied | Confirm Root Directory is `client` so `vercel.json` is picked up |
| First request hangs ~40s | Render free tier cold start | Expected; upgrade the plan or accept it |
| `MongooseServerSelectionError` | Atlas network access not open | Allow `0.0.0.0/0` in Atlas Network Access |
| Insights always show the heuristic badge | No/placeholder `OPENAI_API_KEY` | Set a real key in Render, or leave it — the app is designed to work this way |
