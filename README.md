# AI-Powered Personal Finance Tracker

A full-stack MERN application that turns raw income and expense entries into
categorised insights, budgets with live progress tracking, AI-generated
recommendations, a spending forecast, and downloadable PDF reports.

**Live demo:** https://ai-finance-tracker-sable-gamma.vercel.app
**API health check:** https://ai-finance-tracker-api-5flo.onrender.com/health

> The API runs on a free tier that sleeps after ~15 minutes of inactivity, so the
> first request after a pause can take 30–50 seconds. Subsequent requests are fast.

---

## Problem Statement

Every month, millions of people open their banking app, scroll a long list of
debits and credits, and still have no idea where their money actually went.
Personal finance tooling is fragmented and mostly backward-looking:

- **No idea where money goes.** You can see the balance drop, but not how much
  went to food, rent, transport, or entertainment.
- **Overspending goes undetected.** Without category-level limits, you find out
  you overspent *after* the month ends — too late to correct.
- **Budgeting feels manual.** Spreadsheets get abandoned after a few weeks.
- **No personalised advice.** A finance blog cannot tell you that food is 38% of
  your spending, or that your discretionary categories are creeping up.
- **Reports are buried in statements.** Statements show transactions, not trends.
- **No forecast.** "Based on how I've been spending, will I break my budget?" is
  a question no banking app answers.

This project answers all six from data the user already has.

---

## What It Does

| Problem | Solution in this app |
|---|---|
| Don't know where money goes | Categorised transactions with charts and a ranked breakdown |
| Overspending goes undetected | Monthly **and** per-category budgets with progress bars and overspend alerts |
| Budgeting feels manual | One-form CRUD with filters, search, sorting, and pagination |
| No personalised advice | Insights generated from the user's own transactions |
| Reports are buried | Monthly report page with server-generated PDF export |
| No spending forecast | Average-based prediction with a confidence score and budget-risk flag |

Feature detail:

- **Authentication** — JWT + bcrypt, with profile editing, password change, and
  account statistics.
- **Transactions** — income/expense entries with category, payment method, date
  and notes; filter by type and category, regex search across title/category/
  description, four sort modes, and paginated results.
- **Budgets** — one budget document per user holding a monthly ceiling and an
  array of category limits, rendered as live progress bars against the current
  month's spending.
- **Dashboard** — four summary tiles, a monthly income-vs-expense trend line, a
  category distribution donut, an income-vs-expense bar chart, and recent activity.
- **Insights** — AI-written recommendations when an OpenAI key is configured,
  with a deterministic rules engine as the always-available fallback. A badge on
  the page shows which engine produced the current output.
- **Prediction** — next-month expense projected from monthly averages, with a
  55–95% confidence band and a budget-risk flag.
- **Reports** — pick any month, see a summary plus category chart and the full
  transaction list, and export a PDF generated server-side with PDFKit.

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Node.js (ES Modules) | Runtime; `"type": "module"` throughout |
| Express.js | REST API framework |
| MongoDB + Mongoose | Database and ODM for User, Transaction, Budget |
| bcrypt | Password hashing in a `pre('save')` hook |
| jsonwebtoken | JWT signing and verification |
| helmet | Secure HTTP headers |
| express-rate-limit | 300 requests / 15-minute rolling window |
| cors | Origin whitelist for the React client |
| OpenAI SDK | Insight generation (`gpt-4o-mini`), optional |
| PDFKit | Server-side PDF generation, streamed to the response |
| dotenv | Environment variable management |

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | Component-based UI |
| Vite | Build tool and dev server |
| React Router v6 | Routing with a `ProtectedRoute` wrapper and nested layout |
| Redux Toolkit + react-redux | `auth`, `transactions`, `budget`, `insights` slices |
| Axios | HTTP client with request/response interceptors |
| Recharts | Line, bar, and donut charts |
| Tailwind CSS | Utility-first styling with a custom palette |

---

## Screenshots

_Run the app, then drop images in a `screenshots/` folder and link them here._

| Page | Screenshot |
|---|---|
| Dashboard | `![Dashboard](screenshots/dashboard.png)` |
| Transactions | `![Transactions](screenshots/transactions.png)` |
| Budget | `![Budget](screenshots/budget.png)` |
| Insights | `![Insights](screenshots/insights.png)` |
| Reports | `![Reports](screenshots/reports.png)` |

