-- Enable Row Level Security (RLS) on all tables for production
-- Run this in Supabase SQL Editor when you're ready for production
-- ⚠️ Before enabling, make sure you've set up proper RLS policies!

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on trips table
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Enable RLS on trip_cities table
ALTER TABLE trip_cities ENABLE ROW LEVEL SECURITY;

-- Enable RLS on trip_routes table
ALTER TABLE trip_routes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on trip_images table
ALTER TABLE trip_images ENABLE ROW LEVEL SECURITY;

-- Enable RLS on trip_flags table
ALTER TABLE trip_flags ENABLE ROW LEVEL SECURITY;

