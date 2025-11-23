// Application state
let tripPlan = [];
let filteredCities = [];
let isSearching = false;
let pendingLineType = null; // Store which connection needs a line type
let searchTimeout = null;
let isLoadingCities = false;
let currentTripId = null; // Current trip being edited

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // Get trip ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('trip');
    
    if (tripId) {
        currentTripId = parseInt(tripId);
        loadTripAsync(currentTripId);
    } else {
        // New trip - create it
        const currentUser = getCurrentUser();
        if (currentUser) {
            const tripName = prompt('Enter trip name:') || `Trip ${new Date().toLocaleDateString()}`;
            if (tripName) {
                createNewTripAsync(currentUser.id, tripName);
            } else {
                // User cancelled, go back to trips
                window.location.href = 'trips.html';
            }
        }
    }
    
    // Always show View and Download buttons if trip exists
    function updateButtonVisibility() {
        const viewBtn = document.getElementById('viewTripBtn');
        const downloadBtn = document.getElementById('downloadTripBtn');
        if (currentTripId) {
            if (viewBtn) viewBtn.style.display = 'block';
            if (downloadBtn) downloadBtn.style.display = 'block';
        }
    }
    
    // Update button visibility after trip loads
    setTimeout(updateButtonVisibility, 100);

    // Event listeners for header buttons
    const backBtn = document.getElementById('backToTripsBtn');
    const saveBtn = document.getElementById('saveTripBtn');
    const viewBtn = document.getElementById('viewTripBtn');
    const downloadBtn = document.getElementById('downloadTripBtn');
    const tripSelectorBtn = document.getElementById('tripSelectorBtn');
    const closeTripSelector = document.getElementById('closeTripSelector');
    const tripSelectorOverlay = document.getElementById('tripSelectorOverlay');

    if (backBtn) {
        backBtn.addEventListener('click', async () => {
            await saveTrip(); // Auto-save before leaving
            window.location.href = 'trips.html';
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                await saveTrip();
                // Only show success if we didn't have any errors
                // Check if data was actually saved by verifying localStorage
                const storageKey = 'travel_logger_trips';
                const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
                const tripExists = trips.some(t => t.id === currentTripId || t.id === currentTripId.toString());
                if (tripExists) {
                    alert('Trip saved successfully!');
                } else {
                    console.warn('Trip may not have saved properly');
                }
            } catch (error) {
                console.error('Error in save button handler:', error);
                // Don't show alert - localStorage fallback should have handled it
            }
        });
    }

    if (viewBtn) {
        viewBtn.addEventListener('click', async () => {
            await saveTrip(); // Save before viewing
            window.location.href = `view.html?trip=${currentTripId}`;
        });
        // Always show View button if trip exists - never hide it
        if (currentTripId) {
            viewBtn.style.display = 'block';
        }
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            await saveTrip(); // Save before downloading
            await downloadTripFromEdit(currentTripId);
            // Trip remains editable - no state change
        });
        // Always show Download button if trip exists - never hide it
        if (currentTripId) {
            downloadBtn.style.display = 'block';
        }
    }

    // Trip Selector functionality
    if (tripSelectorBtn) {
        tripSelectorBtn.addEventListener('click', () => {
            openTripSelector();
        });
    }

    if (closeTripSelector) {
        closeTripSelector.addEventListener('click', () => {
            closeTripSelectorPanel();
        });
    }

    if (tripSelectorOverlay) {
        tripSelectorOverlay.addEventListener('click', () => {
            closeTripSelectorPanel();
        });
    }

    initializeCityList();
    initializeSearch();
    initializePlanArea();
    initializeLineTypeSelection();
    initializeMap();
});

async function createNewTripAsync(userId, tripName) {
    try {
        // Check if async
        let newTrip;
        const result = db.createTrip(userId, tripName);
        if (result instanceof Promise) {
            newTrip = await result;
        } else {
            newTrip = result;
        }
        
        currentTripId = newTrip.id;
        window.history.replaceState({}, '', `index.html?trip=${currentTripId}`);
        updateTripHeader(newTrip);
    } catch (error) {
        console.error('Error creating trip:', error);
        alert('Error creating trip. Please check your Supabase connection.');
    }
}

async function loadTripAsync(tripId) {
    try {
        // Get trip - handle both sync and async
        let trip = db.getTripById(tripId);
        if (trip instanceof Promise) {
            trip = await trip;
        }
        
        if (!trip) {
            alert('Trip not found');
            window.location.href = 'trips.html';
            return;
        }

        updateTripHeader(trip);

        // Get cities - handle both sync and async
        let cities = db.getCitiesByTripId(tripId);
        if (cities instanceof Promise) {
            cities = await cities;
        }
        
        // Get routes - handle both sync and async
        let routes = db.getRoutesByTripId(tripId);
        if (routes instanceof Promise) {
            routes = await routes;
        }
        
        // Get images - handle both sync and async
        let images = db.getTripImages();
        if (images instanceof Promise) {
            images = await images;
        }

    // Convert database format to tripPlan format
    tripPlan = cities.map(city => {
        const cityImages = images.filter(img => img.trip_city_id === city.id);
        return {
            city: {
                name: city.city_name,
                state: city.state,
                country: city.country,
                lat: city.latitude,
                lng: city.longitude,
                display_name: city.display_name
            },
            images: cityImages.map(img => img.image_data),
            text: city.notes || '',
            lineType: null, // Will be set from routes
            lineColor: '#3b82f6',
            dbCityId: city.id,
            orderIndex: city.order_index
        };
    });

    // Set line types from routes
    cities.forEach((city, index) => {
        if (index > 0) {
            const route = routes.find(r => r.to_city_id === city.id);
            if (route) {
                const cityInPlan = tripPlan.find(item => item.dbCityId === city.id);
                if (cityInPlan) {
                    cityInPlan.lineType = route.line_type;
                    cityInPlan.lineColor = route.line_color;
                }
            }
        }
    });

        renderPlanArea();
        updateMap();
    } catch (error) {
        console.error('Error loading trip:', error);
        alert('Error loading trip. Please check your Supabase connection.');
    }
}

