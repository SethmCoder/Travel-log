// Sample city data with coordinates
const cities = [
    { name: "New York", country: "USA", lat: 40.7128, lng: -74.0060 },
    { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437 },
    { name: "Chicago", country: "USA", lat: 41.8781, lng: -87.6298 },
    { name: "Houston", country: "USA", lat: 29.7604, lng: -95.3698 },
    { name: "Phoenix", country: "USA", lat: 33.4484, lng: -112.0740 },
    { name: "Philadelphia", country: "USA", lat: 39.9526, lng: -75.1652 },
    { name: "San Antonio", country: "USA", lat: 29.4241, lng: -98.4936 },
    { name: "San Diego", country: "USA", lat: 32.7157, lng: -117.1611 },
    { name: "Dallas", country: "USA", lat: 32.7767, lng: -96.7970 },
    { name: "San Jose", country: "USA", lat: 37.3382, lng: -121.8863 },
    { name: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
    { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
    { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
    { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
    { name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050 },
    { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
    { name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038 },
    { name: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1734 },
    { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041 },
    { name: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738 },
    { name: "Prague", country: "Czech Republic", lat: 50.0755, lng: 14.4378 },
    { name: "Budapest", country: "Hungary", lat: 47.4979, lng: 19.0402 },
    { name: "Warsaw", country: "Poland", lat: 52.2297, lng: 21.0122 },
    { name: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686 },
    { name: "Copenhagen", country: "Denmark", lat: 55.6761, lng: 12.5683 },
    { name: "Oslo", country: "Norway", lat: 59.9139, lng: 10.7522 },
    { name: "Helsinki", country: "Finland", lat: 60.1699, lng: 24.9384 },
    { name: "Dublin", country: "Ireland", lat: 53.3498, lng: -6.2603 },
    { name: "Edinburgh", country: "UK", lat: 55.9533, lng: -3.1883 },
    { name: "Manchester", country: "UK", lat: 53.4808, lng: -2.2426 },
    { name: "Birmingham", country: "UK", lat: 52.4862, lng: -1.8904 },
    { name: "Glasgow", country: "UK", lat: 55.8642, lng: -4.2518 },
    { name: "Liverpool", country: "UK", lat: 53.4084, lng: -2.9916 },
    { name: "Bristol", country: "UK", lat: 51.4545, lng: -2.5879 },
    { name: "Leeds", country: "UK", lat: 53.8008, lng: -1.5491 },
    { name: "Sheffield", country: "UK", lat: 53.3811, lng: -1.4701 },
    { name: "Newcastle", country: "UK", lat: 54.9783, lng: -1.6178 },
    { name: "Nottingham", country: "UK", lat: 52.9548, lng: -1.1581 },
    { name: "Leicester", country: "UK", lat: 52.6369, lng: -1.1398 },
    { name: "Coventry", country: "UK", lat: 52.4068, lng: -1.5197 },
    { name: "Belfast", country: "UK", lat: 54.5973, lng: -5.9301 },
    { name: "Cardiff", country: "UK", lat: 51.4816, lng: -3.1791 },
    { name: "Brighton", country: "UK", lat: 50.8225, lng: -0.1372 },
    { name: "Oxford", country: "UK", lat: 51.7520, lng: -1.2577 },
    { name: "Cambridge", country: "UK", lat: 52.2053, lng: 0.1218 },
    { name: "York", country: "UK", lat: 53.9600, lng: -1.0873 },
    { name: "Bath", country: "UK", lat: 51.3758, lng: -2.3599 },
    { name: "Canterbury", country: "UK", lat: 51.2802, lng: 1.0789 },
    { name: "Stratford-upon-Avon", country: "UK", lat: 52.1923, lng: -1.7074 },
    { name: "Windsor", country: "UK", lat: 51.4839, lng: -0.6044 },
    { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777 },
    { name: "Delhi", country: "India", lat: 28.6139, lng: 77.2090 },
    { name: "Bangalore", country: "India", lat: 12.9716, lng: 77.5946 },
    { name: "Hyderabad", country: "India", lat: 17.3850, lng: 78.4867 },
    { name: "Chennai", country: "India", lat: 13.0827, lng: 80.2707 },
    { name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639 },
    { name: "Pune", country: "India", lat: 18.5204, lng: 73.8567 },
    { name: "Ahmedabad", country: "India", lat: 23.0225, lng: 72.5714 },
    { name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074 },
    { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737 },
    { name: "Hong Kong", country: "China", lat: 22.3193, lng: 114.1694 },
    { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
    { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
    { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
    { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784 },
    { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357 },
    { name: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473 },
    { name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241 },
    { name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333 },
    { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729 },
    { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816 },
    { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332 },
    { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
    { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207 },
    { name: "Montreal", country: "Canada", lat: 45.5017, lng: -73.5673 },
    { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780 },
    { name: "Busan", country: "South Korea", lat: 35.1796, lng: 129.0756 },
    { name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631 },
    { name: "Brisbane", country: "Australia", lat: -27.4698, lng: 153.0251 },
    { name: "Perth", country: "Australia", lat: -31.9505, lng: 115.8605 },
    { name: "Auckland", country: "New Zealand", lat: -36.8485, lng: 174.7633 },
    { name: "Wellington", country: "New Zealand", lat: -41.2865, lng: 174.7762 }
].sort((a, b) => a.name.localeCompare(b.name));

// Application state
let tripPlan = [];
let filteredCities = [...cities];
let isSearching = false;
let pendingLineType = null; // Store which connection needs a line type

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
    const cityListContainer = document.getElementById('cityList');
    renderCityList();
}

function renderCityList() {
    const cityListContainer = document.getElementById('cityList');
    cityListContainer.innerHTML = '';
    
    filteredCities.forEach(city => {
        const cityItem = document.createElement('div');
        cityItem.className = 'city-list-item text-white p-2 rounded cursor-pointer transition';
        cityItem.textContent = `${city.name}, ${city.country}`;
        cityItem.addEventListener('click', () => addCityToPlan(city));
        cityListContainer.appendChild(cityItem);
    });
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
            filteredCities = [...cities];
            renderCityList();
            searchCursor.style.display = 'none';
        }
    });

    citySearch.addEventListener('input', (e) => {
        // Keep cursor visible when typing
        searchCursor.style.display = 'block';
        
        const query = e.target.value.toLowerCase();
        if (query === '') {
            filteredCities = [...cities];
        } else {
            filteredCities = cities.filter(city => 
                city.name.toLowerCase().includes(query) || 
                city.country.toLowerCase().includes(query)
            );
        }
        renderCityList();
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
                    <h3 class="text-white font-bold text-lg">${item.city.name}, ${item.country}</h3>
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
            const marker = L.marker([item.city.lat, item.city.lng])
                .addTo(map)
                .bindPopup(`<b>${item.city.name}</b><br>${item.city.country}`);
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
            L.marker([from.city.lat, from.city.lng])
                .addTo(map)
                .bindPopup(`<b>${from.city.name}</b><br>${from.city.country}`);
        }
        L.marker([to.city.lat, to.city.lng])
            .addTo(map)
            .bindPopup(`<b>${to.city.name}</b><br>${to.city.country}`);
    }

    // Fit map to show all points
    if (tripPlan.length > 0) {
        const bounds = tripPlan.map(item => [item.city.lat, item.city.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

