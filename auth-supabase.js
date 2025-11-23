// Authentication and User Management
// Connects to Supabase database matching schema

// Supabase Configuration - REPLACE WITH YOUR CREDENTIALS
const SUPABASE_URL = 'https://qducbibqkclfuxtpjsnx.supabase.co'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNiaWJxa2NsZnV4dHBqc254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2OTI0MzcsImV4cCI6MjA3OTI2ODQzN30.YSdxHLY94pvvCvLv3HsKtSTaOXS4ei_KNKq7aP-3RtU'; // Your Supabase anonymous key

// Initialize Supabase client
let supabase = null;

if (typeof window !== 'undefined') {
    // Load Supabase from CDN if not already loaded
    if (window.supabase) {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (error) {
            console.warn('Failed to initialize Supabase client:', error);
        }
    } else {
        // Wait for Supabase to load
        window.addEventListener('DOMContentLoaded', () => {
            if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
                try {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                } catch (error) {
                    console.warn('Failed to initialize Supabase client on DOMContentLoaded:', error);
                }
            }
        });
    }
}

class Database {
    constructor() {
        this.supabase = supabase;
        this.initLocalStorage(); // Initialize localStorage for dual storage
    }

    // Initialize localStorage structure for dual storage
    initLocalStorage() {
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

    // Helper to ensure Supabase is initialized
    async ensureSupabase() {
        // Wait for Supabase library to load if needed
        if (!window.supabase) {
            console.warn('Supabase library not loaded yet, waiting...');
            // Wait up to 5 seconds for Supabase to load
            for (let i = 0; i < 50; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (window.supabase) break;
            }
            if (!window.supabase) {
                console.error('Supabase library failed to load');
                return null;
            }
        }
        
        if (!this.supabase && window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
            try {
                this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('Supabase client created successfully');
                
                // Test the connection
                const testResult = await this.testSupabaseConnection();
                if (!testResult.success) {
                    console.error('Supabase connection test failed:', testResult.error);
                } else {
                    console.log('Supabase connection test passed');
                }
            } catch (error) {
                console.error('Failed to create Supabase client:', error);
                // Return null to allow fallback to localStorage
                return null;
            }
        }
        // Don't throw error - allow fallback to localStorage
        return this.supabase;
    }
    
    // Test Supabase connection
    async testSupabaseConnection() {
        try {
            if (!this.supabase) {
                return { success: false, error: 'Supabase client not initialized' };
            }
            
            // Try a simple query to test connection
            const { data, error } = await this.supabase
                .from('users')
                .select('id')
                .limit(1);
            
            if (error) {
                // Check if it's an RLS error
                if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('RLS')) {
                    return { 
                        success: false, 
                        error: 'Row Level Security (RLS) is blocking access. Please disable RLS on tables or set up proper policies.',
                        code: 'RLS_ERROR',
                        details: error
                    };
                }
                // Check if it's a connection error
                if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
                    return { 
                        success: false, 
                        error: 'Network error. Check your internet connection and Supabase URL.',
                        code: 'NETWORK_ERROR',
                        details: error
                    };
                }
                // Check if table doesn't exist
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    return { 
                        success: false, 
                        error: 'Table does not exist. Please run schema.sql in your Supabase SQL Editor.',
                        code: 'TABLE_MISSING',
                        details: error
                    };
                }
                return { 
                    success: false, 
                    error: error.message || 'Unknown error',
                    code: error.code,
                    details: error
                };
            }
            
