// Authentication and User Management
// Connects to localStorage-based database matching schema

class Database {
    constructor() {
        this.init();
    }

    init() {
        // Initialize database structure in localStorage
        if (!localStorage.getItem('travel_logger_users')) {
            localStorage.setItem('travel_logger_users', JSON.stringify([]));
        }
        if (!localStorage.getItem('travel_logger_trips')) {
            localStorage.setItem('travel_logger_trips', JSON.stringify([]));
        }
        if (!localStorage.getItem('travel_logger_trip_cities')) {
            localStorage.setItem('travel_logger_trip_cities', JSON.stringify([]));
        }
        if (!localStorage.getItem('travel_logger_trip_routes')) {
            localStorage.setItem('travel_logger_trip_routes', JSON.stringify([]));
        }
        if (!localStorage.getItem('travel_logger_trip_images')) {
            localStorage.setItem('travel_logger_trip_images', JSON.stringify([]));
        }
        if (!localStorage.getItem('travel_logger_trip_flags')) {
            localStorage.setItem('travel_logger_trip_flags', JSON.stringify([]));
        }
    }

    // User management
    createUser(username) {
        const users = this.getUsers();
        // Check if user exists
        if (users.find(u => u.username === username)) {
            return { success: true, user: users.find(u => u.username === username) };
        }
        
        const newUser = {
            id: this.getNextId('users'),
            username: username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('travel_logger_users', JSON.stringify(users));
        return { success: true, user: newUser };
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('travel_logger_users') || '[]');
    }

    getUserById(id) {
        return this.getUsers().find(u => u.id === id);
    }

    getUserByUsername(username) {
        return this.getUsers().find(u => u.username === username);
    }

