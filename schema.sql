-- Travel Logger Database Schema
-- PostgreSQL-compatible schema for storing user trips and travel plans

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trips table (projects)
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trip cities (places in the trip)
CREATE TABLE IF NOT EXISTS trip_cities (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    city_name VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    country VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    display_name TEXT,
    order_index INTEGER NOT NULL, -- Order in the trip
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT unique_trip_order UNIQUE(trip_id, order_index)
);

-- Trip route connections (lines between cities)
CREATE TABLE IF NOT EXISTS trip_routes (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    from_city_id INTEGER NOT NULL,
    to_city_id INTEGER NOT NULL,
    line_type VARCHAR(50) NOT NULL DEFAULT 'normal', -- 'normal', 'airplane', 'car', 'walking'
    line_color VARCHAR(20) DEFAULT '#3b82f6', -- Hex color for normal lines
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (from_city_id) REFERENCES trip_cities(id) ON DELETE CASCADE,
    FOREIGN KEY (to_city_id) REFERENCES trip_cities(id) ON DELETE CASCADE
);

-- Trip images (photos for each city)
CREATE TABLE IF NOT EXISTS trip_images (
    id SERIAL PRIMARY KEY,
    trip_city_id INTEGER NOT NULL,
    image_data TEXT NOT NULL, -- Base64 encoded image or file path/URL
    image_type VARCHAR(50), -- 'base64', 'url', 'filepath'
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_city_id) REFERENCES trip_cities(id) ON DELETE CASCADE
);

-- Trip flags/metadata (custom flags or tags for trips)
CREATE TABLE IF NOT EXISTS trip_flags (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    flag_type VARCHAR(50) NOT NULL, -- 'favorite', 'completed', 'planned', 'custom'
    flag_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_cities_trip_id ON trip_cities(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_cities_order ON trip_cities(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_trip_routes_trip_id ON trip_routes(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_routes_cities ON trip_routes(from_city_id, to_city_id);
CREATE INDEX IF NOT EXISTS idx_trip_images_city_id ON trip_images(trip_city_id);
CREATE INDEX IF NOT EXISTS idx_trip_flags_trip_id ON trip_flags(trip_id);