            return { success: true, data: data };
        } catch (error) {
            return { 
                success: false, 
                error: error.message || 'Connection test failed',
                details: error
            };
        }
    }
    
    // Check if Supabase is available
    isSupabaseAvailable() {
        return this.supabase !== null && this.supabase !== undefined;
    }

    // Dual storage: Save to both Supabase and localStorage
    async saveToLocalStorage(tableName, data) {
        const storageKey = `travel_logger_${tableName}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (Array.isArray(data)) {
            // If data is array, merge with existing
            const merged = [...existing];
            data.forEach(item => {
                const index = merged.findIndex(existing => existing.id === item.id);
                if (index !== -1) {
                    merged[index] = item;
                } else {
                    merged.push(item);
                }
            });
            localStorage.setItem(storageKey, JSON.stringify(merged));
        } else {
            // Single item
            const index = existing.findIndex(item => item.id === data.id);
            if (index !== -1) {
                existing[index] = data;
            } else {
                existing.push(data);
            }
            localStorage.setItem(storageKey, JSON.stringify(existing));
        }
    }

    // Remove from localStorage
    removeFromLocalStorage(tableName, id) {
        const storageKey = `travel_logger_${tableName}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const filtered = existing.filter(item => item.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
    }

    // Remove multiple from localStorage
    removeMultipleFromLocalStorage(tableName, filterFn) {
        const storageKey = `travel_logger_${tableName}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const filtered = existing.filter(item => !filterFn(item));
        localStorage.setItem(storageKey, JSON.stringify(filtered));
    }

    // User management
    async createUser(username) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    // Check if user exists
                    const { data: existingUser } = await client
                        .from('users')
                        .select('*')
                        .eq('username', username)
                        .single();

                    if (existingUser) {
                        // Dual storage: Save to localStorage
                        await this.saveToLocalStorage('users', existingUser);
                        return { success: true, user: existingUser };
                    }

                    // Create new user
                    const { data: newUser, error } = await client
                        .from('users')
                        .insert([{
                            username: username,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (error) throw error;
                    
                    // Dual storage: Save to localStorage
                    await this.saveToLocalStorage('users', newUser);
                    
                    return { success: true, user: newUser };
                } catch (supabaseError) {
                    console.warn('Supabase error, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_users';
            const users = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const existingUser = users.find(u => u.username === username);
            
            if (existingUser) {
                return { success: true, user: existingUser };
            }
            
            // Create new user in localStorage
            const newUser = {
                id: Date.now().toString(),
                username: username,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            users.push(newUser);
            localStorage.setItem(storageKey, JSON.stringify(users));
            
            return { success: true, user: newUser };
        } catch (error) {
            console.error('Error creating user:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserById(id) {
        try {
            const client = await this.ensureSupabase();
            const { data, error } = await client
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async getUserByUsername(username) {
        try {
            const client = await this.ensureSupabase();
            const { data, error } = await client
                .from('users')
                .select('*')
                .eq('username', username)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            return data;
        } catch (error) {
            console.error('Error getting user by username:', error);
            return null;
        }
    }

    // Trip management
    async createTrip(userId, name, description = '') {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trips')
                        .insert([{
                            user_id: userId,
                            name: name,
                            description: description,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (error) throw error;
                    
                    // Dual storage: Save to localStorage
                    await this.saveToLocalStorage('trips', data);
                    
                    return data;
                } catch (supabaseError) {
                    console.warn('Supabase error, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trips';
            const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newTrip = {
                id: Date.now().toString(),
                user_id: userId,
                name: name,
                description: description,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            trips.push(newTrip);
            localStorage.setItem(storageKey, JSON.stringify(trips));
            
            return newTrip;
        } catch (error) {
            console.error('Error creating trip:', error);
            throw error;
        }
    }

    async getTripsByUserId(userId) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trips')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    
                    const trips = data || [];
                    
                    // Dual storage: Sync to localStorage
                    trips.forEach(trip => {
                        this.saveToLocalStorage('trips', trip);
                    });
                    
                    return trips;
                } catch (supabaseError) {
                    console.warn('Supabase error, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trips';
            const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return trips.filter(trip => trip.user_id === userId || trip.user_id === userId.toString())
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (error) {
            console.error('Error getting trips:', error);
            // Final fallback to localStorage
            const storageKey = 'travel_logger_trips';
            const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return trips.filter(trip => trip.user_id === userId || trip.user_id === userId.toString())
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
    }

    async getTripById(id) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trips')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (error) throw error;
                    
                    // Dual storage: Save to localStorage
                    if (data) {
                        await this.saveToLocalStorage('trips', data);
                    }
                    
                    return data;
                } catch (supabaseError) {
                    console.warn('Supabase error, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trips';
            const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const trip = trips.find(t => t.id === id || t.id === id.toString());
            return trip || null;
        } catch (error) {
            console.error('Error getting trip:', error);
            // Final fallback to localStorage
            const storageKey = 'travel_logger_trips';
            const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const trip = trips.find(t => t.id === id || t.id === id.toString());
            return trip || null;
        }
    }

    async updateTrip(tripId, updates) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trips')
                        .update({ ...updates, updated_at: new Date().toISOString() })
                        .eq('id', tripId)
                        .select()
                        .single();

                    if (error) throw error;
                    
                    // Dual storage: Save to localStorage
                    await this.saveToLocalStorage('trips', data);
                    
                    return data;
                } catch (supabaseError) {
                    console.warn('Supabase error updating trip, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trips';
            const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const tripIndex = trips.findIndex(t => t.id === tripId || t.id === tripId.toString());
            if (tripIndex !== -1) {
                trips[tripIndex] = { ...trips[tripIndex], ...updates, updated_at: new Date().toISOString() };
                localStorage.setItem(storageKey, JSON.stringify(trips));
                return trips[tripIndex];
            }
            return null;
        } catch (error) {
            console.error('Error updating trip:', error);
            // Still try localStorage
            const storageKey = 'travel_logger_trips';
            const trips = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const tripIndex = trips.findIndex(t => t.id === tripId || t.id === tripId.toString());
            if (tripIndex !== -1) {
                trips[tripIndex] = { ...trips[tripIndex], ...updates, updated_at: new Date().toISOString() };
                localStorage.setItem(storageKey, JSON.stringify(trips));
                return trips[tripIndex];
            }
            return null;
        }
    }

    async deleteTrip(tripId) {
        try {
            const client = await this.ensureSupabase();
            // Delete trip (cascade will handle related data if foreign keys are set up)
            const { error } = await client
                .from('trips')
                .delete()
                .eq('id', tripId);

            if (error) throw error;
            
            // Also explicitly delete related data
            await this.deleteTripCities(tripId);
            await this.deleteTripRoutes(tripId);
            await this.deleteTripImages(tripId);
            await this.deleteTripFlags(tripId);
            
            // Dual storage: Remove from localStorage
            this.removeFromLocalStorage('trips', tripId);
        } catch (error) {
            console.error('Error deleting trip:', error);
            throw error;
        }
    }

    // Trip cities
    async addCityToTrip(tripId, cityData, orderIndex) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trip_cities')
                        .insert([{
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
                        }])
                        .select()
                        .single();

                    if (error) throw error;
                    
                    // Dual storage: Save to localStorage
                    await this.saveToLocalStorage('trip_cities', data);
                    
                    return data;
                } catch (supabaseError) {
                    console.warn('Supabase error adding city, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trip_cities';
            const cities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newCity = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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
            localStorage.setItem(storageKey, JSON.stringify(cities));
            
            return newCity;
        } catch (error) {
            console.error('Error adding city:', error);
            // Still try localStorage as last resort
            const storageKey = 'travel_logger_trip_cities';
            const cities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newCity = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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
            localStorage.setItem(storageKey, JSON.stringify(cities));
            return newCity;
        }
    }

    async getCitiesByTripId(tripId) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trip_cities')
                        .select('*')
                        .eq('trip_id', tripId)
                        .order('order_index', { ascending: true });

                    if (error) throw error;
                    
                    const cities = data || [];
                    
                    // Dual storage: Sync to localStorage
                    cities.forEach(city => {
                        this.saveToLocalStorage('trip_cities', city);
                    });
                    
                    return cities;
                } catch (supabaseError) {
                    console.warn('Supabase error getting cities, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trip_cities';
            const cities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return cities
                .filter(city => city.trip_id === tripId || city.trip_id === tripId.toString())
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        } catch (error) {
            console.error('Error getting cities:', error);
            // Final fallback to localStorage
            const storageKey = 'travel_logger_trip_cities';
            const cities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return cities
                .filter(city => city.trip_id === tripId || city.trip_id === tripId.toString())
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        }
    }

    async updateCity(cityId, updates) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trip_cities')
                        .update(updates)
                        .eq('id', cityId)
                        .select()
                        .single();

                    if (error) throw error;
                    
                    // Dual storage: Save to localStorage
                    await this.saveToLocalStorage('trip_cities', data);
                    
                    return data;
                } catch (supabaseError) {
                    console.warn('Supabase error updating city, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trip_cities';
            const cities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const cityIndex = cities.findIndex(c => c.id === cityId || c.id === cityId.toString());
            if (cityIndex !== -1) {
                cities[cityIndex] = { ...cities[cityIndex], ...updates };
                localStorage.setItem(storageKey, JSON.stringify(cities));
                return cities[cityIndex];
            }
            return null;
        } catch (error) {
            console.error('Error updating city:', error);
            // Still try localStorage
            const storageKey = 'travel_logger_trip_cities';
            const cities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const cityIndex = cities.findIndex(c => c.id === cityId || c.id === cityId.toString());
            if (cityIndex !== -1) {
                cities[cityIndex] = { ...cities[cityIndex], ...updates };
                localStorage.setItem(storageKey, JSON.stringify(cities));
                return cities[cityIndex];
            }
            return null;
        }
    }

    async deleteTripCities(tripId) {
        try {
            const client = await this.ensureSupabase();
            const { error } = await client
                .from('trip_cities')
                .delete()
                .eq('trip_id', tripId);

            if (error) throw error;
            
            // Dual storage: Remove from localStorage
            this.removeMultipleFromLocalStorage('trip_cities', city => city.trip_id === tripId);
        } catch (error) {
            console.error('Error deleting cities:', error);
        }
    }

    // Trip routes
    async addRoute(tripId, fromCityId, toCityId, lineType, lineColor) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trip_routes')
                        .insert([{
                            trip_id: tripId,
                            from_city_id: fromCityId,
                            to_city_id: toCityId,
                            line_type: lineType,
                            line_color: lineColor || '#3b82f6',
                            created_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (error) throw error;
                    
                    // Dual storage: Save to localStorage
                    await this.saveToLocalStorage('trip_routes', data);
                    
                    return data;
                } catch (supabaseError) {
                    console.warn('Supabase error adding route, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trip_routes';
            const routes = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newRoute = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                trip_id: tripId,
                from_city_id: fromCityId,
                to_city_id: toCityId,
                line_type: lineType,
                line_color: lineColor || '#3b82f6',
                created_at: new Date().toISOString()
            };
            routes.push(newRoute);
            localStorage.setItem(storageKey, JSON.stringify(routes));
            
            return newRoute;
        } catch (error) {
            console.error('Error adding route:', error);
            // Still try localStorage as last resort
            const storageKey = 'travel_logger_trip_routes';
            const routes = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newRoute = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                trip_id: tripId,
                from_city_id: fromCityId,
                to_city_id: toCityId,
                line_type: lineType,
                line_color: lineColor || '#3b82f6',
                created_at: new Date().toISOString()
            };
            routes.push(newRoute);
            localStorage.setItem(storageKey, JSON.stringify(routes));
            return newRoute;
        }
    }

    async getRoutesByTripId(tripId) {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trip_routes')
                        .select('*')
                        .eq('trip_id', tripId);

                    if (error) throw error;
                    
                    const routes = data || [];
                    
                    // Dual storage: Sync to localStorage
                    routes.forEach(route => {
                        this.saveToLocalStorage('trip_routes', route);
                    });
                    
                    return routes;
                } catch (supabaseError) {
                    console.warn('Supabase error getting routes, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trip_routes';
            const routes = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return routes.filter(route => route.trip_id === tripId || route.trip_id === tripId.toString());
        } catch (error) {
            console.error('Error getting routes:', error);
            // Final fallback to localStorage
            const storageKey = 'travel_logger_trip_routes';
            const routes = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return routes.filter(route => route.trip_id === tripId || route.trip_id === tripId.toString());
        }
    }

    async deleteTripRoutes(tripId) {
        try {
            const client = await this.ensureSupabase();
            const { error } = await client
                .from('trip_routes')
                .delete()
                .eq('trip_id', tripId);

            if (error) throw error;
            
            // Dual storage: Remove from localStorage
            this.removeMultipleFromLocalStorage('trip_routes', route => route.trip_id === tripId);
        } catch (error) {
            console.error('Error deleting routes:', error);
        }
    }

    // Trip images
    async addImage(cityId, imageData, imageType, caption = '') {
        try {
            const client = await this.ensureSupabase();
            
            // Try Supabase first
            if (client) {
                try {
                    const { data, error } = await client
                        .from('trip_images')
                        .insert([{
                            trip_city_id: cityId,
                            image_data: imageData,
                            image_type: imageType,
                            caption: caption || null,
                            created_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (error) throw error;
                    
                    // Dual storage: Save to localStorage
                    await this.saveToLocalStorage('trip_images', data);
                    
                    return data;
                } catch (supabaseError) {
                    console.warn('Supabase error adding image, falling back to localStorage:', supabaseError);
                    // Fall through to localStorage fallback
                }
            }
            
            // Fallback to localStorage
            const storageKey = 'travel_logger_trip_images';
            const images = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newImage = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                trip_city_id: cityId,
                image_data: imageData,
                image_type: imageType,
                caption: caption || null,
                created_at: new Date().toISOString()
            };
            images.push(newImage);
            localStorage.setItem(storageKey, JSON.stringify(images));
            
            return newImage;
        } catch (error) {
            console.error('Error adding image:', error);
            // Still try localStorage as last resort
            const storageKey = 'travel_logger_trip_images';
            const images = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newImage = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                trip_city_id: cityId,
                image_data: imageData,
                image_type: imageType,
                caption: caption || null,
                created_at: new Date().toISOString()
            };
            images.push(newImage);
            localStorage.setItem(storageKey, JSON.stringify(images));
            return newImage;
        }
    }

    async getTripImages() {
        try {
            const client = await this.ensureSupabase();
            const { data, error } = await client
                .from('trip_images')
                .select('*');

            if (error) throw error;
            
            const images = data || [];
            
            // Dual storage: Sync to localStorage
            images.forEach(image => {
                this.saveToLocalStorage('trip_images', image);
            });
            
            return images;
        } catch (error) {
            console.error('Error getting images:', error);
            return [];
        }
    }

    async getImagesByCityId(cityId) {
        try {
            const client = await this.ensureSupabase();
            const { data, error } = await client
                .from('trip_images')
                .select('*')
                .eq('trip_city_id', cityId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting images by city:', error);
            return [];
        }
    }

    async deleteTripImages(tripId) {
        try {
            const client = await this.ensureSupabase();
            // Get city IDs for this trip
            const cities = await this.getCitiesByTripId(tripId);
            const cityIds = cities.map(c => c.id);
            
            if (cityIds.length > 0) {
                const { error } = await client
                    .from('trip_images')
                    .delete()
                    .in('trip_city_id', cityIds);

                if (error) throw error;
            }
            
            // Dual storage: Remove from localStorage
            if (cityIds.length > 0) {
                this.removeMultipleFromLocalStorage('trip_images', img => cityIds.includes(img.trip_city_id));
            }
        } catch (error) {
            console.error('Error deleting images:', error);
        }
    }

    // Trip flags
    async addFlag(tripId, flagType, flagValue = null) {
        try {
            const client = await this.ensureSupabase();
            const { data, error } = await client
                .from('trip_flags')
                .insert([{
                    trip_id: tripId,
                    flag_type: flagType,
                    flag_value: flagValue,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            
            // Dual storage: Save to localStorage
            await this.saveToLocalStorage('trip_flags', data);
            
            return data;
        } catch (error) {
            console.error('Error adding flag:', error);
            throw error;
        }
    }

    async getFlagsByTripId(tripId) {
        try {
            const client = await this.ensureSupabase();
            const { data, error } = await client
                .from('trip_flags')
                .select('*')
                .eq('trip_id', tripId);

            if (error) throw error;
            
            const flags = data || [];
            
            // Dual storage: Sync to localStorage
            flags.forEach(flag => {
                this.saveToLocalStorage('trip_flags', flag);
            });
            
            return flags;
        } catch (error) {
            console.error('Error getting flags:', error);
            return [];
        }
    }

    async deleteTripFlags(tripId) {
        try {
            const client = await this.ensureSupabase();
            const { error } = await client
                .from('trip_flags')
                .delete()
                .eq('trip_id', tripId);

            if (error) throw error;
            
            // Dual storage: Remove from localStorage
            this.removeMultipleFromLocalStorage('trip_flags', flag => flag.trip_id === tripId);
        } catch (error) {
            console.error('Error deleting flags:', error);
        }
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

async function checkAuth() {
    const user = getCurrentUser();
    if (!user && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Initialize auth on pages that need it
if (typeof window !== 'undefined' && window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const loginBtn = document.getElementById('loginBtn');
        const usernameInput = document.getElementById('username');
        const errorMsg = document.getElementById('errorMsg');

        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const username = usernameInput.value.trim();
                if (!username) {
                    errorMsg.textContent = 'Please enter a username';
                    errorMsg.classList.remove('hidden');
                    return;
                }

                try {
                    const result = await db.createUser(username);
                    if (result.success) {
                        setCurrentUser(result.user);
                        window.location.href = 'trips.html';
                    } else {
                        errorMsg.textContent = result.error || 'Failed to create/login user';
                        errorMsg.classList.remove('hidden');
                    }
                } catch (error) {
                    errorMsg.textContent = 'Error: ' + error.message;
                    errorMsg.classList.remove('hidden');
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

