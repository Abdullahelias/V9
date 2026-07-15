# Supabase Setup Instructions for BRC Retreat Center Survey

## 1. Database Table Setup

In your Supabase project, go to the SQL Editor and run this SQL:

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

## 2. Storage Bucket Setup

1. In your Supabase project, go to **Storage**
2. Create a new bucket called `survey-audio`
3. Make it **public** (so audio files can be played back)
4. Go to **Policies** for the bucket and add these policies:

**Insert Policy:**
```sql
CREATE POLICY "Anyone can upload audio files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'survey-audio');
```

**Select Policy:**
```sql
CREATE POLICY "Anyone can view audio files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'survey-audio');
```

## 3. Environment Variables

Add these to your deployment environment (Netlify, Vercel, etc.):

- `VITE_SUPABASE_URL` - Your Supabase project URL (from Project Settings > API)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key (from Project Settings > API)

For local testing, create a `.env` file in your project root with:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 4. What This Enables

- ✅ All survey submissions are stored in the database
- ✅ Audio recordings are uploaded to Supabase Storage
- ✅ Gallery view shows ALL responses from ALL users
- ✅ Responses persist and can be reviewed anytime
- ✅ Public access means anyone with the URL can view all responses
- ✅ Data can be exported from Supabase for analysis

## Notes

- The policies above make this a **public survey** where anyone can submit and view responses
- For a private survey, you would need to implement authentication
- Audio files are stored in Supabase Storage and linked via URL in the database