function updateTripHeader(trip) {
    const tripNameEl = document.getElementById('tripName');
    if (tripNameEl) {
        tripNameEl.textContent = trip.name;
    }
}

async function saveTrip() {
    if (!currentTripId) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    let supabaseError = false;
    let errorMessage = '';
    let supabaseDiagnostic = null;

    // Test Supabase connection first
    try {
        const client = await db.ensureSupabase();
        if (client) {
            supabaseDiagnostic = await db.testSupabaseConnection();
            if (!supabaseDiagnostic.success) {
                console.error('Supabase connection issue detected:', supabaseDiagnostic);
                // Show helpful error message based on the issue
                if (supabaseDiagnostic.code === 'RLS_ERROR') {
                    console.error('⚠️ RLS Error: Row Level Security is blocking access. Disable RLS in Supabase dashboard or set up policies.');
                } else if (supabaseDiagnostic.code === 'NETWORK_ERROR') {
                    console.error('⚠️ Network Error: Cannot reach Supabase. Check your internet connection.');
                } else if (supabaseDiagnostic.code === 'TABLE_MISSING') {
                    console.error('⚠️ Table Missing: Run schema.sql in Supabase SQL Editor.');
                }
            }
        } else {
            console.warn('Supabase client not available, using localStorage only');
        }
    } catch (e) {
        console.warn('Error testing Supabase connection:', e);
    }

    try {
        // Delete existing cities and routes (we'll recreate them) - handle both sync and async
        try {
            let deleteCities = db.deleteTripCities(currentTripId);
            if (deleteCities instanceof Promise) {
                await deleteCities;
            }
        } catch (e) {
            console.warn('Error deleting cities (continuing):', e);
        }
        
        try {
            let deleteRoutes = db.deleteTripRoutes(currentTripId);
            if (deleteRoutes instanceof Promise) {
                await deleteRoutes;
            }
        } catch (e) {
            console.warn('Error deleting routes (continuing):', e);
        }
        
        try {
            let deleteImages = db.deleteTripImages(currentTripId);
            if (deleteImages instanceof Promise) {
                await deleteImages;
            }
        } catch (e) {
            console.warn('Error deleting images (continuing):', e);
        }

        // Save cities and track IDs for routes - handle both sync and async
        const cityIds = [];
        
        for (let index = 0; index < tripPlan.length; index++) {
            const item = tripPlan[index];
            try {
                let city = db.addCityToTrip(
                    currentTripId,
                    item.city,
                    index
                );
                
                // Handle async
                if (city instanceof Promise) {
                    city = await city;
                }

                cityIds.push(city.id);

                // Save notes - handle both sync and async
                if (item.text) {
                    try {
                        let updateResult = db.updateCity(city.id, { notes: item.text });
                        if (updateResult instanceof Promise) {
                            await updateResult;
                        }
                    } catch (e) {
                        console.warn('Error updating city notes (continuing):', e);
                    }
                }

                // Save images - handle both sync and async
                if (item.images && item.images.length > 0) {
                    for (const img of item.images) {
                        try {
                            let imageResult = db.addImage(city.id, img, 'base64');
                            if (imageResult instanceof Promise) {
                                await imageResult;
                            }
                        } catch (e) {
                            console.warn('Error adding image (continuing):', e);
                        }
                    }
                }

                // Update dbCityId for future reference
                item.dbCityId = city.id;
            } catch (e) {
                console.error('Error saving city:', e);
                supabaseError = true;
                errorMessage = e.message || 'Unknown error';
                // Continue with next city - localStorage fallback should have saved it
            }
        }

        // Save routes after all cities are created - handle both sync and async
        for (let index = 0; index < tripPlan.length; index++) {
            const item = tripPlan[index];
            if (index > 0 && item.lineType && cityIds[index - 1] && cityIds[index]) {
                try {
                    let routeResult = db.addRoute(
                        currentTripId,
                        cityIds[index - 1],
                        cityIds[index],
                        item.lineType,
                        item.lineColor
                    );
                    if (routeResult instanceof Promise) {
                        await routeResult;
                    }
                } catch (e) {
                    console.warn('Error adding route (continuing):', e);
                    supabaseError = true;
                    errorMessage = e.message || 'Unknown error';
                }
            }
        }

        // Update trip timestamp - handle both sync and async
        try {
            const updateResult = db.updateTrip(currentTripId, { updated_at: new Date().toISOString() });
            if (updateResult instanceof Promise) {
                await updateResult;
            }
        } catch (e) {
            console.warn('Error updating trip timestamp (continuing):', e);
            supabaseError = true;
            errorMessage = e.message || 'Unknown error';
        }
        
        // Show helpful diagnostic message if Supabase failed
        if (supabaseError && supabaseDiagnostic && !supabaseDiagnostic.success) {
            console.warn('Some Supabase operations failed, but data was saved to localStorage');
            
            // Show specific error message to help user fix the issue
            let errorMsg = 'Supabase connection issue: ';
            if (supabaseDiagnostic.code === 'RLS_ERROR') {
                errorMsg = '⚠️ Row Level Security (RLS) is blocking access. Go to Supabase Dashboard → Table Editor → Edit each table → Disable RLS for development.';
            } else if (supabaseDiagnostic.code === 'NETWORK_ERROR') {
                errorMsg = '⚠️ Cannot connect to Supabase. Check your internet connection and Supabase URL.';
            } else if (supabaseDiagnostic.code === 'TABLE_MISSING') {
                errorMsg = '⚠️ Database tables missing. Run schema.sql in Supabase SQL Editor.';
            } else {
                errorMsg = `⚠️ ${supabaseDiagnostic.error || 'Unknown Supabase error'}`;
            }
            
            console.error(errorMsg);
            // Don't show alert - data is saved locally, but log the issue
        } else if (supabaseError) {
            console.warn('Some Supabase operations failed, but data was saved to localStorage');
        }
    } catch (error) {
        console.error('Critical error saving trip:', error);
        // Even if everything fails, try to save to localStorage as last resort
        let savedToLocalStorage = false;
        try {
            // Save trip data to localStorage
            const storageKey = 'travel_logger_trips';
            const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const tripIndex = trips.findIndex(t => t.id === currentTripId || t.id === currentTripId.toString());
            if (tripIndex !== -1) {
                trips[tripIndex].updated_at = new Date().toISOString();
                localStorage.setItem(storageKey, JSON.stringify(trips));
            }
            
            // Also save cities, routes, and images to localStorage
            const citiesKey = 'travel_logger_trip_cities';
            const routesKey = 'travel_logger_trip_routes';
            const imagesKey = 'travel_logger_trip_images';
            
            let cities = JSON.parse(localStorage.getItem(citiesKey) || '[]');
            cities = cities.filter(c => c.trip_id !== currentTripId && c.trip_id !== currentTripId.toString());
            
            let routes = JSON.parse(localStorage.getItem(routesKey) || '[]');
            routes = routes.filter(r => r.trip_id !== currentTripId && r.trip_id !== currentTripId.toString());
            
            let images = JSON.parse(localStorage.getItem(imagesKey) || '[]');
            
            // Save cities
            tripPlan.forEach((item, index) => {
                const city = {
                    id: item.dbCityId || (Date.now() + index).toString(),
                    trip_id: currentTripId,
                    city_name: item.city.name,
                    state: item.city.state || null,
                    country: item.city.country,
                    latitude: item.city.lat,
                    longitude: item.city.lng,
                    display_name: item.city.display_name || null,
                    order_index: index,
                    notes: item.text || '',
                    created_at: new Date().toISOString()
                };
                cities.push(city);
                
                // Save images for this city
                if (item.images && item.images.length > 0) {
                    item.images.forEach((img, imgIndex) => {
                        images.push({
                            id: (Date.now() + index + imgIndex).toString(),
                            trip_city_id: city.id,
                            image_data: img,
                            image_type: 'base64',
                            caption: '',
                            created_at: new Date().toISOString()
                        });
                    });
                }
            });
            
            // Save routes
            for (let i = 0; i < tripPlan.length - 1; i++) {
                if (tripPlan[i + 1].lineType) {
                    const fromCity = cities.find(c => c.order_index === i && (c.trip_id === currentTripId || c.trip_id === currentTripId.toString()));
                    const toCity = cities.find(c => c.order_index === i + 1 && (c.trip_id === currentTripId || c.trip_id === currentTripId.toString()));
                    if (fromCity && toCity) {
                        routes.push({
                            id: (Date.now() + i).toString(),
                            trip_id: currentTripId,
                            from_city_id: fromCity.id,
                            to_city_id: toCity.id,
                            line_type: tripPlan[i + 1].lineType,
                            line_color: tripPlan[i + 1].lineColor || '#3b82f6',
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }
            
            localStorage.setItem(citiesKey, JSON.stringify(cities));
            localStorage.setItem(routesKey, JSON.stringify(routes));
            localStorage.setItem(imagesKey, JSON.stringify(images));
            
            savedToLocalStorage = true;
            console.log('Trip saved to localStorage as fallback');
        } catch (localError) {
            console.error('Even localStorage save failed:', localError);
        }
        
        // Only show alert if localStorage also failed
        if (!savedToLocalStorage) {
            alert('Error saving trip. Data may be lost. Please check your browser console.');
        } else {
            // Data was saved to localStorage, so don't show error
            console.log('Trip saved successfully to localStorage (Supabase unavailable)');
        }
    }
}

// Keep sync version for backward compatibility
function loadTrip(tripId) {
    loadTripAsync(tripId);
}

// Trip Selector Functions
async function openTripSelector() {
    const sidebar = document.getElementById('tripSelectorSidebar');
    const overlay = document.getElementById('tripSelectorOverlay');
    const list = document.getElementById('tripSelectorList');
    
    if (!sidebar || !overlay || !list) return;
    
    // Show overlay and sidebar
    overlay.classList.remove('hidden');
    sidebar.classList.remove('translate-x-full');
    
    // Load trips
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    try {
        let trips;
        const result = db.getTripsByUserId(currentUser.id);
        if (result instanceof Promise) {
            trips = await result;
        } else {
            trips = result;
        }
        
        list.innerHTML = '';
        
        if (trips.length === 0) {
            list.innerHTML = '<p class="text-gray-400 text-center py-8">No trips found</p>';
            return;
        }
        
        trips.forEach(trip => {
            const tripItem = document.createElement('div');
            tripItem.className = 'bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition';
            tripItem.innerHTML = `
                <h3 class="text-white font-bold text-lg mb-1">${escapeHtml(trip.name)}</h3>
                <p class="text-gray-400 text-sm">${trip.description || 'No description'}</p>
                <div class="flex gap-2 mt-3">
                    <button class="select-trip-btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm" data-trip-id="${trip.id}">
                        Select
                    </button>
                    <button class="view-trip-btn bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm" data-trip-id="${trip.id}">
                        View
                    </button>
                </div>
            `;
            
            // Select button
            const selectBtn = tripItem.querySelector('.select-trip-btn');
            selectBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await saveTrip(); // Save current trip
                window.location.href = `index.html?trip=${trip.id}`;
            });
            
            // View button
            const viewBtn = tripItem.querySelector('.view-trip-btn');
            viewBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await saveTrip(); // Save current trip
                window.location.href = `view.html?trip=${trip.id}`;
            });
            
            list.appendChild(tripItem);
        });
    } catch (error) {
        console.error('Error loading trips:', error);
        list.innerHTML = '<p class="text-red-400 text-center py-8">Error loading trips</p>';
    }
}

