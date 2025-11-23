# Travel Logger

A web-based travel logging application for planning and tracking trips with cities, routes, images, and interactive maps.

## Features

- **User Authentication**: Login/create account system
- **Trip Management**: Create, view, and manage multiple trips
- **City Selection**: Search and select cities worldwide using OpenStreetMap
- **Interactive Map**: View trip routes with:
  - City names and flags
  - Route lines with arrows showing direction
  - Transportation type indicators (plane, car, walking)
  - Route labels showing origin > destination
  - Image popups for each city
- **Trip Planning**: Add cities, notes, and images
- **Export**: Download trip data as JSON
- **View-Only Mode**: Safe viewing mode with all route information

## File Structure

- `login.html` - Login page
- `trips.html` - Trip selection page (Google Docs style)
- `index.html` - Trip editing page
- `view.html` - View-only trip map page
- `app.js` - Main trip editing functionality
- `auth.js` - Authentication and database (localStorage-based)
- `trips.js` - Trip selection page logic
- `view.js` - View-only map with all features
- `schema.sql` - Database schema
- `schema.json` - JSON schema definition
- `SCHEMA.md` - Schema documentation

## Getting Started

1. Open `login.html` in a web browser
2. Enter a username (creates account if new)
3. Click "New Trip" to create a trip
4. Search and add cities to your trip
5. Select route types between cities
6. Add images and notes
7. Click "View Trip" to see the interactive map
8. Click "Download Trip" to export your trip data

## Database

The application uses localStorage to store data matching the database schema:
- Users
- Trips
- Trip Cities
- Trip Routes
- Trip Images
- Trip Flags

All data is stored locally in the browser.

## Favicon

The application includes an SVG airplane favicon. To generate a proper `.ico` file:

1. Use an online SVG to ICO converter
2. Or use ImageMagick:
   ```bash
   convert favicon.svg -resize 16x16 favicon-16.png
   convert favicon.svg -resize 32x32 favicon-32.png
   convert favicon.svg -resize 512x512 favicon-512.png
   convert favicon-16.png favicon-32.png favicon-512.png favicon.ico
   ```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- localStorage support required

