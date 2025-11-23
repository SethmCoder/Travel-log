// View-Only Trip Map with All Features

let map;
let routeLines = [];
let markers = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = parseInt(urlParams.get('trip'));
    
    if (!tripId) {
        window.location.href = 'trips.html';
        return;
    }

    // Load trip data asynchronously
    loadTripAsync(tripId);

    // Event listeners
    const backBtn = document.getElementById('backBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'trips.html';
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadTrip(tripId));
    }
});

function initializeMap() {
    map = L.map('map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
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

        // Set trip title
        const tripTitle = document.getElementById('tripTitle');
        if (tripTitle) {
            tripTitle.textContent = trip.name;
        }

        // Initialize map
        initializeMap();
        
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
        
        // Load the trip data on the map
        loadTripDataOnMap(trip, cities, routes, images);
    } catch (error) {
        console.error('Error loading trip:', error);
        alert('Error loading trip. Please check your Supabase connection.');
    }
}

function loadTripDataOnMap(trip, cities, routes, images) {

    if (cities.length === 0) {
        return;
    }

    // Create city map for quick lookup
    const cityMap = {};
    cities.forEach(city => {
        cityMap[city.id] = city;
    });

    // Add markers with names, flags, and images
    cities.forEach((city, index) => {
        const cityImages = images.filter(img => img.trip_city_id === city.id);
        
        // Create custom icon with flag
        const flagIcon = createFlagIcon(city.country);
        const marker = L.marker([city.latitude, city.longitude], { 
            icon: flagIcon 
        }).addTo(map);

        // Create popup with city name, state, country, notes, and images in blue rounded rectangle
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

        if (cityImages.length > 0) {
            popupContent += `<div class="mt-3 space-y-2">`;
            cityImages.forEach((img, imgIndex) => {
                if (img.image_type === 'base64') {
                    const imageId = `img_${city.id}_${imgIndex}_${Date.now()}`;
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
        
        // Attach image click handlers after popup is opened
        marker.on('popupopen', function() {
            // Find all images in the popup and attach click handlers
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
                                }
                            });
                        });
                    }
                }
            }, 100);
        });

        // Add persistent city label above the marker showing: City, State, Country, Flag
        const flagEmoji = getFlagEmoji(getCountryCode(city.country));
        const labelText = `${city.city_name}${city.state ? ', ' + city.state : ''}, ${city.country} ${flagEmoji}`;
        
        L.marker([city.latitude + 0.02, city.longitude], {
            icon: L.divIcon({
                className: 'city-label-persistent',
                html: `<div class="city-label-content" style="
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
        
        // Add additional label for notes/images indicator if they exist
        if ((city.notes && city.notes.trim()) || cityImages.length > 0) {
            const hasNotes = city.notes && city.notes.trim();
            const indicatorText = `${hasNotes ? '📝' : ''}${cityImages.length > 0 ? ' 📷' : ''}`;
            
            L.marker([city.latitude + 0.035, city.longitude], {
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
        }

        markers.push(marker);
    });

    // Draw routes with arrows, emojis, and labels
    routes.forEach(route => {
        const fromCity = cityMap[route.from_city_id];
        const toCity = cityMap[route.to_city_id];
        
        if (!fromCity || !toCity) return;

        // Draw route line
        const polyline = L.polyline(
            [[fromCity.latitude, fromCity.longitude], [toCity.latitude, toCity.longitude]],
            {
                color: route.line_color || '#3b82f6',
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

        // Add arrow marker at midpoint
        const midpoint = [
            (fromCity.latitude + toCity.latitude) / 2,
            (fromCity.longitude + toCity.longitude) / 2
        ];

        // Calculate bearing for arrow direction
        const bearing = calculateBearing(
            fromCity.latitude, fromCity.longitude,
            toCity.latitude, toCity.longitude
        );

        // Add arrow marker pointing in direction of travel
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

        // Add emoji for transportation type next to the label
        const emoji = getTransportEmoji(route.line_type);
        // Position emoji next to the label text
        const emojiOffset = 0.06;
        const emojiLat = midpoint[0] + emojiOffset;
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

        // Add route label with origin > destination and transportation type
        const labelText = `${fromCity.city_name}${fromCity.state ? ', ' + fromCity.state : ''}, ${fromCity.country} > ${toCity.city_name}${toCity.state ? ', ' + toCity.state : ''}, ${toCity.country}`;
        const transportText = getTransportText(route.line_type);
        
        const labelIcon = L.divIcon({
            className: 'route-label',
            html: `<div class="route-label-text" style="
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
            iconSize: [350, 50],
            iconAnchor: [175, 25]
        });

        // Position label above midpoint
        const labelOffset = 0.04;
        const labelLat = midpoint[0] + labelOffset;
        const labelLng = midpoint[1];
        
        L.marker([labelLat, labelLng], { icon: labelIcon, zIndexOffset: 700, interactive: false }).addTo(map);
    });

    // Fit map to show all points
    if (cities.length > 0) {
        const bounds = cities.map(city => [city.latitude, city.longitude]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function createFlagIcon(country) {
    // Use flag emoji or create custom icon
    // For now, using a simple colored circle with country code
    const countryCode = getCountryCode(country);
    const flagEmoji = getFlagEmoji(countryCode);
    
    return L.divIcon({
        className: 'flag-marker',
        html: `<div class="flag-icon" style="
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

function getFlagEmoji(countryCode) {
    // Map of common country codes to flag emojis
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

function getCountryCode(country) {
    // Simple mapping of country names to codes
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

function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

function getTransportEmoji(lineType) {
    const emojis = {
        'normal': '🚗',
        'airplane': '✈️',
        'car': '🚗',
        'walking': '🚶'
    };
    return emojis[lineType] || '🚗';
}

function getTransportText(lineType) {
    const texts = {
        'normal': 'Custom Route',
        'airplane': 'By Airplane',
        'car': 'By Car',
        'walking': 'Walking'
    };
    return texts[lineType] || 'Custom Route';
}

// Make openImageModal globally accessible
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

async function downloadTrip(tripId) {
    try {
        // Get trip - handle both sync and async
        let trip = db.getTripById(tripId);
        if (trip instanceof Promise) {
            trip = await trip;
        }
        if (!trip) return;

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
    } catch (error) {
        console.error('Error downloading trip:', error);
        alert('Error downloading trip. Please check your Supabase connection.');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add CSS for custom elements
const style = document.createElement('style');
style.textContent = `
    .city-label {
        background: transparent !important;
        border: none !important;
    }
    .city-name-label {
        pointer-events: none !important;
    }
    .route-arrow {
        background: transparent !important;
        border: none !important;
        pointer-events: none !important;
    }
    .route-emoji {
        background: transparent !important;
        border: none !important;
        pointer-events: none !important;
    }
    .route-label {
        background: transparent !important;
        border: none !important;
        pointer-events: none !important;
    }
    .custom-popup-blue .leaflet-popup-content-wrapper {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        border-radius: 12px !important;
    }
    .custom-popup-blue .leaflet-popup-content {
        margin: 0 !important;
        padding: 0 !important;
    }
    .custom-popup-blue .leaflet-popup-tip {
        background: #3b82f6 !important;
    }
    .image-popup {
        margin-top: 8px;
    }
    .city-popup-blue {
        min-width: 250px;
    }
`;
document.head.appendChild(style);