function closeTripSelectorPanel() {
    const sidebar = document.getElementById('tripSelectorSidebar');
    const overlay = document.getElementById('tripSelectorOverlay');
    
    if (sidebar) sidebar.classList.add('translate-x-full');
    if (overlay) overlay.classList.add('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Download trip from edit page
async function downloadTripFromEdit(tripId) {
    try {
        // Get trip - handle both sync and async
        let trip = db.getTripById(tripId);
        if (trip instanceof Promise) {
            trip = await trip;
        }
        if (!trip) {
            alert('Trip not found');
            return;
        }

        // Get cities - handle both sync and async
        let cities = db.getCitiesByTripId(tripId);
        if (cities instanceof Promise) {
            cities = await cities;
        }
        
        // Get routes - handle both sync and async
        let routes = db.getRoutesByTripId(tripId);
        if (routes instanceof Promise) {
            routes = await routes;
        }
        
        // Get images - handle both sync and async
        let images = db.getTripImages();
        if (images instanceof Promise) {
            images = await images;
        }
        
        // Get flags - handle both sync and async
        let flags = db.getFlagsByTripId(tripId);
        if (flags instanceof Promise) {
            flags = await flags;
        }

        const tripData = {
            trip: trip,
            cities: cities,
            routes: routes,
            images: images,
            flags: flags,
            exported_at: new Date().toISOString()
        };

        const dataStr = JSON.stringify(tripData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${trip.name.replace(/[^a-z0-9]/gi, '_')}_trip_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('Trip downloaded successfully! The trip remains editable.');
    } catch (error) {
        console.error('Error downloading trip:', error);
        alert('Error downloading trip. Please check your Supabase connection.');
    }
}

// Initialize city list
function initializeCityList() {
    renderCityList();
}

function renderCityList() {
    const cityListContainer = document.getElementById('cityList');
    cityListContainer.innerHTML = '';
    
    if (isLoadingCities) {
        const loadingItem = document.createElement('div');
        loadingItem.className = 'text-white p-2 text-center';
        loadingItem.textContent = 'Loading cities...';
        cityListContainer.appendChild(loadingItem);
        return;
    }
    
    if (filteredCities.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'text-gray-400 p-2 text-center';
        emptyItem.textContent = 'Type to search for cities...';
        cityListContainer.appendChild(emptyItem);
        return;
    }
    
    filteredCities.forEach(city => {
        const cityItem = document.createElement('div');
        cityItem.className = 'city-list-item text-white p-2 rounded cursor-pointer transition hover:bg-gray-800 hover:text-blue-300';
        cityItem.style.cursor = 'pointer';
        
        // Build display text with state/prefecture if available
        let displayText = city.name;
        if (city.state) {
            displayText += `, ${city.state}`;
        }
        displayText += `, ${city.country || city.country_name || 'Unknown'}`;
        
        cityItem.textContent = displayText;
        
        // Add click handler with error handling
        cityItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('City clicked:', city);
            addCityToPlan(city);
        });
        
        // Also add pointer events to ensure it's clickable
        cityItem.style.pointerEvents = 'auto';
        
        cityListContainer.appendChild(cityItem);
    });
}

// Search cities using OpenStreetMap Nominatim API
async function searchCities(query) {
    if (!query || query.length < 2) {
        filteredCities = [];
        renderCityList();
        return;
    }
    
    console.log('searchCities called with query:', query);
    isLoadingCities = true;
    renderCityList();
    
    try {
        // Use Nominatim API - free, no API key required
        // Search for places, cities, towns, villages, municipalities, etc.
        // Removed featuretype restriction to get more comprehensive results
        const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&` +
            `format=json&` +
            `addressdetails=1&` +
            `limit=50&` + // Increased limit to get more results
            `extratags=1&` +
            `namedetails=1`; // Get more name information
        
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Travel-Logger-App/1.0' // Required by Nominatim
            }
        });
        
        if (!response.ok) {
            console.error('Response not OK:', response.status, response.statusText);
            throw new Error(`Failed to fetch cities: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Received data from Nominatim:', data.length, 'results');
        
        // Helper function to extract city name
        function extractCityName(place) {
            const address = place.address || {};
            const placeType = place.class || '';
            const placeTypeDetail = place.type || '';
            
            // Try different fields to get the city name
            if (place.name) {
                // For administrative boundaries, sometimes we want the address city/town
                if (placeType === 'boundary' && placeTypeDetail === 'administrative') {
                    return address.city || address.town || address.municipality || place.name;
                }
                return place.name;
            }
            
            return address.city || 
                   address.town || 
                   address.village || 
                   address.municipality ||
                   address.county ||
                   address.state ||
                   place.display_name?.split(',')[0] ||
                   'Unknown';
        }
        
        // Helper function to extract country
        function extractCountry(address) {
            return address.country || 
                   address.country_code?.toUpperCase() || 
                   'Unknown';
        }
        
        // Helper function to extract state/prefecture/region
        function extractState(address) {
            // Different countries use different terms
            return address.state ||           // USA, Canada, Australia, etc.
                   address.region ||          // Some European countries
                   address.prefecture ||      // Japan
                   address.province ||        // Canada, China
                   address.district ||        // Some countries
                   address.county ||          // Some administrative divisions
                   null;                      // Return null if not available
        }
        
        // Transform Nominatim results to our format
        filteredCities = data
            .filter(place => {
                // Filter for places with coordinates and valid location types
                if (!place.lat || !place.lon) return false;
                
                const address = place.address || {};
                const placeType = place.class || '';
                const placeTypeDetail = place.type || '';
                
                // Accept cities, towns, villages, municipalities, administrative boundaries
                // But exclude very specific places like shops, restaurants, etc.
                const validTypes = [
                    'place', 'boundary', 'administrative'
                ];
                const validPlaceDetails = [
                    'city', 'town', 'village', 'municipality', 'administrative',
                    'suburb', 'city_block', 'neighbourhood', 'quarter', 'hamlet',
                    'locality', 'borough', 'state_district'
                ];
                
                // Accept if it's a valid place type
                if (validTypes.includes(placeType)) {
                    if (validPlaceDetails.includes(placeTypeDetail)) {
                        return true;
                    }
                }
                
                // Also accept if it has city/town/village in address
                if (address.city || address.town || address.village || address.municipality) {
                    return true;
                }
                
                return false;
            })
            .map(place => {
                const address = place.address || {};
                return {
                    name: extractCityName(place),
                    country: extractCountry(address),
                    state: extractState(address),
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lon),
                    display_name: place.display_name,
                    importance: parseFloat(place.importance || 0) // For sorting by relevance
                };
            })
            .filter((place, index, self) => {
                // Remove duplicates: same name, country, and very close coordinates
                // Keep the one with higher importance
                const isDuplicate = self.some((p, otherIndex) => {
                    if (index === otherIndex) return false;
                    
                    const sameNameAndCountry = 
                        p.name === place.name && 
                        p.country === place.country;
                    
                    if (!sameNameAndCountry) return false;
                    
                    // Check if coordinates are very close (within ~1km)
                    const latDiff = Math.abs(p.lat - place.lat);
                    const lngDiff = Math.abs(p.lng - place.lng);
                    const isSameLocation = latDiff < 0.01 && lngDiff < 0.01;
                    
                    // If same location and this one has lower importance, it's a duplicate
                    return isSameLocation && p.importance > place.importance;
                });
                
                return !isDuplicate;
            })
            .sort((a, b) => {
                // Sort by importance first (most relevant first), then alphabetically
                if (b.importance !== a.importance) {
                    return b.importance - a.importance;
                }
                return a.name.localeCompare(b.name);
            });
        
        // Ensure diversity: limit results per country to avoid one country dominating
        // This ensures users can see cities with the same name from different countries
        const maxPerCountry = 5; // Maximum results per country
        const countryCounts = {};
        const diverseResults = [];
        
        for (const city of filteredCities) {
            const countryKey = city.country || 'Unknown';
            const count = countryCounts[countryKey] || 0;
            
            if (count < maxPerCountry) {
                diverseResults.push(city);
                countryCounts[countryKey] = count + 1;
            }
            
            // Stop when we have enough results
            if (diverseResults.length >= 40) {
                break;
            }
        }
        
        filteredCities = diverseResults;
        console.log('Final filtered cities:', filteredCities.length);
        
    } catch (error) {
        console.error('Error searching cities:', error);
        filteredCities = [];
        const cityListContainer = document.getElementById('cityList');
        if (cityListContainer) {
            cityListContainer.innerHTML = `<div class="text-red-400 p-2 text-center">Error loading cities: ${error.message}. Please try again.</div>`;
        }
    } finally {
        isLoadingCities = false;
        renderCityList();
        console.log('Rendered city list with', filteredCities.length, 'cities');
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInputContainer = document.getElementById('searchInputContainer');
    const citySearch = document.getElementById('citySearch');
    const searchCursor = document.getElementById('searchCursor');

    searchBtn.addEventListener('click', () => {
        isSearching = !isSearching;
        if (isSearching) {
            searchInputContainer.classList.remove('hidden');
            citySearch.focus();
            searchCursor.style.display = 'block';
        } else {
            searchInputContainer.classList.add('hidden');
            citySearch.value = '';
            filteredCities = [];
            renderCityList();
            searchCursor.style.display = 'none';
        }
    });

    citySearch.addEventListener('input', (e) => {
        // Keep cursor visible when typing
        if (searchCursor) {
            searchCursor.style.display = 'block';
        }
        
        const query = e.target.value.trim();
        console.log('Search input:', query);
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Debounce API calls - wait 500ms after user stops typing
        searchTimeout = setTimeout(() => {
            if (query === '') {
                filteredCities = [];
                renderCityList();
            } else {
                console.log('Calling searchCities with:', query);
                searchCities(query);
            }
        }, 500);
    });
    
    // Also allow Enter key to trigger search immediately
    if (citySearch) {
        citySearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query && query.length >= 2) {
                    if (searchTimeout) {
                        clearTimeout(searchTimeout);
                    }
                    console.log('Enter pressed, searching:', query);
                    searchCities(query);
                }
            }
        });
    }

    citySearch.addEventListener('blur', () => {
        // Hide cursor when not focused
        if (citySearch.value === '') {
            searchCursor.style.display = 'none';
        }
    });
}