---

## Setup Instructions

### Prerequisites

- **Node.js v18+** — [nodejs.org](https://nodejs.org)
- **Git**
- **MongoDB** — a free [Atlas](https://cloud.mongodb.com) M0 cluster, or a local
  instance at `mongodb://localhost:27017/ai-finance-tracker`
- **OpenAI API key** — *optional*. Without it the app runs on its built-in
  heuristic engine with no loss of functionality.

### Environment variables

Copy the example file and fill it in:

```bash
cd server
cp .env.example .env
```

```env
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ai-finance-tracker?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRE=7d
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
FRONTEND_URL=http://localhost:5173
```

Generate a real secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`.env` is git-ignored and must never be committed.

The client reads one optional variable, `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

It defaults to `http://localhost:5000/api`, so local development works without it.

### Run it

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev          # nodemon, port 5000

# Terminal 2 — frontend
cd client
npm install
npm run dev          # Vite, port 5173
```

Open <http://localhost:5173>, sign up, add a few transactions, set a budget, then
visit the Dashboard, Insights, and Reports pages.

> **Windows note:** `bcrypt` is a native module. If `npm install` fails to build
> it, either install the [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
> or swap in the pure-JS drop-in: `npm uninstall bcrypt && npm install bcryptjs`,
> then change the import in `server/models/User.js` to `from 'bcryptjs'`. The API
> is identical.

### Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for a step-by-step Vercel + Render + Atlas
walkthrough. Config is already committed: [`render.yaml`](render.yaml) for the
API and [`client/vercel.json`](client/vercel.json) for the SPA.

---

## API Endpoints

All routes except `/api/auth/signup`, `/api/auth/login` and `/health` require an
`Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create user, hash password, return JWT |
| POST | `/api/auth/login` | Validate credentials, return JWT |
| GET | `/api/auth/me` | Return the authenticated user |
| PUT | `/api/auth/profile` | Update name and email |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/auth/stats` | Account statistics |
| POST | `/api/transactions` | Create a transaction |
| GET | `/api/transactions` | List with filters, search, sort, pagination |
| PUT | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| POST | `/api/budget` | Set / upsert the budget |
| GET | `/api/budget` | Get the budget |
| PUT | `/api/budget` | Update the budget |
| POST | `/api/ai/insights` | Insights, with heuristic fallback |
| POST | `/api/ai/predict` | Spending prediction |
| GET | `/api/dashboard/summary` | Totals + trend + breakdown + recent |
| GET | `/api/reports/monthly` | JSON or PDF report for `?year=&month=` |
| GET | `/health` | Health check (database + AI provider status) |

**Query parameters on `GET /api/transactions`:** `page`, `limit`, `type`,
`category`, `search`, `sort` (`latest` \| `oldest` \| `amount_desc` \|
`amount_asc`), `from`, `to`.

---

## Architecture Notes

### One source of truth for every number

`server/services/financeAnalyzer.js` exports `summarizeTransactions()` — a pure
function that takes transactions plus an optional budget and returns totals,
savings, category breakdown, monthly trend, prediction, confidence, budget risk,
and rule-based insights. It performs no database access.

Four separate endpoints call it: `dashboardController`, `reportController`,
`aiService`, and `authController.getAccountStats`. Because they all consume the
same function, the Dashboard, Reports, Insights, and Profile pages are
structurally incapable of disagreeing about a total — a class of bug that
duplicated aggregation logic produces constantly.

### AI as an upgrade, never a dependency

`aiService.js` always runs the deterministic analyzer *first*, so a complete
answer exists before any network call is attempted. If `OPENAI_API_KEY` is
present and is not the placeholder, the **summary figures only** — never raw
transactions — are sent to `gpt-4o-mini` at `temperature: 0.4` with a "return
only a JSON array of strings" instruction. Every failure path (missing key,
network error, rate limit, unparseable response, empty array) falls back to the
heuristic insights.

Three consequences: the feature cannot break the app, the prompt stays small and
cheap, and individual transactions never leave the server. Swapping providers
means editing one file — controllers consume provider-agnostic JSON.

### Per-user data isolation enforced in the query

Every user-scoped query includes `userId: req.userId` **in the query itself**,
not as a check after fetching:

```js
Transaction.findOneAndUpdate({ _id: id, userId: req.userId }, updates, ...)
Transaction.findOneAndDelete({ _id: id, userId: req.userId })
```

Knowing another user's document id is therefore not enough to read, modify, or
delete it — the database simply returns nothing. Doing the ownership check in
application code after a fetch is the pattern that leaks data when someone
forgets a branch; here there is no branch to forget.

### Other decisions worth noting

- **Indexes mirror access patterns.** Every compound index on `Transaction` is
  prefixed with `userId` (`userId+transactionDate`, `userId+type`,
  `userId+category`) because every query filters on it first.
- **Passwords are structurally hard to leak.** `select: false` hides the hash
  from all normal queries; `login` and `changePassword` opt in explicitly with
  `.select('+password')`. The `pre('save')` hook only rehashes when the password
  field actually changed, so editing a name never corrupts a credential.
- **Sort input is whitelisted.** `sortMap` maps four known keys to sort clauses
  and falls back to `latest`; raw query strings never reach the MongoDB sort.
  Search input is regex-escaped before it becomes a pattern.
- **Budget is one document per user**, enforced by a unique index on `userId`,
  which is what allows `setBudget` to be a single `findOneAndUpdate` with
  `upsert: true` instead of separate create and update handlers.
- **PDFs stream from the server.** PDFKit writes directly into the HTTP
  response, so no heavy client-side PDF library ships to the browser.
- **Identical 401s.** The auth middleware returns the same message for a
  missing, malformed, invalid, and expired token, so failures cannot be probed
  apart. Login returns one message for both unknown email and wrong password.
- **Charts are accessibility-checked.** Series colours are assigned from a fixed,
  colourblind-tested slot order and are never recycled by rank, so filtering a
  chart cannot repaint the remaining series. Every chart pairs colour with a
  legend, direct labels, or a value table — identity never rides on hue alone.

---

## Business Relevance

The mechanics here are the same ones behind ordinary analytics and reporting
products, at a size where the whole system is legible:

- **A single trusted metric layer.** One pure function computes every figure the
  product displays. This is the same argument behind a semantic layer or a dbt
  metrics model: when finance, ops, and the dashboard each compute "revenue"
  their own way, the reconciliation meeting is the product. Centralising the
  calculation removes the disagreement structurally.
- **AI with a deterministic floor.** The LLM output is an enhancement layered
  over a rules engine that always runs, and every failure degrades to the
  deterministic result. That is the pattern any production system needs before
  putting a probabilistic component in a user-facing path.
- **Row-level access control.** Scoping every query by owner is the same
  requirement as multi-tenant isolation in any B2B SaaS product — the difference
  between "users have accounts" and "users cannot reach each other's data."
- **Scheduled reporting as an artefact.** Month-end close, board packs, and
  investor updates are all "pick a period, aggregate it, produce a document."
  The report endpoint is that workflow: one route, one period filter, two
  representations (JSON for the UI, PDF for the file).
- **Forecasting with stated confidence.** The prediction ships with a confidence
  score and a risk flag rather than a bare number. Presenting uncertainty
  alongside an estimate is what makes a forecast usable for a decision instead of
  merely impressive.

---

## Project Structure

```
AI_Finance_tracker/
├── server/
│   ├── config/                 Reserved for future config helpers
│   ├── models/                 User.js, Transaction.js, Budget.js
│   ├── controllers/            auth, transaction, budget, ai, dashboard, report
│   ├── services/               financeAnalyzer.js, aiService.js
│   ├── middleware/             authMiddleware.js
│   ├── routes/                 one file per controller
│   ├── app.js                  connectDB + Express app, security, routes
│   ├── server.js               bootstrap
│   └── .env                    not committed
├── client/
│   ├── src/
│   │   ├── components/         Layout, ProtectedRoute, SummaryCard, charts, forms
│   │   ├── pages/              Dashboard, Transactions, Budget, Insights,
│   │   │                       Reports, Profile, Login, Signup
│   │   ├── slices/             auth, transactions, budget, insights
│   │   ├── utils/              api.js, format.js, chartTheme.js
│   │   ├── store.js
│   │   └── App.jsx
│   └── vercel.json
├── render.yaml
├── DEPLOYMENT.md
├── .gitignore
└── README.md
```

---

## License

MIT
