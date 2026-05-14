# EasyAIAgents — Complete Setup & Deployment Guide

## Project Structure
```
easyaiagents/
├── backend/
│   ├── server.js          ← Main server
│   ├── db/database.js     ← JSON file storage
│   ├── routes/
│   │   ├── auth.js        ← Signup, Login, Profile
│   │   ├── agents.js      ← 3-step agent builder
│   │   └── plans.js       ← Plan management
│   ├── middleware/auth.js  ← JWT authentication
│   ├── .env.example       ← Copy to .env
│   └── package.json
└── frontend/
    └── app.html           ← Complete frontend (Blogger pe lagao)
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update name/password |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agents/templates | Get all 12 templates |
| GET | /api/agents | List user's agents |
| POST | /api/agents | Step 1: Create agent |
| POST | /api/agents/:id/train | Step 2: Train with data |
| POST | /api/agents/:id/deploy | Step 3: Go live |
| GET | /api/agents/:id/stats | Get agent stats |
| DELETE | /api/agents/:id | Delete agent |

### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/plans | Get all plans |
| POST | /api/plans/upgrade | Upgrade plan |

---

## STEP 1: Backend Deploy (Render.com — FREE)

1. GitHub pe account banao
2. `easyaiagents/backend` folder ko repo mein push karo
3. Render.com pe jao → "New Web Service"
4. GitHub repo connect karo
5. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. Environment Variables add karo:
   ```
   JWT_SECRET = (koi bhi random lamba string)
   FRONTEND_URL = http://www.easyaiagents.online
   NODE_ENV = production
   ```
7. Deploy karo → milega URL like: `https://easyaiagents.onrender.com`

### Alternative: Railway.app (bhi free hai)
- railway.app → New Project → Deploy from GitHub
- Same environment variables add karo

---

## STEP 2: Frontend ko Backend se connect karo

`app.html` mein yeh line change karo:

```js
// Line ~350 mein:
const API = 'http://localhost:3001/api';

// Ye karo (apna Render URL lagao):
const API = 'https://easyaiagents.onrender.com/api';
```

---

## STEP 3: Blogger pe Frontend lagao

### Option A: Alag page banana (recommended)
1. Blogger Dashboard → Pages → New Page
2. "HTML view" switch karo
3. `app.html` ka saara content paste karo
4. URL set karo: `/dashboard` ya `/app`
5. Publish!

### Option B: Custom domain redirect
- Main site (`easyaiagents.online`) pe "Get Started" button ko
  `/dashboard` page pe redirect karo

---

## Local Testing

```bash
cd backend
cp .env.example .env
npm install
node server.js
```

Backend: http://localhost:3001
Frontend: `app.html` ko browser mein open karo

---

## Features Included

✅ Signup/Login with JWT (7 day sessions)
✅ Password hashing (bcrypt)
✅ Rate limiting (10 auth attempts per 15 min)
✅ CORS configured for your domain
✅ 12 Agent Templates
✅ 3-Step Wizard: Template → Train → Deploy
✅ Embed code generation
✅ Plan management (Free/Starter/Pro/Agency)
✅ Dashboard with stats
✅ Settings + password change
✅ Mobile responsive sidebar
✅ Toast notifications

---

## Future Upgrades

### Add Stripe payments:
```js
npm install stripe
// In routes/plans.js: create Stripe checkout session
// Redirect user to payment, then upgrade on webhook
```

### Add real AI (OpenAI):
```js
npm install openai
// In routes/agents.js train route:
// Call OpenAI to process training data and store embeddings
```

### Add email verification:
```js
npm install nodemailer
// Send verification link on signup
```

### Switch to PostgreSQL (for production scale):
```js
npm install pg drizzle-orm
// Current JSON storage works for 1000s of users
// Switch to Postgres when you hit 10k+ users
```
