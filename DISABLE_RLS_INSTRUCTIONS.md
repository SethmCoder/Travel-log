# Disable RLS in Supabase - Quick Guide

## Method 1: Using SQL Editor (Fastest - Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `disable-rls.sql` in this folder
6. Copy the entire contents
7. Paste into the SQL Editor
8. Click **Run** (or press `Cmd/Ctrl + Enter`)
9. You should see "Success. No rows returned" for each ALTER TABLE command
10. The verification query at the end will show `rls_enabled: false` for all tables

✅ Done! RLS is now disabled on all tables.

---

## Method 2: Using Table Editor (Manual - Slower)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Table Editor** in the left sidebar
4. For each table (users, trips, trip_cities, trip_routes, trip_images, trip_flags):
   - Click on the table name
   - Click the **More** menu (three dots) → **Edit Table**
   - Find **Enable Row Level Security** toggle
   - Toggle it **OFF**
   - Click **Save**

---

## Verify RLS is Disabled

After disabling, test your app:
1. Open `test-supabase.html` in your browser
2. Click "Test Write Operation"
3. You should see ✅ "Write operation successful!"

Or test in your app:
1. Try saving a trip
2. No more "permission denied" errors
3. Data should save successfully

---

## To Re-enable RLS Later (For Production)

When you're ready for production:
1. Set up proper RLS policies first (see SUPABASE_SETUP.md)
2. Run `enable-rls.sql` in SQL Editor
3. Test that your policies work correctly

⚠️ **Important**: Don't enable RLS without setting up policies first, or your app will break!

