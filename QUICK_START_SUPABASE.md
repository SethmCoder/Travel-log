# Quick Start: Connect to Supabase

## Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to **Settings** → **API**
3. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key

## Step 2: Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `schema.sql`
4. Paste and click **Run** (or press Cmd/Ctrl + Enter)
5. Verify tables were created in **Table Editor**

## Step 3: Configure the App

Open `auth-supabase.js` and replace:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

With your actual values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## Step 4: Disable Row Level Security (RLS) for Development

**Important**: Do this for development only!

1. In Supabase dashboard, go to **Table Editor**
2. For each table (users, trips, trip_cities, trip_routes, trip_images, trip_flags):
   - Click on the table
   - Click the **More** menu (three dots)
   - Click **Edit Table**
   - Toggle off **Enable Row Level Security**
   - Click **Save**

⚠️ **Warning**: Only disable RLS for testing! Enable it later and set up proper policies.

## Step 5: Test the App

1. Open `login.html` in your browser
2. Open browser console (F12)
3. Login with a username
4. Check for errors in console
5. Check Supabase **Table Editor** to see if data was saved

## Troubleshooting

**Error: "Supabase not initialized"**
- Check that you added the Supabase JS library before auth-supabase.js
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct (not the placeholder values)

**Error: "permission denied"**
- Disable RLS on all tables (see Step 4)
- Or set up proper RLS policies (see SUPABASE_SETUP.md for details)

**Data not saving**
- Check browser console for errors
- Verify your Supabase credentials are correct
- Check that tables exist in Supabase Table Editor

## That's It!

Once configured, the app will automatically use Supabase instead of localStorage. All your trips will be saved to Supabase and accessible from any device!