// Initialize plan area
function initializePlanArea() {
    // Plan area is managed through addCityToPlan and related functions
}

function addCityToPlan(city) {
    // Check if city is already in plan
    if (tripPlan.some(item => item.city.name === city.name)) {
        return;
    }

    // If this is the second city, show line type selection
    if (tripPlan.length > 0) {
        pendingLineType = tripPlan.length; // Index where the new city will be
        showLineTypeSelection();
    }

    tripPlan.push({
        city: city,
        images: [],
        text: '',
        lineType: tripPlan.length === 0 ? null : 'normal', // First city has no line
        lineColor: '#3b82f6',
        dbCityId: null, // Will be set when saved
        orderIndex: tripPlan.length
    });

    renderPlanArea();
    updateMap();
    
    // Auto-save (silently - don't show errors if localStorage succeeds)
    if (currentTripId) {
        setTimeout(async () => {
            try {
                await saveTrip();
            } catch (e) {
                // Silently handle - localStorage fallback should have saved it
                console.warn('Auto-save had issues, but localStorage should have saved:', e);
            }
        }, 500); // Small delay to allow UI to update
    }
}

function removeCityFromPlan(index) {
    tripPlan.splice(index, 1);
    // Reset line types
    tripPlan.forEach((item, idx) => {
        if (idx === 0) item.lineType = null;
        else if (!item.lineType) item.lineType = 'normal';
        item.orderIndex = idx; // Update order indices
    });
    renderPlanArea();
    updateMap();
    hideLineTypeSelection();
    
    // Auto-save
    if (currentTripId) {
        setTimeout(() => saveTrip(), 500);
    }
}

