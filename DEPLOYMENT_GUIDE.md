# BRC Retreat Survey - Deployment Guide

## Overview

This survey is currently set up with Supabase integration, but needs configuration to store and share responses across all users.

## Current Status

✅ Survey form is functional locally  
✅ Supabase client is installed  
⚠️ **Database and storage need to be configured**

## Next Steps to Enable Response Storage

### 1. Set Up Supabase Database

Follow the instructions in `SUPABASE_SETUP.md` to:
- Create the `survey_responses` table
- Set up the `survey-audio` storage bucket
- Configure Row Level Security policies

### 2. Add Environment Variables

When deploying to Netlify (or any host), add these environment variables in your deployment settings:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Get these from your Supabase project dashboard under **Project Settings > API**.

### 3. Deploy to Production

The survey will work fully once deployed to a domain (like `survey.al-ae.com`) because:
- **Microphone access** will work (not blocked by iframe)
- **Audio recordings** can be uploaded to Supabase Storage
- **All responses** from all users will be saved to the database
- **Gallery view** can fetch and display all responses

### 4. What Will Happen After Setup

Once configured:

1. **Form Submission**: When users click "SUBMIT ANSWERS":
   - Personal info and text answers are saved to the database
   - Audio recordings are uploaded to Supabase Storage
   - Public URLs for audio files are stored in the database

2. **Gallery View**: Will show ALL responses from ALL users (not just the current session)

3. **Data Access**: You can:
   - View all responses in Supabase dashboard
   - Export data as CSV/JSON
   - Build additional admin views

## Important Notes

- **Public Survey**: With the current RLS policies, anyone can submit and view all responses
- **No PII Protection**: This setup is for a public survey - don't collect sensitive personal data
- **Audio Storage**: Audio files are stored in Supabase and linked via URL in the database

## Current Limitation

The current version saves responses but the Gallery still shows only the current session. To show ALL responses, the Gallery component needs to be updated to fetch from Supabase instead of using local state.

Would you like me to implement the full Gallery integration to fetch all responses from the database?
