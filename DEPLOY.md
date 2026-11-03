# Deploying Movement Rehab

This repository contains both the **Frontend** (React + Vite) and the **Backend** (Node.js + Express + MongoDB).

Recommended deployment setup:
- **Frontend**: [Vercel](https://vercel.com) (Static Vite SPA)
- **Backend**: [Render](https://render.com) (Web Service) or [Vercel](https://vercel.com) (Serverless Function)

Deploy the **backend first** so you have its live URL for the frontend.

---

## Part A — Deploy Backend on Render (Recommended)

Render provides a persistent Node.js environment ideal for Express APIs.

### A1. MongoDB Atlas Setup
1. In MongoDB Atlas → **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`).
2. Copy your connection string (`MONGO_URI`).

### A2. Create Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Web Service**.
2. Connect your repository: `https://github.com/atharvagupta02/movementweb1`.
3. Configure settings:
   - **Name**: `movementweb-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Add **Environment Variables**:
   | Key | Value | Notes |
   |---|---|---|
   | `NODE_VERSION` | `20` | Node 20 LTS |
   | `MONGO_URI` | `mongodb+srv://...` | Your Atlas connection string |
   | `JWT_SECRET` | *(random string)* | E.g., `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `ADMIN_EMAIL` | `owner@example.com` | Email of admin account |
   | `TRUST_PROXY` | `1` | Required behind Render reverse proxy |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app` | Set after frontend is deployed |
   | `CLINIC_IP_ENFORCE` | `false` | Set `true` if enforcing clinic WiFi only |
   | `CLINIC_IPS` | `your.clinic.public.ip` | Optional clinic IP allowlist |

5. Click **Create Web Service**. Once deployed, copy your Render URL:
   `https://movementweb-backend.onrender.com`

---

## Part B — Deploy Frontend on Vercel

The frontend is built with Vite and React.

### B1. Import Repository on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New... → Project**.
2. Import the `movementweb1` repository.
3. Keep default settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave blank/default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `VITE_BACKEND_URL` | `https://movementweb-backend.onrender.com` (your backend URL, no trailing slash) |
   | `VITE_ADMIN_EMAIL` | `owner@example.com` (matches `ADMIN_EMAIL` in backend) |

5. Click **Deploy**. Vercel will build the frontend and serve it with client-side SPA routing (`vercel.json`).
6. Copy your frontend URL (e.g. `https://movementweb1.vercel.app`).

### B2. Connect Frontend to Backend (CORS)
Go back to **Render** → your web service → **Environment Variables** → set `CORS_ORIGINS` to your Vercel URL:
```
CORS_ORIGINS=https://movementweb1.vercel.app
```
Save changes and Render will automatically redeploy.

---

## Alternative: Backend on Vercel (Serverless)

If you prefer deploying the backend on Vercel as well:
1. In Vercel, import the repo as a second project.
2. Set **Root Directory** to `backend`.
3. Set **Framework Preset** to `Other`.
4. Add the same backend environment variables (`MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `TRUST_PROXY=1`, etc.).
5. Deploy. The entry point is `backend/api/index.js` configured via `backend/vercel.json`.

---

## First-day checklist
1. Open the Vercel site, sign in at `/auth` with the owner email and password.
2. Verify all API routes connect without CORS issues.
3. Set up authenticator and clinic attendance settings if required.
