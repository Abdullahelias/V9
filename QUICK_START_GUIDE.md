# 🚀 Quick Start Guide: Deploy BRC Survey with Supabase

This guide will walk you through setting up your survey app from start to finish in about 10 minutes.

---

## Step 1: Create a Free Supabase Project (2 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** (or "Sign In" if you have an account)
3. Sign up with GitHub, Google, or email
4. Click **"New Project"**
5. Fill in:
   - **Name:** `brc-retreat-survey` (or whatever you prefer)
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Choose the region closest to your users
   - **Pricing Plan:** Free tier is perfect
6. Click **"Create new project"**
7. Wait 1-2 minutes for the project to initialize

---

## Step 2: Set Up Database Tables (2 minutes)

1. In your Supabase project dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Copy and paste this entire SQL script:

```sql
-- Create the survey_responses table
CREATE TABLE survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  role TEXT,
  question_1_text TEXT,
  question_1_audio_url TEXT,
  question_2_text TEXT,
  question_2_audio_url TEXT,
  question_3_text TEXT,
  question_3_audio_url TEXT,
  question_4_text TEXT,
  question_4_audio_url TEXT
);

-- Enable Row Level Security
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to insert
CREATE POLICY "Anyone can submit survey responses"
  ON survey_responses
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create a policy that allows anyone to read all responses
CREATE POLICY "Anyone can view survey responses"
  ON survey_responses
  FOR SELECT
  TO public
  USING (true);
```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

---

## Step 3: Set Up Audio Storage (2 minutes)

1. Click **"Storage"** in the left sidebar
2. Click **"Create a new bucket"**
3. Fill in:
   - **Name:** `survey-audio`
   - **Public bucket:** Toggle ON ✅ (important!)
4. Click **"Create bucket"**

### Add Storage Policies:

5. Click on your new `survey-audio` bucket
6. Click the **"Policies"** tab
7. Click **"New Policy"** → **"For full customization"**
8. Create the **Upload Policy**:
   - **Policy name:** `Anyone can upload audio files`
   - **Allowed operation:** INSERT ✅
   - **Target roles:** Select `public`
   - **WITH CHECK expression:** `bucket_id = 'survey-audio'`
   - Click **"Review"** then **"Save policy"**

9. Click **"New Policy"** again → **"For full customization"**
10. Create the **View Policy**:
    - **Policy name:** `Anyone can view audio files`
    - **Allowed operation:** SELECT ✅
    - **Target roles:** Select `public`
    - **USING expression:** `bucket_id = 'survey-audio'`
    - Click **"Review"** then **"Save policy"**

---

## Step 4: Get Your API Credentials (1 minute)

1. Click **"Project Settings"** (gear icon) in the left sidebar
2. Click **"API"** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
4. **Keep this page open** - you'll need these values in the next step!

---

## Step 5: Deploy to Netlify (3 minutes)

### Option A: Deploy from GitHub

1. Push your code to a GitHub repository (if you haven't already)
2. Go to [netlify.com](https://netlify.com) and sign in
3. Click **"Add new site"** → **"Import an existing project"**
4. Select **GitHub** and authorize Netlify
5. Choose your repository
6. In the deploy settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - Click **"Show advanced"** → **"New variable"**
   - Add your environment variables:
     - Variable 1: `VITE_SUPABASE_URL` = your Project URL from Step 4
     - Variable 2: `VITE_SUPABASE_ANON_KEY` = your anon key from Step 4
7. Click **"Deploy site"**
8. Wait 2-3 minutes for the build to complete

### Option B: Deploy via Netlify Drop

1. Run `npm run build` in your project folder
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag your `dist` folder onto the page
4. After deployment, click **"Site settings"** → **"Environment variables"**
5. Click **"Add a variable"** and add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Click **"Deploys"** → **"Trigger deploy"** → **"Deploy site"**

---

## Step 6: Set Up Custom Domain (Optional)

To deploy to `survey.al-ae.com`:

1. In Netlify, go to **"Domain settings"**
2. Click **"Add custom domain"**
3. Enter `survey.al-ae.com`
4. Netlify will show you DNS records to add
5. In your WordPress hosting DNS settings for `al-ae.com`, add:
   - **Type:** CNAME
   - **Name:** `survey`
   - **Value:** `your-site-name.netlify.app`
6. Wait 5-10 minutes for DNS to propagate
7. Netlify will automatically provision an SSL certificate

---

## ✅ You're Done!

Your survey is now live with:
- ✅ Persistent cross-user storage
- ✅ Audio recording support
- ✅ Analytics dashboard
- ✅ Real-time response gallery
- ✅ Automatic SSL/HTTPS

Visit your Netlify URL (or custom domain) to test it!

---

## 🧪 Testing

1. Fill out the survey and submit
2. Click **"View All"** to see the analytics dashboard
3. Check your Supabase dashboard:
   - **Table Editor** → `survey_responses` to see data
   - **Storage** → `survey-audio` to see audio files

---

## 🔧 Troubleshooting

**"View All" still shows setup message:**
- Check that environment variables are set in Netlify
- Redeploy the site after adding variables
- Clear your browser cache

**Audio upload fails:**
- Verify the `survey-audio` bucket is public
- Check that storage policies are created correctly

**Can't see responses:**
- Check Supabase Table Editor to confirm data is being saved
- Verify Row Level Security policies are active

---

## 📊 Viewing Your Data

To export or analyze responses:
1. Go to Supabase **Table Editor**
2. Click `survey_responses` table
3. Click **"..."** → **"Download as CSV"**

You can also query the data directly using SQL in the SQL Editor!

---

## 🆘 Need Help?

- Supabase docs: [supabase.com/docs](https://supabase.com/docs)
- Netlify docs: [docs.netlify.com](https://docs.netlify.com)
- Check browser console (F12) for error messages