function moveCityUp(index) {
    if (index === 0) return;
    [tripPlan[index], tripPlan[index - 1]] = [tripPlan[index - 1], tripPlan[index]];
    // Update order indices
    tripPlan.forEach((item, idx) => item.orderIndex = idx);
    renderPlanArea();
    updateMap();
    
    // Auto-save
    if (currentTripId) {
        setTimeout(() => saveTrip(), 500);
    }
}

function moveCityDown(index) {
    if (index === tripPlan.length - 1) return;
    [tripPlan[index], tripPlan[index + 1]] = [tripPlan[index + 1], tripPlan[index]];
    // Update order indices
    tripPlan.forEach((item, idx) => item.orderIndex = idx);
    renderPlanArea();
    updateMap();
    
    // Auto-save
    if (currentTripId) {
        setTimeout(() => saveTrip(), 500);
    }
}

function renderPlanArea() {
    const planList = document.getElementById('planList');
    planList.innerHTML = '';

    if (tripPlan.length === 0) {
        planList.innerHTML = '<p class="text-gray-400 text-center mt-8">Select cities to build your trip</p>';
        return;
    }

    tripPlan.forEach((item, index) => {
        const planItem = document.createElement('div');
        planItem.className = 'bg-gray-600 rounded-lg p-4';
        
        planItem.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                    <h3 class="text-white font-bold text-lg">${item.city.name}${item.city.state ? ', ' + item.city.state : ''}, ${item.city.country}</h3>
                    <div class="flex gap-2 mt-2">
                        <button class="move-up-btn bg-blue-400 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition" 
                                data-index="${index}" ${index === 0 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''}>
                            ↑
                        </button>
                        <button class="move-down-btn bg-blue-400 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition" 
                                data-index="${index}" ${index === tripPlan.length - 1 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''}>
                            ↓
                        </button>
                        <button class="delete-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition" 
                                data-index="${index}">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
            <div class="mt-3">
                <label class="text-white text-sm mb-1 block">Notes:</label>
                <textarea class="city-notes w-full bg-gray-700 text-white p-2 rounded" 
                          data-index="${index}" 
                          placeholder="Add notes about this place...">${item.text}</textarea>
            </div>
            <div class="mt-3">
                <label class="text-white text-sm mb-1 block">Images:</label>
                <input type="file" class="city-image-input" data-index="${index}" accept="image/*" multiple>
                <div class="image-preview-container mt-2 flex flex-wrap gap-2" data-index="${index}">
                    ${item.images.map((img, imgIdx) => `
                        <div class="relative">
                            <img src="${img}" alt="Preview" class="w-20 h-20 object-cover rounded">
                            <button class="remove-image absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs" 
                                    data-city-index="${index}" data-img-index="${imgIdx}">×</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        planList.appendChild(planItem);
    });

    // Attach event listeners
    document.querySelectorAll('.move-up-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            moveCityUp(index);
        });
    });

    document.querySelectorAll('.move-down-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            moveCityDown(index);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeCityFromPlan(index);
        });
    });

    document.querySelectorAll('.city-notes').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            tripPlan[index].text = e.target.value;
            // Auto-save notes
            if (currentTripId) {
                clearTimeout(window.noteSaveTimeout);
                window.noteSaveTimeout = setTimeout(() => saveTrip(), 1000);
            }
        });
    });

    document.querySelectorAll('.city-image-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    tripPlan[index].images.push(event.target.result);
                    renderPlanArea();
                    // Auto-save images
                    if (currentTripId) {
                        setTimeout(() => saveTrip(), 500);
                    }
                };
                reader.readAsDataURL(file);
            });
        });
    });

    document.querySelectorAll('.remove-image').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cityIndex = parseInt(e.target.dataset.cityIndex);
            const imgIndex = parseInt(e.target.dataset.imgIndex);
            tripPlan[cityIndex].images.splice(imgIndex, 1);
            renderPlanArea();
            // Auto-save after removing image
            if (currentTripId) {
                setTimeout(() => saveTrip(), 500);
            }
        });
    });
}

// Initialize line type selection
function initializeLineTypeSelection() {
    const lineTypeBtns = document.querySelectorAll('.line-type-btn');
    const colorPickerContainer = document.getElementById('colorPickerContainer');
    const lineColorPicker = document.getElementById('lineColorPicker');

    lineTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lineType = btn.dataset.type;
            if (pendingLineType !== null && pendingLineType < tripPlan.length) {
                tripPlan[pendingLineType].lineType = lineType;
                tripPlan[pendingLineType].lineColor = lineColorPicker.value;
                
                // Show color picker only for normal lines, keep selection visible for normal
                if (lineType === 'normal') {
                    colorPickerContainer.classList.remove('hidden');
                    document.getElementById('doneLineTypeBtn').classList.remove('hidden');
                    // Don't hide selection yet, let user adjust color
                } else {
                    colorPickerContainer.classList.add('hidden');
                    document.getElementById('doneLineTypeBtn').classList.add('hidden');
                    updateMap();
                    hideLineTypeSelection();
                }
                updateMap();
            }
        });
    });

    lineColorPicker.addEventListener('change', (e) => {
        // Update color for the line being added if it's normal type
        if (pendingLineType !== null && pendingLineType < tripPlan.length && tripPlan[pendingLineType].lineType === 'normal') {
            tripPlan[pendingLineType].lineColor = e.target.value;
            updateMap();
            // Auto-save color change
            if (currentTripId) {
                setTimeout(() => saveTrip(), 500);
            }
        }
    });

    // Add done button for normal line type
    const doneButton = document.createElement('button');
    doneButton.textContent = 'Done';
    doneButton.className = 'mt-4 w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition hidden';
    doneButton.id = 'doneLineTypeBtn';
    doneButton.addEventListener('click', () => {
        hideLineTypeSelection();
    });
    document.getElementById('lineTypeContainer').appendChild(doneButton);
}

function showLineTypeSelection() {
    const lineTypeContainer = document.getElementById('lineTypeContainer');
    const noSelection = document.getElementById('noSelection');
    const colorPickerContainer = document.getElementById('colorPickerContainer');
    lineTypeContainer.classList.remove('hidden');
    noSelection.classList.add('hidden');
    colorPickerContainer.classList.add('hidden'); // Hide by default, show when normal is selected
}

function hideLineTypeSelection() {
    const lineTypeContainer = document.getElementById('lineTypeContainer');
    const noSelection = document.getElementById('noSelection');
    const colorPickerContainer = document.getElementById('colorPickerContainer');
    const doneButton = document.getElementById('doneLineTypeBtn');
    lineTypeContainer.classList.add('hidden');
    noSelection.classList.remove('hidden');
    colorPickerContainer.classList.add('hidden');
    doneButton.classList.add('hidden');
    pendingLineType = null;
}

// Initialize map
let map;
let routeLines = [];

function initializeMap() {
    map = L.map('map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Store map markers and labels for cleanup
let mapMarkers = [];
let mapLabels = [];

function updateMap() {
    // Clear existing lines, markers, and labels
    routeLines.forEach(line => map.removeLayer(line));
    routeLines = [];
    mapMarkers.forEach(marker => map.removeLayer(marker));
    mapMarkers = [];
    mapLabels.forEach(label => map.removeLayer(label));
    mapLabels = [];

    if (tripPlan.length === 0) {
        return;
    }

    // Show markers with persistent labels
    tripPlan.forEach((item, index) => {
        // Create flag icon
        const countryCode = getCountryCodeForMap(item.city.country);
        const flagEmoji = getFlagEmojiForMap(countryCode);
        
        // Create marker with flag
        const flagIcon = L.divIcon({
            className: 'flag-marker-edit',
            html: `<div class="flag-icon-edit" style="
                background: #3b82f6; 
                border: 2px solid white; 
                border-radius: 50%; 
                width: 32px; 
                height: 32px; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${flagEmoji}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });
        
        const marker = L.marker([item.city.lat, item.city.lng], { icon: flagIcon }).addTo(map);
        mapMarkers.push(marker);
        
        // Create popup with all info in blue rounded rectangle (matching view mode)
        const flagEmojiPopup = getFlagEmojiForMap(countryCode);
        
        let popupText = `<div class="city-popup-blue" style="
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 12px;
            padding: 16px;
            color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
            <h3 class="font-bold text-lg mb-2" style="color: white;">${escapeHtml(item.city.name)}`;
        
        if (item.city.state) {
            popupText += `, ${escapeHtml(item.city.state)}`;
        }
        popupText += `</h3>
            <p class="mb-3" style="color: rgba(255,255,255,0.9);">${escapeHtml(item.city.country)} ${flagEmojiPopup}</p>`;

        // Add notes if available
        if (item.text && item.text.trim()) {
            popupText += `<div class="mt-3 mb-3 p-2 bg-white bg-opacity-20 rounded" style="color: white;">
                <p class="text-sm">${escapeHtml(item.text)}</p>
            </div>`;
        }

        // Add images if available
        if (item.images && item.images.length > 0) {
            popupText += `<div class="mt-3 space-y-2">`;
            item.images.forEach((img, imgIndex) => {
                const imageId = `img_${index}_${imgIndex}_${Date.now()}`;
                popupText += `
                    <div class="image-popup">
                        <img data-image-src="${escapeHtml(img)}" src="${img}" alt="City image ${imgIndex + 1}" 
                             style="width: 100%; max-width: 250px; height: auto; cursor: pointer; border-radius: 8px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    </div>`;
            });
            popupText += `</div>`;
        }

        popupText += `</div>`;
        
        marker.bindPopup(popupText, {
            maxWidth: 350,
            className: 'custom-popup-blue-edit',
            closeButton: true,
            autoPan: true
        });
        
        // Attach image click handlers after popup is opened
        marker.on('popupopen', function() {
            setTimeout(() => {
                const popup = marker.getPopup();
                if (popup) {
                    const popupEl = popup.getElement();
                    if (popupEl) {
                        const images = popupEl.querySelectorAll('.image-popup img');
                        images.forEach(img => {
                            img.style.cursor = 'pointer';
                            img.addEventListener('click', function(e) {
                                e.stopPropagation();
                                const imageSrc = this.getAttribute('data-image-src') || this.src;
                                if (window.openImageModal) {
                                    window.openImageModal(imageSrc);
                                } else {
                                    // Fallback: open in new window
                                    window.open(imageSrc, '_blank');
                                }
                            });
                        });
                    }
                }
            }, 100);
        });
        
        // Add persistent label above marker showing: City, State, Country, Flag
        const labelText = `${item.city.name}${item.city.state ? ', ' + item.city.state : ''}, ${item.city.country} ${flagEmoji}`;
        
        const label = L.marker([item.city.lat + 0.02, item.city.lng], {
            icon: L.divIcon({
                className: 'city-label-persistent-edit',
                html: `<div style="
                    background: rgba(255, 255, 255, 0.98);
                    padding: 6px 10px;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 11px;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                    white-space: nowrap;
                    pointer-events: none;
                    color: #1e3a5f;
                    border: 2px solid #3b82f6;
                    max-width: 300px;
                    text-align: center;
                ">${escapeHtml(labelText)}</div>`,
                iconSize: [250, 30],
                iconAnchor: [125, 15]
            }),
            zIndexOffset: 1000,
            interactive: false
        }).addTo(map);
        mapLabels.push(label);
        
        // Add info indicator if notes/images exist
        if ((item.text && item.text.trim()) || (item.images && item.images.length > 0)) {
            const hasNotes = item.text && item.text.trim();
            const indicatorText = `${hasNotes ? '📝' : ''}${item.images && item.images.length > 0 ? ' 📷' : ''}`;
            
            const indicator = L.marker([item.city.lat + 0.035, item.city.lng], {
                icon: L.divIcon({
                    className: 'city-info-indicator-edit',
                    html: `<div style="
                        background: rgba(59, 130, 246, 0.9);
                        padding: 3px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        pointer-events: none;
                        color: white;
                    ">${indicatorText}</div>`,
                    iconSize: [50, 20],
                    iconAnchor: [25, 10]
                }),
                zIndexOffset: 1001,
                interactive: false
            }).addTo(map);
            mapLabels.push(indicator);
        }
    });

    if (tripPlan.length < 2) {
        // Fit map to show all points
        if (tripPlan.length > 0) {
            const bounds = tripPlan.map(item => [item.city.lat, item.city.lng]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        return;
    }

    // Draw route lines
    for (let i = 0; i < tripPlan.length - 1; i++) {
        const from = tripPlan[i];
        const to = tripPlan[i + 1];
        
        if (!to.lineType) continue;

        const lineColor = to.lineColor || '#3b82f6';
        
        // Create polyline
        const polyline = L.polyline(
            [[from.city.lat, from.city.lng], [to.city.lat, to.city.lng]],
            {
                color: lineColor,
                weight: 4,
                opacity: 0.8
            }
        ).addTo(map);

        // Add dash pattern based on line type
        if (to.lineType === 'airplane') {
            polyline.setStyle({ dashArray: '10, 5' });
        } else if (to.lineType === 'car') {
            polyline.setStyle({ dashArray: '5, 5' });
        } else if (to.lineType === 'walking') {
            polyline.setStyle({ dashArray: '2, 3' });
        }

        routeLines.push(polyline);

        // Markers are already added above, just add routes
    }

    // Fit map to show all points
    if (tripPlan.length > 0) {
        const bounds = tripPlan.map(item => [item.city.lat, item.city.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Helper functions for map labels
function getCountryCodeForMap(country) {
    const mapping = {
        'United States': 'US', 'USA': 'US', 'United States of America': 'US',
        'Canada': 'CA',
        'United Kingdom': 'GB', 'UK': 'GB', 'Great Britain': 'GB',
        'France': 'FR',
        'Germany': 'DE',
        'Italy': 'IT',
        'Spain': 'ES',
        'Japan': 'JP',
        'China': 'CN',
        'South Korea': 'KR',
        'India': 'IN',
        'Australia': 'AU',
        'New Zealand': 'NZ',
        'Brazil': 'BR',
        'Mexico': 'MX',
        'Argentina': 'AR',
        'South Africa': 'ZA',
        'Egypt': 'EG',
        'United Arab Emirates': 'AE',
        'Turkey': 'TR',
        'Russia': 'RU',
        'Netherlands': 'NL',
        'Thailand': 'TH',
        'Singapore': 'SG'
    };
    return mapping[country] || country.substring(0, 2).toUpperCase();
}

function getFlagEmojiForMap(countryCode) {
    const flags = {
        'US': '🇺🇸', 'CA': '🇨🇦', 'GB': '🇬🇧', 'UK': '🇬🇧',
        'FR': '🇫🇷', 'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸',
        'JP': '🇯🇵', 'CN': '🇨🇳', 'KR': '🇰🇷', 'IN': '🇮🇳',
        'AU': '🇦🇺', 'NZ': '🇳🇿', 'BR': '🇧🇷', 'MX': '🇲🇽',
        'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪',
        'ZA': '🇿🇦', 'EG': '🇪🇬', 'AE': '🇦🇪', 'TR': '🇹🇷',
        'RU': '🇷🇺', 'NL': '🇳🇱', 'BE': '🇧🇪', 'SE': '🇸🇪',
        'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱',
        'GR': '🇬🇷', 'PT': '🇵🇹', 'IE': '🇮🇪', 'CH': '🇨🇭',
        'AT': '🇦🇹', 'CZ': '🇨🇿', 'HU': '🇭🇺', 'RO': '🇷🇴',
        'TH': '🇹🇭', 'VN': '🇻🇳', 'ID': '🇮🇩', 'MY': '🇲🇾',
        'PH': '🇵🇭', 'SG': '🇸🇬', 'HK': '🇭🇰', 'TW': '🇹🇼'
    };
    return flags[countryCode] || '🌍';
}

// Image modal function for viewing full-size images
window.openImageModal = function(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-screen p-4">
            <img src="${imageSrc}" alt="Full size" class="max-w-full max-h-screen rounded-lg" style="box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
            <button class="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-200" onclick="this.parentElement.parentElement.remove()">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

