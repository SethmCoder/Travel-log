// Trip Viewer - Standalone app for viewing travel trips
// Can load JSON files from Travel Logger or login to Supabase to view trips

// Supabase Configuration (same as main app)
const SUPABASE_URL = 'https://qducbibqkclfuxtpjsnx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNiaWJxa2NsZnV4dHBqc254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2OTI0MzcsImV4cCI6MjA3OTI2ODQzN30.YSdxHLY94pvvCvLv3HsKtSTaOXS4ei_KNKq7aP-3RtU';

// Initialize Supabase client
let supabase = null;
let currentUser = null;
let currentTripData = null;
let map = null;
let markers = [];
let routeLines = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeSupabase();
    setupEventListeners();
});

// Initialize Supabase
function initializeSupabase() {
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized for Trip Viewer');
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Main screen buttons
    const haveUsernameBtn = document.getElementById('haveUsernameBtn');
    const importFileBtn = document.getElementById('importFileBtn');
    const fileInput = document.getElementById('fileInput');
    
    // Login form buttons
    const loginBtn = document.getElementById('loginBtn');
    const createUsernameBtn = document.getElementById('createUsernameBtn');
    const backToMainBtn = document.getElementById('backToMainBtn');
    const usernameLoginForm = document.getElementById('usernameLoginForm');
    
    // Viewer screen buttons
    const backBtn = document.getElementById('backBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (haveUsernameBtn) {
        haveUsernameBtn.addEventListener('click', () => {
            if (usernameLoginForm) {
                usernameLoginForm.classList.remove('hidden');
            }
        });
    }
    
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', () => {
            if (usernameLoginForm) {
                usernameLoginForm.classList.add('hidden');
            }
            hideError();
        });
    }
    
    if (importFileBtn) {
        importFileBtn.addEventListener('click', () => {
            if (fileInput) {
                fileInput.click();
            }
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileImport);
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    if (createUsernameBtn) {
        createUsernameBtn.addEventListener('click', handleCreateUsername);
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showLoginScreen();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            showLoginScreen();
        });
    }
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
        showError('Please select a valid JSON file from Travel Logger');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const tripData = JSON.parse(e.target.result);
            currentTripData = tripData;
            currentUser = null; // No user for file-based trips
            displayTrip(tripData);
        } catch (error) {
            console.error('Error parsing JSON file:', error);
            showError('Invalid trip file. Please ensure it\'s a valid Travel Logger export file.');
        }
    };
    reader.readAsText(file);
}

// Handle login
async function handleLogin() {
    const usernameInput = document.getElementById('usernameInput');
    if (!usernameInput) return;
    
    const username = usernameInput.value.trim();
    if (!username) {
        showError('Please enter a username');
        return;
    }
    
    hideError();
    
    try {
        if (!supabase) {
            showError('Supabase connection unavailable. Please use Import Trip File instead.');
            return;
        }
        
        // Check if user exists in Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                showError('Username not found. Please create a new username or use Import Trip File.');
            } else {
                showError('Error checking username: ' + error.message);
            }
            return;
        }
        
        if (!user) {
            showError('Username not found. Please create a new username.');
            return;
        }
        
        // User exists, load their trips
        currentUser = user;
        await loadUserTrips(user.id);
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed: ' + error.message);
    }
}

// Handle create username
async function handleCreateUsername() {
    const usernameInput = document.getElementById('usernameInput');
    if (!usernameInput) return;
    
    const username = usernameInput.value.trim();
    if (!username) {
        showError('Please enter a username');
        return;
    }
    
    hideError();
    
    try {
        if (!supabase) {
            showError('Supabase connection unavailable. Cannot create username without Supabase.');
            return;
        }
        
        // Check if username already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (existingUser) {
            showError('Username already exists. Please choose a different username.');
            return;
        }
        
        // Create new user - IMMEDIATELY send to Supabase
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                username: username,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) {
            showError('Error creating username: ' + error.message);
            return;
        }
        
        // Success - user created immediately in Supabase
        currentUser = newUser;
        await loadUserTrips(newUser.id);
        
    } catch (error) {
        console.error('Create username error:', error);
        showError('Failed to create username: ' + error.message);
    }
}

