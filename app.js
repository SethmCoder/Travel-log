// Application state
let tripPlan = [];
let filteredCities = [];
let isSearching = false;
let pendingLineType = null; // Store which connection needs a line type
let searchTimeout = null;
let isLoadingCities = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeCityList();
    initializeSearch();
    initializePlanArea();
    initializeLineTypeSelection();
    initializeMap();
});

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
        cityItem.className = 'city-list-item text-white p-2 rounded cursor-pointer transition';
        
        // Build display text with state/prefecture if available
        let displayText = city.name;
        if (city.state) {
            displayText += `, ${city.state}`;
        }
        displayText += `, ${city.country || city.country_name || 'Unknown'}`;
        
        cityItem.textContent = displayText;
        cityItem.addEventListener('click', () => addCityToPlan(city));
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
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Travel-Logger-App/1.0' // Required by Nominatim
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch cities');
        }
        
        const data = await response.json();
        
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
        
    } catch (error) {
        console.error('Error searching cities:', error);
        filteredCities = [];
        const cityListContainer = document.getElementById('cityList');
        cityListContainer.innerHTML = '<div class="text-red-400 p-2 text-center">Error loading cities. Please try again.</div>';
    } finally {
        isLoadingCities = false;
        renderCityList();
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
        searchCursor.style.display = 'block';
        
        const query = e.target.value.trim();
        
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
                searchCities(query);
            }
        }, 500);
    });

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
        lineColor: '#3b82f6'
    });

    renderPlanArea();
    updateMap();
}

function removeCityFromPlan(index) {
    tripPlan.splice(index, 1);
    // Reset line types
    tripPlan.forEach((item, idx) => {
        if (idx === 0) item.lineType = null;
        else if (!item.lineType) item.lineType = 'normal';
    });
    renderPlanArea();
    updateMap();
    hideLineTypeSelection();
}

function moveCityUp(index) {
    if (index === 0) return;
    [tripPlan[index], tripPlan[index - 1]] = [tripPlan[index - 1], tripPlan[index]];
    renderPlanArea();
    updateMap();
}

function moveCityDown(index) {
    if (index === tripPlan.length - 1) return;
    [tripPlan[index], tripPlan[index + 1]] = [tripPlan[index + 1], tripPlan[index]];
    renderPlanArea();
    updateMap();
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

function updateMap() {
    // Clear existing lines
    routeLines.forEach(line => map.removeLayer(line));
    routeLines = [];

    if (tripPlan.length < 2) {
        // Just show markers
        tripPlan.forEach((item, index) => {
            let popupText = `<b>${item.city.name}</b>`;
            if (item.city.state) {
                popupText += `, ${item.city.state}`;
            }
            popupText += `<br>${item.city.country}`;
            const marker = L.marker([item.city.lat, item.city.lng])
                .addTo(map)
                .bindPopup(popupText);
        });
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

        // Add markers
        if (i === 0) {
            let fromPopupText = `<b>${from.city.name}</b>`;
            if (from.city.state) {
                fromPopupText += `, ${from.city.state}`;
            }
            fromPopupText += `<br>${from.city.country}`;
            L.marker([from.city.lat, from.city.lng])
                .addTo(map)
                .bindPopup(fromPopupText);
        }
        let toPopupText = `<b>${to.city.name}</b>`;
        if (to.city.state) {
            toPopupText += `, ${to.city.state}`;
        }
        toPopupText += `<br>${to.city.country}`;
        L.marker([to.city.lat, to.city.lng])
            .addTo(map)
            .bindPopup(toPopupText);
    }

    // Fit map to show all points
    if (tripPlan.length > 0) {
        const bounds = tripPlan.map(item => [item.city.lat, item.city.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

