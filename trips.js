// Trip Selection and Management Page

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Display username
    const usernameEl = document.getElementById('currentUsername');
    if (usernameEl) {
        usernameEl.textContent = `Welcome, ${currentUser.username}`;
    }

    // Load and display trips (make async)
    loadTripsAsync();

    // Event listeners
    const newTripBtn = document.getElementById('newTripBtn');
    const createFirstTripBtn = document.getElementById('createFirstTripBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const importTripBtn = document.getElementById('importTripBtn');
    const importFileInput = document.getElementById('importFileInput');

    if (newTripBtn) {
        newTripBtn.addEventListener('click', () => createNewTrip());
    }

    if (createFirstTripBtn) {
        createFirstTripBtn.addEventListener('click', () => createNewTrip());
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearCurrentUser();
            window.location.href = 'login.html';
        });
    }

    if (importTripBtn && importFileInput) {
        importTripBtn.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importTripFile(file);
            }
            // Reset input so same file can be selected again
            e.target.value = '';
        });
    }
});

async function loadTripsAsync() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
        // Check if db.getTripsByUserId is async (Supabase) or sync (localStorage)
        let trips;
        if (db.getTripsByUserId.constructor.name === 'AsyncFunction' || 
            typeof db.getTripsByUserId === 'function' && db.getTripsByUserId.constructor === (async () => {}).constructor) {
            trips = await db.getTripsByUserId(currentUser.id);
        } else {
            trips = db.getTripsByUserId(currentUser.id);
        }

        const tripsGrid = document.getElementById('tripsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!tripsGrid || !emptyState) return;

        tripsGrid.innerHTML = '';

        if (!trips || trips.length === 0) {
            tripsGrid.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            tripsGrid.classList.remove('hidden');
            emptyState.classList.add('hidden');

            trips.forEach(trip => {
                const tripCard = createTripCard(trip);
                tripsGrid.appendChild(tripCard);
            });
        }
    } catch (error) {
        console.error('Error loading trips:', error);
        alert('Error loading trips. Please check your Supabase connection.');
    }
}

// Keep sync version for backward compatibility
function loadTrips() {
    loadTripsAsync();
}

function createTripCard(trip) {
    const card = document.createElement('div');
    card.className = 'trip-card bg-white rounded-lg shadow-md p-6 cursor-pointer border border-gray-200';
    
    // Get trip cities count (async-safe)
    let cityCount = 0;
    try {
        // Check if async
        const citiesResult = db.getCitiesByTripId(trip.id);
        if (citiesResult instanceof Promise) {
            citiesResult.then(cities => {
                cityCount = cities.length;
                updateCityCount(card, cityCount);
            }).catch(() => {
                cityCount = 0;
            });
        } else {
            cityCount = citiesResult.length;
        }
    } catch (error) {
        cityCount = 0;
    }

    card.innerHTML = `
        <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-xl font-bold text-gray-800">${escapeHtml(trip.name)}</h3>
                <button class="delete-trip-btn text-red-500 hover:text-red-700 p-1" data-trip-id="${trip.id}" onclick="event.stopPropagation();">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <p class="text-sm text-gray-500 city-count">Loading...</p>
            ${trip.description ? `<p class="text-gray-600 text-sm mt-2">${escapeHtml(trip.description)}</p>` : ''}
            <p class="text-xs text-gray-400 mt-2">Created: ${new Date(trip.created_at).toLocaleDateString()}</p>
        </div>
        <div class="flex gap-2 mt-4">
            <button class="view-trip-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex-1" data-trip-id="${trip.id}" onclick="event.stopPropagation();">
                View Map
            </button>
            <button class="edit-trip-btn bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex-1" data-trip-id="${trip.id}" onclick="event.stopPropagation();">
                Edit
            </button>
        </div>
    `;

    // View button - opens view page
    const viewBtn = card.querySelector('.view-trip-btn');
    if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `view.html?trip=${trip.id}`;
        });
    }

    // Edit button - opens edit page
    const editBtn = card.querySelector('.edit-trip-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `index.html?trip=${trip.id}`;
        });
    }

    // Clicking card itself also opens edit mode
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-trip-btn') && 
            !e.target.closest('.view-trip-btn') && 
            !e.target.closest('.edit-trip-btn')) {
            window.location.href = `index.html?trip=${trip.id}`;
        }
    });

    // Delete trip handler
    const deleteBtn = card.querySelector('.delete-trip-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${trip.name}"?`)) {
                try {
                    // Check if async
                    const deleteResult = db.deleteTrip(trip.id);
                    if (deleteResult instanceof Promise) {
                        await deleteResult;
                    }
                    loadTripsAsync();
                } catch (error) {
                    console.error('Error deleting trip:', error);
                    alert('Error deleting trip. Please check your Supabase connection.');
                }
            }
        });
    }

    return card;
}