// Load user trips from Supabase
async function loadUserTrips(userId) {
    try {
        if (!supabase) {
            showError('Supabase connection unavailable');
            return;
        }
        
        // Get user's trips
        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (tripsError) {
            showError('Error loading trips: ' + tripsError.message);
            return;
        }
        
        if (!trips || trips.length === 0) {
            showError('No trips found for this user. Create a trip in Travel Logger first.');
            return;
        }
        
        // For now, show the first trip. Later can add trip selection UI
        const tripId = trips[0].id;
        
        // Load full trip data
        const tripData = await loadTripDataFromSupabase(tripId);
        if (tripData) {
            currentTripData = tripData;
            displayTrip(tripData);
        }
        
    } catch (error) {
        console.error('Error loading trips:', error);
        showError('Failed to load trips: ' + error.message);
    }
}

// Load trip data from Supabase
async function loadTripDataFromSupabase(tripId) {
    try {
        if (!supabase) return null;
        
        // Get trip
        const { data: trip, error: tripError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();
        
        if (tripError || !trip) return null;
        
        // Get cities
        const { data: cities } = await supabase
            .from('trip_cities')
            .select('*')
            .eq('trip_id', tripId)
            .order('order_index', { ascending: true });
        
        // Get routes
        const { data: routes } = await supabase
            .from('trip_routes')
            .select('*')
            .eq('trip_id', tripId);
        
        // Get images
        const cityIds = cities ? cities.map(c => c.id) : [];
        const { data: images } = cityIds.length > 0 ? await supabase
            .from('trip_images')
            .select('*')
            .in('trip_city_id', cityIds) : { data: [] };
        
        // Get flags
        const { data: flags } = await supabase
            .from('trip_flags')
            .select('*')
            .eq('trip_id', tripId);
        
        return {
            trip: trip,
            cities: cities || [],
            routes: routes || [],
            images: images || [],
            flags: flags || []
        };
        
    } catch (error) {
        console.error('Error loading trip data:', error);
        return null;
    }
}

// Display trip on map
function displayTrip(tripData) {
    if (!tripData || !tripData.trip || !tripData.cities) {
        showError('Invalid trip data');
        return;
    }
    
    // Hide login screen, show viewer
    const loginScreen = document.getElementById('loginScreen');
    const tripViewer = document.getElementById('tripViewer');
    const tripTitle = document.getElementById('tripTitle');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (tripViewer) tripViewer.classList.remove('hidden');
    if (tripTitle) tripTitle.textContent = tripData.trip.name || 'Trip Viewer';
    
    if (currentUser && usernameDisplay) {
        usernameDisplay.textContent = `Logged in as: ${currentUser.username}`;
    } else if (usernameDisplay) {
        usernameDisplay.textContent = 'Viewing from file';
    }
    
    // Initialize map if not already done
    if (!map) {
        map = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
    }
    
    // Clear existing markers and routes
    markers.forEach(m => map.removeLayer(m));
    routeLines.forEach(l => map.removeLayer(l));
    markers = [];
    routeLines = [];
    
    // Create city map for quick lookup
    const cityMap = {};
    tripData.cities.forEach(city => {
        cityMap[city.id] = city;
    });
    
    // Add markers with flags and labels
    tripData.cities.forEach((city) => {
        const cityImages = tripData.images ? tripData.images.filter(img => img.trip_city_id === city.id) : [];
        
        // Create flag icon
        const flagIcon = createFlagIcon(city.country);
        const marker = L.marker([city.latitude, city.longitude], { 
            icon: flagIcon 
        }).addTo(map);
        
        markers.push(marker);
        
        // Create popup with blue background
        let popupContent = `<div class="city-popup-blue" style="
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 12px;
            padding: 16px;
            color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
            <h3 class="font-bold text-lg mb-2" style="color: white;">${escapeHtml(city.city_name)}`;
        
        if (city.state) {
            popupContent += `, ${escapeHtml(city.state)}`;
        }
        popupContent += `</h3>
            <p class="mb-3" style="color: rgba(255,255,255,0.9);">${escapeHtml(city.country)}</p>`;
        
        // Add notes if available
        if (city.notes && city.notes.trim()) {
            popupContent += `<div class="mt-3 mb-3 p-2 bg-white bg-opacity-20 rounded" style="color: white;">
                <p class="text-sm">${escapeHtml(city.notes)}</p>
            </div>`;
        }
        
        // Add images if available
        if (cityImages.length > 0) {
            popupContent += `<div class="mt-3 space-y-2">`;
            cityImages.forEach((img, imgIndex) => {
                if (img.image_type === 'base64' || img.image_data) {
                    popupContent += `
                        <div class="image-popup">
                            <img data-image-src="${escapeHtml(img.image_data)}" src="${img.image_data}" alt="${escapeHtml(img.caption || 'Image')}" 
                                 style="width: 100%; max-width: 250px; height: auto; cursor: pointer; border-radius: 8px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                            ${img.caption ? `<p class="text-xs mt-1" style="color: rgba(255,255,255,0.8);">${escapeHtml(img.caption)}</p>` : ''}
                        </div>`;
                }
            });
            popupContent += `</div>`;
        }
        
        popupContent += `</div>`;
        
        marker.bindPopup(popupContent, {
            maxWidth: 350,
            className: 'custom-popup-blue',
            closeButton: true,
            autoPan: true
        });
        
        // Add image click handlers
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
                                openImageModal(imageSrc);
                            });
                        });
                    }
                }
            }, 100);
        });
        
        // Add persistent label above marker
        const flagEmoji = getFlagEmoji(getCountryCode(city.country));
        const labelText = `${city.city_name}${city.state ? ', ' + city.state : ''}, ${city.country} ${flagEmoji}`;
        
        const label = L.marker([city.latitude + 0.02, city.longitude], {
            icon: L.divIcon({
                className: 'city-label-persistent',
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
        markers.push(label);
        
        // Add info indicator if notes/images exist
        if ((city.notes && city.notes.trim()) || cityImages.length > 0) {
            const hasNotes = city.notes && city.notes.trim();
            const indicatorText = `${hasNotes ? '📝' : ''}${cityImages.length > 0 ? ' 📷' : ''}`;
            
            const indicator = L.marker([city.latitude + 0.035, city.longitude], {
                icon: L.divIcon({
                    className: 'city-info-indicator',
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
            markers.push(indicator);
        }
    });
    
    // Draw routes with arrows, emojis, and labels
    if (tripData.routes) {
        tripData.routes.forEach(route => {
            const fromCity = cityMap[route.from_city_id];
            const toCity = cityMap[route.to_city_id];
            
            if (!fromCity || !toCity) return;
            
            // Draw route line (BLUE, not white)
            const polyline = L.polyline(
                [[fromCity.latitude, fromCity.longitude], [toCity.latitude, toCity.longitude]],
                {
                    color: route.line_color || '#3b82f6', // Blue color
                    weight: 4,
                    opacity: 0.8
                }
            ).addTo(map);
            
            // Add dash pattern based on line type
            if (route.line_type === 'airplane') {
                polyline.setStyle({ dashArray: '10, 5' });
            } else if (route.line_type === 'car') {
                polyline.setStyle({ dashArray: '5, 5' });
            } else if (route.line_type === 'walking') {
                polyline.setStyle({ dashArray: '2, 3' });
            }
            
            routeLines.push(polyline);
            
            // Add arrow, emoji, and label (code from view.js)
            const midpoint = [
                (fromCity.latitude + toCity.latitude) / 2,
                (fromCity.longitude + toCity.longitude) / 2
            ];
            
            const bearing = calculateBearing(
                fromCity.latitude, fromCity.longitude,
                toCity.latitude, toCity.longitude
            );
            
            // Add arrow
            const arrowIcon = L.divIcon({
                className: 'route-arrow',
                html: `<div style="
                    transform: rotate(${bearing}deg);
                    font-size: 24px;
                    color: ${route.line_color || '#3b82f6'};
                    font-weight: bold;
                    text-shadow: 2px 2px 4px rgba(255,255,255,0.8);
                    pointer-events: none;
                ">➤</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            L.marker(midpoint, { icon: arrowIcon, zIndexOffset: 500, interactive: false }).addTo(map);
            
            // Add emoji
            const emoji = getTransportEmoji(route.line_type);
            const emojiLat = midpoint[0] + 0.06;
            const emojiLng = midpoint[1] + 0.03;
            
            const emojiIcon = L.divIcon({
                className: 'route-emoji',
                html: `<div style="
                    font-size: 28px; 
                    background: white; 
                    border-radius: 50%; 
                    width: 40px; 
                    height: 40px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    border: 2px solid ${route.line_color || '#3b82f6'};
                    pointer-events: none;
                ">${emoji}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            L.marker([emojiLat, emojiLng], { icon: emojiIcon, zIndexOffset: 600, interactive: false }).addTo(map);
            
            // Add label
            const labelText = `${fromCity.city_name}${fromCity.state ? ', ' + fromCity.state : ''}, ${fromCity.country} > ${toCity.city_name}${toCity.state ? ', ' + toCity.state : ''}, ${toCity.country}`;
            const transportText = getTransportText(route.line_type);
            
            const labelIcon = L.divIcon({
                className: 'route-label',
                html: `<div style="
                    background: rgba(255, 255, 255, 0.95);
                    padding: 8px 12px;
                    border-radius: 8px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                    text-align: center;
                    pointer-events: none;
                    border: 2px solid ${route.line_color || '#3b82f6'};
                    min-width: 250px;
                ">
                    <div style="font-size: 13px; font-weight: bold; color: #1e3a5f; margin-bottom: 3px;">
                        ${escapeHtml(labelText)}
                    </div>
                    <div style="font-size: 11px; color: #4b5563; font-weight: 600;">
                        ${escapeHtml(transportText)}
                    </div>
                </div>`,
                iconSize: [300, 50],
                iconAnchor: [150, 25]
            });
            
            const labelLat = midpoint[0] + 0.1;
            const labelLng = midpoint[1];
            
            L.marker([labelLat, labelLng], { icon: labelIcon, zIndexOffset: 400, interactive: false }).addTo(map);
        });
    }
    
    // Fit map to show all points
    if (tripData.cities.length > 0) {
        const bounds = tripData.cities.map(city => [city.latitude, city.longitude]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Helper functions (copied from view.js)
function createFlagIcon(country) {
    const countryCode = getCountryCode(country);
    const flagEmoji = getFlagEmoji(countryCode);
    
    return L.divIcon({
        className: 'flag-marker',
        html: `<div style="
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
}

function getCountryCode(country) {
    const mapping = {
        'United States': 'US', 'USA': 'US', 'United States of America': 'US',
        'Canada': 'CA', 'United Kingdom': 'GB', 'UK': 'GB',
        'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES',
        'Japan': 'JP', 'China': 'CN', 'South Korea': 'KR', 'India': 'IN',
        'Australia': 'AU', 'New Zealand': 'NZ', 'Brazil': 'BR', 'Mexico': 'MX'
    };
    return mapping[country] || country.substring(0, 2).toUpperCase();
}

function getFlagEmoji(countryCode) {
    const flags = {
        'US': '🇺🇸', 'CA': '🇨🇦', 'GB': '🇬🇧', 'UK': '🇬🇧',
        'FR': '🇫🇷', 'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸',
        'JP': '🇯🇵', 'CN': '🇨🇳', 'KR': '🇰🇷', 'IN': '🇮🇳',
        'AU': '🇦🇺', 'NZ': '🇳🇿', 'BR': '🇧🇷', 'MX': '🇲🇽'
    };
    return flags[countryCode] || '🌍';
}

function getTransportEmoji(lineType) {
    const emojis = {
        'airplane': '✈️',
        'car': '🚗',
        'walking': '🚶',
        'normal': '➜'
    };
    return emojis[lineType] || '➜';
}

function getTransportText(lineType) {
    const texts = {
        'airplane': 'Airplane',
        'car': 'Car',
        'walking': 'Walking',
        'normal': 'Normal Route'
    };
    return texts[lineType] || 'Route';
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    if (modal && modalImage) {
        modalImage.src = imageSrc;
        modal.style.display = 'block';
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show/hide screens
function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const tripViewer = document.getElementById('tripViewer');
    
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (tripViewer) tripViewer.classList.add('hidden');
    
    // Clear map
    if (map) {
        markers.forEach(m => map.removeLayer(m));
        routeLines.forEach(l => map.removeLayer(l));
        markers = [];
        routeLines = [];
    }
    
    currentTripData = null;
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideError() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

// Close modal when clicking outside image
document.addEventListener('click', (e) => {
    const modal = document.getElementById('imageModal');
    if (modal && e.target === modal) {
        closeImageModal();
    }
});

