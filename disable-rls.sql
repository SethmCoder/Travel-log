-- Disable Row Level Security (RLS) on all tables for development
-- Run this in Supabase SQL Editor: SQL Editor → New Query → Paste → Run

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on trips table
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;

-- Disable RLS on trip_cities table
ALTER TABLE trip_cities DISABLE ROW LEVEL SECURITY;

-- Disable RLS on trip_routes table
ALTER TABLE trip_routes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on trip_images table
ALTER TABLE trip_images DISABLE ROW LEVEL SECURITY;

-- Disable RLS on trip_flags table
ALTER TABLE trip_flags DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled (optional - this will show the status)
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'trips', 'trip_cities', 'trip_routes', 'trip_images', 'trip_flags')
ORDER BY tablename;