async function createNewTrip() {
    const tripName = prompt('Enter trip name:');
    if (!tripName || !tripName.trim()) return;

    const tripDescription = prompt('Enter trip description (optional):') || '';
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Check if db.createTrip is async
        let newTrip;
        if (db.createTrip.constructor.name === 'AsyncFunction' || 
            typeof db.createTrip === 'function' && db.createTrip.constructor === (async () => {}).constructor) {
            newTrip = await db.createTrip(currentUser.id, tripName.trim(), tripDescription.trim());
        } else {
            newTrip = db.createTrip(currentUser.id, tripName.trim(), tripDescription.trim());
        }
        window.location.href = `index.html?trip=${newTrip.id}`;
    } catch (error) {
        console.error('Error creating trip:', error);
        alert('Error creating trip. Please check your Supabase connection.');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateCityCount(card, count) {
    const countEl = card.querySelector('.city-count');
    if (countEl) {
        countEl.textContent = `${count} ${count === 1 ? 'city' : 'cities'}`;
    }
}

function importTripFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const tripData = JSON.parse(e.target.result);
            
            if (!tripData.trip) {
                alert('Invalid trip file. Missing trip information.');
                return;
            }

            const currentUser = getCurrentUser();
            if (!currentUser) {
                window.location.href = 'login.html';
                return;
            }

            // Confirm import
            const confirmMsg = `Import trip "${tripData.trip.name}"?\n\nThis will create a new trip with all cities, routes, and images.`;
            if (!confirm(confirmMsg)) {
                return;
            }

            // Create new trip for current user
            const newTrip = db.createTrip(
                currentUser.id,
                tripData.trip.name || 'Imported Trip',
                tripData.trip.description || ''
            );

            // Import cities
            if (tripData.cities && Array.isArray(tripData.cities)) {
                tripData.cities.forEach((city, index) => {
                    const importedCity = db.addCityToTrip(
                        newTrip.id,
                        {
                            name: city.city_name,
                            state: city.state || null,
                            country: city.country,
                            lat: city.latitude,
                            lng: city.longitude,
                            display_name: city.display_name || null
                        },
                        city.order_index !== undefined ? city.order_index : index
                    );

                    // Import notes
                    if (city.notes) {
                        db.updateCity(importedCity.id, { notes: city.notes });
                    }

                    // Import images
                    if (tripData.images && Array.isArray(tripData.images)) {
                        const cityImages = tripData.images.filter(img => img.trip_city_id === city.id);
                        cityImages.forEach(img => {
                            db.addImage(
                                importedCity.id,
                                img.image_data,
                                img.image_type || 'base64',
                                img.caption || ''
                            );
                        });
                    }

                    // Store city ID mapping for routes
                    city._imported_id = importedCity.id;
                });
            }

            // Import routes
            if (tripData.routes && Array.isArray(tripData.routes)) {
                // Create mapping from old city IDs to new city IDs
                const cityIdMap = {};
                tripData.cities.forEach((oldCity, index) => {
                    if (oldCity._imported_id) {
                        cityIdMap[oldCity.id] = oldCity._imported_id;
                    }
                });

                tripData.routes.forEach(route => {
                    const fromCityId = cityIdMap[route.from_city_id];
                    const toCityId = cityIdMap[route.to_city_id];
                    
                    if (fromCityId && toCityId) {
                        db.addRoute(
                            newTrip.id,
                            fromCityId,
                            toCityId,
                            route.line_type || 'normal',
                            route.line_color || '#3b82f6'
                        );
                    }
                });
            }

            // Import flags
            if (tripData.flags && Array.isArray(tripData.flags)) {
                tripData.flags.forEach(flag => {
                    db.addFlag(
                        newTrip.id,
                        flag.flag_type,
                        flag.flag_value || null
                    );
                });
            }

            alert(`Trip "${newTrip.name}" imported successfully!`);
            loadTrips(); // Refresh the trip list
            
            // Optionally open the imported trip
            if (confirm('Would you like to view the imported trip now?')) {
                window.location.href = `view.html?trip=${newTrip.id}`;
            }
        } catch (error) {
            console.error('Error importing trip:', error);
            alert('Error importing trip file. Please make sure it\'s a valid JSON file.');
        }
    };

    reader.onerror = function() {
        alert('Error reading file. Please try again.');
    };

    reader.readAsText(file);
}

