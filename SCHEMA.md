# Travel Logger Database Schema Documentation

## Overview

This schema defines the database structure for the Travel Logger application, supporting multiple users with their own trip projects.

## Database Tables

### 1. Users Table (`users`)
Stores user account information.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Unique user identifier |
| username | TEXT (UNIQUE) | User's username |
| created_at | TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### 2. Trips Table (`trips`)
Stores trip/project information for each user.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Unique trip identifier |
| user_id | INTEGER (FK) | Owner of this trip (references users.id) |
| name | TEXT | Trip/project name |
| description | TEXT | Optional trip description |
| created_at | TIMESTAMP | Trip creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Relationships:**
- Belongs to: `users` (many trips to one user)
- Has many: `trip_cities`, `trip_routes`, `trip_flags`

### 3. Trip Cities Table (`trip_cities`)
Stores cities/places in each trip with their order and location data.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Unique city identifier |
| trip_id | INTEGER (FK) | Trip this city belongs to |
| city_name | TEXT | Name of the city |
| state | TEXT | State/prefecture/province (optional) |
| country | TEXT | Country name |
| latitude | REAL | City latitude coordinate |
| longitude | REAL | City longitude coordinate |
| display_name | TEXT | Full display name from geocoding |
| order_index | INTEGER | Order in the trip (0-based) |
| notes | TEXT | User notes about this city |
| created_at | TIMESTAMP | Record creation timestamp |

**Relationships:**
- Belongs to: `trips` (many cities to one trip)
- Has many: `trip_images`
- Connected via: `trip_routes` (from/to relationships)

**Constraints:**
- `UNIQUE(trip_id, order_index)` - Ensures no duplicate order positions

### 4. Trip Routes Table (`trip_routes`)
Stores route connections between cities (lines on the map).

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Unique route identifier |
| trip_id | INTEGER (FK) | Trip this route belongs to |
| from_city_id | INTEGER (FK) | Starting city |
| to_city_id | INTEGER (FK) | Destination city |
| line_type | TEXT | Route type: 'normal', 'airplane', 'car', 'walking' |
| line_color | TEXT | Hex color code for normal lines (default: '#3b82f6') |
| created_at | TIMESTAMP | Record creation timestamp |

**Relationships:**
- Belongs to: `trips`, `trip_cities` (from_city), `trip_cities` (to_city)

**Line Types:**
- `normal`: Standard line (customizable color)
- `airplane`: Airplane route (dashed pattern)
- `car`: Car route (different dashed pattern)
- `walking`: Walking route (dotted pattern)

### 5. Trip Images Table (`trip_images`)
Stores images/photos for each city in a trip.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Unique image identifier |
| trip_city_id | INTEGER (FK) | City this image belongs to |
| image_data | TEXT | Base64 encoded image, URL, or file path |
| image_type | TEXT | Storage type: 'base64', 'url', 'filepath' |
| caption | TEXT | Optional image caption |
| created_at | TIMESTAMP | Record creation timestamp |

**Relationships:**
- Belongs to: `trip_cities` (many images to one city)

### 6. Trip Flags Table (`trip_flags`)
Stores flags/metadata/tags for trips (favorite, completed, etc.).

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Unique flag identifier |
| trip_id | INTEGER (FK) | Trip this flag belongs to |
| flag_type | TEXT | Type: 'favorite', 'completed', 'planned', 'custom' |
| flag_value | TEXT | Value for custom flags |
| created_at | TIMESTAMP | Record creation timestamp |

**Relationships:**
- Belongs to: `trips` (many flags to one trip)

**Flag Types:**
- `favorite`: Marked as favorite trip
- `completed`: Trip has been completed
- `planned`: Trip is planned for future
- `custom`: Custom flag (use flag_value for details)

## Indexes

For optimal query performance:

- `idx_trips_user_id` - Fast lookup of trips by user
- `idx_trip_cities_trip_id` - Fast lookup of cities in a trip
- `idx_trip_cities_order` - Fast ordering of cities
- `idx_trip_routes_trip_id` - Fast lookup of routes in a trip
- `idx_trip_routes_cities` - Fast lookup of routes between cities
- `idx_trip_images_city_id` - Fast lookup of images for a city
- `idx_trip_flags_trip_id` - Fast lookup of flags for a trip

## Example Queries

### Get all trips for a user
```sql
SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC;
```

### Get all cities in a trip with their routes
```sql
SELECT tc.*, tr.line_type, tr.line_color
FROM trip_cities tc
LEFT JOIN trip_routes tr ON tr.to_city_id = tc.id
WHERE tc.trip_id = ?
ORDER BY tc.order_index;
```

### Get a complete trip with all data
```sql
-- Get trip info
SELECT * FROM trips WHERE id = ? AND user_id = ?;

-- Get cities
SELECT * FROM trip_cities WHERE trip_id = ? ORDER BY order_index;

-- Get routes
SELECT tr.*, 
       fc.city_name as from_city, 
       tc.city_name as to_city
FROM trip_routes tr
JOIN trip_cities fc ON tr.from_city_id = fc.id
JOIN trip_cities tc ON tr.to_city_id = tc.id
WHERE tr.trip_id = ?;

-- Get images for each city
SELECT * FROM trip_images WHERE trip_city_id IN (
    SELECT id FROM trip_cities WHERE trip_id = ?
);

-- Get flags
SELECT * FROM trip_flags WHERE trip_id = ?;
```

## Usage Notes

1. **Cascading Deletes**: When a user is deleted, all their trips are deleted. When a trip is deleted, all related cities, routes, images, and flags are deleted.

2. **Order Management**: Cities maintain their order through `order_index`. When reordering, update the `order_index` values.

3. **Image Storage**: The `image_data` field can store:
   - Base64 encoded images (for small images)
   - URLs (for cloud storage)
   - File paths (for local storage)

4. **Route Representation**: Routes are stored as connections between cities. The `line_type` and `line_color` define how they appear on the map.

