##  Live Demo
Frontend: https://hr-screening-frontend.vercel.app
Backend:  https://hr-screening-research-agent.onrender.com 

live url: https://hr-screening-research-agent-fronten.vercel.app/

## Setup

```bash
npm install
cp .env.example .env   # fill in GROQ_API_KEY, GOOGLE_CLIENT_ID, JWT_SECRET
npm run dev
```

## Google sign-in

1. Create an **OAuth 2.0 Web application** client at
   https://console.cloud.google.com/apis/credentials
2. Add the frontend origins (e.g. `http://localhost:5173` and the Vercel URL) to
   *Authorized JavaScript origins*.
3. Put the client ID in `GOOGLE_CLIENT_ID` here and in the frontend's
   `VITE_GOOGLE_CLIENT_ID`.

The frontend sends the Google ID token to `POST /auth/google`; the server verifies
it, derives a **username** from the email (`aakrit@gmail.com` → `aakrit`) and
returns a signed session token used for every later request.

## Screening history per username

Progress is no longer kept in memory for the lifetime of a session. Each user owns
`$DATA_DIR/users/<username>.json`, which holds their profile and every screening
they have run, so history survives restarts and is scoped to the signed-in user.

`DATA_DIR` defaults to `./data`. On Render, attach a persistent disk and point
`DATA_DIR` at its mount path (e.g. `/var/data`) — the default filesystem is wiped
on every deploy.

## API

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | – | Liveness plus whether Google sign-in is configured |
| POST | `/auth/google` | – | Exchange a Google ID token for a session token |
| GET | `/me` | Bearer | Signed-in profile and dashboard stats |
| GET | `/screenings` | Bearer | Full screening history for the username |
| GET | `/screenings/:id` | Bearer | A single screening |
| DELETE | `/screenings/:id` | Bearer | Remove a screening from the history |
| POST | `/screen` | optional | Screen CV text; saved to the history when signed in |
| POST | `/upload` | optional | Screen an uploaded PDF; saved when signed in |
