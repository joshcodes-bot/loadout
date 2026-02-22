# LOADOUT — Training OS

A full-stack powerlifting training platform. Upload CSV programs, attach set videos, and let your coach review them in a TikTok-style weekly recap feed.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) |
| Database + Auth | Supabase (Postgres + Auth) |
| Video Storage | Supabase Storage |
| Hosting | Vercel (free tier) |

---

## Setup — Step by Step

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign up / Log in
2. Click **New Project**, name it `loadout`, choose a region near you
3. Wait ~2 minutes for the project to provision

### Step 2 — Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/migrations/001_schema.sql` from this project
4. Paste the entire contents into the editor and click **Run**
5. You should see "Success. No rows returned."

### Step 3 — Create the Video Storage Bucket

1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket**
3. Name it exactly: `videos`
4. Toggle **Public bucket** to **OFF** (private)
5. Click **Save**

Now add storage policies — go to **Storage → Policies** and add these SQL policies:

```sql
-- Athletes can upload their own videos
create policy "Athletes upload own videos"
on storage.objects for insert
with check (
  bucket_id = 'videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Athletes can read their own videos
create policy "Athletes read own videos"
on storage.objects for select
using (
  bucket_id = 'videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Coaches can read their athletes' videos
create policy "Coaches read athlete videos"
on storage.objects for select
using (
  bucket_id = 'videos'
  and exists (
    select 1 from public.coach_athlete ca
    where ca.coach_id = auth.uid()
    and ca.athlete_id = (storage.foldername(name))[1]::uuid
  )
);
```

### Step 4 — Configure Auth

1. In Supabase, go to **Authentication → URL Configuration**
2. Set **Site URL** to `http://localhost:3000` for now (you'll update after deploying)
3. Under **Redirect URLs**, add: `http://localhost:3000/auth/callback`

### Step 5 — Get Your API Keys

1. In Supabase, go to **Project Settings → API**
2. Copy **Project URL** and **anon / public** key

### Step 6 — Configure the App

1. In this project folder, copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```
2. Open `.env.local` and fill in your values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Step 7 — Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/loadout.git
git push -u origin main
```

### Step 2 — Import to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up / Log in (use your GitHub account)
2. Click **Add New → Project**
3. Import your `loadout` GitHub repo
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
   - `NEXT_PUBLIC_APP_URL` → your Vercel URL (you can get this after first deploy, e.g. `https://loadout.vercel.app`)
5. Click **Deploy**

### Step 3 — Update Supabase Auth URLs

Once deployed, copy your Vercel URL (e.g. `https://loadout.vercel.app`) and:

1. Supabase → **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel URL
3. Add to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## How to Use

### As an Athlete

1. Sign up at `/signup` — choose role **Athlete**
2. Go to **Upload CSV** and drag in your program file
3. Format: columns must be `Day,Exercise,Sets,Reps,Load_kg,RPE,Notes`
4. After import, go to **Program** to see your week
5. For each exercise, click **+ clip** to upload a video of your set
6. Fill in actual load/reps/RPE and hit ✓ to save
7. View coach feedback in **Dashboard**

### As a Coach

1. Sign up at `/signup` — choose role **Coach**
2. Go to **Athletes** → add your athlete by their email address (they must have signed up first)
3. Go to **Weekly Recap** to review their clips in TikTok-style scroll
4. Leave text feedback on any clip — the athlete sees it on their dashboard

---

## CSV Template

```
Day,Exercise,Sets,Reps,Load_kg,RPE,Notes
Mon,Back Squat,4,3,205,8,Competition stance
Mon,Bench Press,4,3,135,8,Comp grip
Wed,Competition Deadlift,5,2,250,8.5,
Fri,Low Bar Squat,3,5,185,7.5,
Sat,Sumo Deadlift,4,3,235,8,
```

A downloadable template is available in the Upload CSV page.

---

## Free Tier Limits

| Service | Free Limit | Notes |
|---|---|---|
| Supabase Database | 500MB | Plenty for athlete data |
| Supabase Storage | 1GB | ~200 phone videos |
| Vercel | Unlimited hobby projects | 100GB bandwidth/mo |

For more storage, Supabase Pro is $25/mo and includes 100GB.

---

## Project Structure

```
loadout/
├── app/
│   ├── (app)/                  # Protected pages (require login)
│   │   ├── layout.tsx          # App shell with sidebar
│   │   ├── dashboard/
│   │   ├── program/            # Session + exercise view, video upload
│   │   ├── upload/             # CSV import
│   │   ├── progress/           # Load tracking charts
│   │   ├── recap/              # TikTok-style coach review feed
│   │   └── roster/             # Coach athlete management
│   ├── login/
│   ├── signup/
│   └── auth/callback/          # OAuth callback handler
├── components/
│   └── layout/Sidebar.tsx
├── lib/supabase/               # Client + server Supabase helpers
├── supabase/migrations/        # Database schema SQL
├── types/index.ts
└── middleware.ts               # Auth route protection
```
