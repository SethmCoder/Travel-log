# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - Name: Travel Logger (or any name)
   - Database Password: Choose a strong password
   - Region: Choose closest to you
5. Wait for the project to be created (takes a few minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `schema.sql` (the PostgreSQL version)
4. Click **Run** to execute the SQL
5. Verify tables were created by going to **Table Editor**

## Step 4: Configure the Application

1. Open `auth-supabase.js`
2. Replace these values with your Supabase credentials:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Project URL
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon key
   ```

3. Update all HTML files to use the Supabase version:
   - Change `<script src="auth.js"></script>` to `<script src="auth-supabase.js"></script>`
   - Add this before auth-supabase.js:
     ```html
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     ```

## Step 5: Update Row Level Security (RLS) Policies

Supabase has Row Level Security enabled by default. You need to create policies:

1. Go to **Authentication** → **Policies** in Supabase dashboard
2. For each table, create policies:

### Users Table:
- **Policy Name**: Allow read own data
- **Target roles**: authenticated, anon
- **USING expression**: `true` (for public access)
- **WITH CHECK expression**: `true`

### Trips Table:
- **Policy Name**: Users can manage their own trips
- **Target roles**: authenticated, anon
- **USING expression**: `user_id = auth.uid()` (if using auth) OR `true` (for username-based)
- **WITH CHECK expression**: Same as USING

### All Other Tables (trip_cities, trip_routes, trip_images, trip_flags):
- **Policy Name**: Users can manage their trip data
- **Target roles**: authenticated, anon
- **USING expression**: 
  ```sql
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = trip_cities.trip_id 
    AND trips.user_id = auth.uid()
  )
  ```
- Or use `true` for simpler access if you're not using Supabase auth

**Alternative: Disable RLS (Development Only)**
If you want to disable RLS for development:
1. Go to each table in **Table Editor**
2. Click **More** → **Edit Table**
3. Toggle off **Enable Row Level Security**

⚠️ **Warning**: Only disable RLS for development/testing!

## Step 6: Update HTML Files

Update these files to include Supabase library and use auth-supabase.js:

- `login.html`
- `trips.html`
- `index.html`
- `view.html`

Add this before the auth script:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Change:
```html
<script src="auth.js"></script>
```

To:
```html
<script src="auth-supabase.js"></script>
```

## Step 7: Update JavaScript Files

Some functions in `app.js`, `trips.js`, and `view.js` may need to be updated to use async/await since Supabase operations are asynchronous.

For example:
- `db.getTripsByUserId()` is now async, so use: `await db.getTripsByUserId()`
- `db.getTripById()` is now async, so use: `await db.getTripById()`

## Testing

1. Open `login.html` in your browser
2. Open browser console (F12)
3. Try to login - check for any errors
4. Verify data is saved to Supabase by checking the Table Editor in your Supabase dashboard

## Troubleshooting

### Error: "Supabase not initialized"
- Check that you've added the Supabase JS library before auth-supabase.js
- Verify your SUPABASE_URL and SUPABASE_ANON_KEY are correct

### Error: "permission denied for table"
- Check your RLS policies
- Verify the policies allow the operations you're trying to perform

### Error: "relation does not exist"
- Run the schema.sql file in Supabase SQL Editor
- Check that all tables were created successfully

### Data not appearing
- Check browser console for errors
- Verify data was inserted in Supabase Table Editor
- Check RLS policies allow reading data