    // Trip management
    createTrip(userId, name, description = '') {
        const trips = this.getTrips();
        const newTrip = {
            id: this.getNextId('trips'),
            user_id: userId,
            name: name,
            description: description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        trips.push(newTrip);
        localStorage.setItem('travel_logger_trips', JSON.stringify(trips));
        return newTrip;
    }

    getTrips() {
        return JSON.parse(localStorage.getItem('travel_logger_trips') || '[]');
    }

    getTripsByUserId(userId) {
        return this.getTrips().filter(t => t.user_id === userId);
    }

    getTripById(id) {
        return this.getTrips().find(t => t.id === id);
    }

    updateTrip(tripId, updates) {
        const trips = this.getTrips();
        const index = trips.findIndex(t => t.id === tripId);
        if (index !== -1) {
            trips[index] = { ...trips[index], ...updates, updated_at: new Date().toISOString() };
            localStorage.setItem('travel_logger_trips', JSON.stringify(trips));
            return trips[index];
        }
        return null;
    }

    deleteTrip(tripId) {
        const trips = this.getTrips().filter(t => t.id !== tripId);
        localStorage.setItem('travel_logger_trips', JSON.stringify(trips));
        
        // Delete related data (cascade)
        this.deleteTripCities(tripId);
        this.deleteTripRoutes(tripId);
        this.deleteTripImages(tripId);
        this.deleteTripFlags(tripId);
    }

    // Trip cities
    addCityToTrip(tripId, cityData, orderIndex) {
        const cities = this.getTripCities();
        const newCity = {
            id: this.getNextId('trip_cities'),
            trip_id: tripId,
            city_name: cityData.name,
            state: cityData.state || null,
            country: cityData.country,
            latitude: cityData.lat,
            longitude: cityData.lng,
            display_name: cityData.display_name || null,
            order_index: orderIndex,
            notes: '',
            created_at: new Date().toISOString()
        };
        
        cities.push(newCity);
        localStorage.setItem('travel_logger_trip_cities', JSON.stringify(cities));
        return newCity;
    }

    getTripCities() {
        return JSON.parse(localStorage.getItem('travel_logger_trip_cities') || '[]');
    }

    getCitiesByTripId(tripId) {
        return this.getTripCities().filter(c => c.trip_id === tripId).sort((a, b) => a.order_index - b.order_index);
    }

    updateCity(cityId, updates) {
        const cities = this.getTripCities();
        const index = cities.findIndex(c => c.id === cityId);
        if (index !== -1) {
            cities[index] = { ...cities[index], ...updates };
            localStorage.setItem('travel_logger_trip_cities', JSON.stringify(cities));
            return cities[index];
        }
        return null;
    }

    deleteTripCities(tripId) {
        const cities = this.getTripCities().filter(c => c.trip_id !== tripId);
        localStorage.setItem('travel_logger_trip_cities', JSON.stringify(cities));
    }

    // Trip routes
    addRoute(tripId, fromCityId, toCityId, lineType, lineColor) {
        const routes = this.getTripRoutes();
        const newRoute = {
            id: this.getNextId('trip_routes'),
            trip_id: tripId,
            from_city_id: fromCityId,
            to_city_id: toCityId,
            line_type: lineType,
            line_color: lineColor || '#3b82f6',
            created_at: new Date().toISOString()
        };
        
        routes.push(newRoute);
        localStorage.setItem('travel_logger_trip_routes', JSON.stringify(routes));
        return newRoute;
    }

    getTripRoutes() {
        return JSON.parse(localStorage.getItem('travel_logger_trip_routes') || '[]');
    }

    getRoutesByTripId(tripId) {
        return this.getTripRoutes().filter(r => r.trip_id === tripId);
    }

    deleteTripRoutes(tripId) {
        const routes = this.getTripRoutes().filter(r => r.trip_id !== tripId);
        localStorage.setItem('travel_logger_trip_routes', JSON.stringify(routes));
    }

    // Trip images
    addImage(cityId, imageData, imageType, caption = '') {
        const images = this.getTripImages();
        const newImage = {
            id: this.getNextId('trip_images'),
            trip_city_id: cityId,
            image_data: imageData,
            image_type: imageType,
            caption: caption || null,
            created_at: new Date().toISOString()
        };
        
        images.push(newImage);
        localStorage.setItem('travel_logger_trip_images', JSON.stringify(images));
        return newImage;
    }

    getTripImages() {
        return JSON.parse(localStorage.getItem('travel_logger_trip_images') || '[]');
    }

    getImagesByCityId(cityId) {
        return this.getTripImages().filter(img => img.trip_city_id === cityId);
    }

    deleteTripImages(tripId) {
        const cities = this.getCitiesByTripId(tripId);
        const cityIds = cities.map(c => c.id);
        const images = this.getTripImages().filter(img => !cityIds.includes(img.trip_city_id));
        localStorage.setItem('travel_logger_trip_images', JSON.stringify(images));
    }

    // Trip flags
    addFlag(tripId, flagType, flagValue = null) {
        const flags = this.getTripFlags();
        const newFlag = {
            id: this.getNextId('trip_flags'),
            trip_id: tripId,
            flag_type: flagType,
            flag_value: flagValue,
            created_at: new Date().toISOString()
        };
        
        flags.push(newFlag);
        localStorage.setItem('travel_logger_trip_flags', JSON.stringify(flags));
        return newFlag;
    }

    getTripFlags() {
        return JSON.parse(localStorage.getItem('travel_logger_trip_flags') || '[]');
    }

    getFlagsByTripId(tripId) {
        return this.getTripFlags().filter(f => f.trip_id === tripId);
    }

    deleteTripFlags(tripId) {
        const flags = this.getTripFlags().filter(f => f.trip_id !== tripId);
        localStorage.setItem('travel_logger_trip_flags', JSON.stringify(flags));
    }

    // Helper methods
    getNextId(tableName) {
        const tables = {
            'users': 'travel_logger_users',
            'trips': 'travel_logger_trips',
            'trip_cities': 'travel_logger_trip_cities',
            'trip_routes': 'travel_logger_trip_routes',
            'trip_images': 'travel_logger_trip_images',
            'trip_flags': 'travel_logger_trip_flags'
        };
        
        const data = JSON.parse(localStorage.getItem(tables[tableName]) || '[]');
        if (data.length === 0) return 1;
        return Math.max(...data.map(item => item.id)) + 1;
    }
}

// Global database instance
const db = new Database();

// Session management
function getCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

function setCurrentUser(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}

function clearCurrentUser() {
    sessionStorage.removeItem('currentUser');
}

function checkAuth() {
    const user = getCurrentUser();
    if (!user && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Initialize auth on pages that need it
if (typeof window !== 'undefined' && window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const loginBtn = document.getElementById('loginBtn');
        const usernameInput = document.getElementById('username');
        const errorMsg = document.getElementById('errorMsg');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const username = usernameInput.value.trim();
                if (!username) {
                    errorMsg.textContent = 'Please enter a username';
                    errorMsg.classList.remove('hidden');
                    return;
                }

                const result = db.createUser(username);
                if (result.success) {
                    setCurrentUser(result.user);
                    window.location.href = 'trips.html';
                }
            });

            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    loginBtn.click();
                }
            });
        }

        // Check if already logged in
        if (getCurrentUser()) {
            window.location.href = 'trips.html';
        }
    });
}

