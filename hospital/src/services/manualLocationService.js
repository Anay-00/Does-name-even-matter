// Manual Location Service - No automatic detection, user selects location
class ManualLocationService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 60 * 60 * 1000; // 1 hour cache for geocoded locations
  }

  /**
   * Get coordinates for a city/location name using Nominatim
   * @param {string} locationName - City or location name
   * @returns {Promise<Object>} Location coordinates and details
   */
  async geocodeLocation(locationName) {
    try {
      const cacheKey = `geocode_${locationName.toLowerCase()}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('✅ Using cached geocoding result');
        return cached;
      }

      console.log(`🔍 Geocoding location: ${locationName}`);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AI-Doctor-Assistant/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.length === 0) {
        throw new Error(`Location "${locationName}" not found`);
      }

      const result = data[0];

      const location = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        name: locationName,
        displayName: result.display_name,
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state,
        country: result.address?.country,
        countryCode: result.address?.country_code,
        source: 'manual_geocoded',
        timestamp: Date.now()
      };

      // Cache the result
      this.setCache(cacheKey, location);

      console.log(`✅ Geocoded "${locationName}" to ${location.lat}, ${location.lng}`);
      return location;

    } catch (error) {
      console.error(`❌ Geocoding failed for "${locationName}":`, error.message);
      throw error;
    }
  }

  /**
   * Get predefined major cities with coordinates
   * Focused on Nabha, Punjab and surrounding cities
   * @returns {Array} Array of major cities
   */
  getMajorCities() {
    return [
      // Primary Location - Indore, Madhya Pradesh
      { name: 'Indore', lat: 22.7196, lng: 75.8577, country: 'India', state: 'Madhya Pradesh' },

      // Nearby Cities (within ~100 km)
      { name: 'Ujjain', lat: 23.1765, lng: 75.7885, country: 'India', state: 'Madhya Pradesh', distance: '55 km' },
      { name: 'Dewas', lat: 22.9676, lng: 76.0534, country: 'India', state: 'Madhya Pradesh', distance: '40 km' },
      { name: 'Pithampur', lat: 22.6013, lng: 75.6967, country: 'India', state: 'Madhya Pradesh', distance: '25 km' },
      { name: 'Mhow', lat: 22.5530, lng: 75.7534, country: 'India', state: 'Madhya Pradesh', distance: '25 km' },

      // Major MP Cities
      { name: 'Bhopal', lat: 23.2599, lng: 77.4126, country: 'India', state: 'Madhya Pradesh', distance: '190 km' },
      { name: 'Khandwa', lat: 21.8314, lng: 76.3498, country: 'India', state: 'Madhya Pradesh', distance: '130 km' },
      { name: 'Ratlam', lat: 23.3342, lng: 75.0377, country: 'India', state: 'Madhya Pradesh', distance: '140 km' },

      // Nearby State Cities
      { name: 'Vadodara', lat: 22.3072, lng: 73.1812, country: 'India', state: 'Gujarat', distance: '330 km' },
      { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, country: 'India', state: 'Gujarat', distance: '400 km' },
      { name: 'Jaipur', lat: 26.9124, lng: 75.7873, country: 'India', state: 'Rajasthan', distance: '500 km' },

      // Major Cities
      { name: 'Delhi', lat: 28.6139, lng: 77.2090, country: 'India', state: 'Delhi', distance: '800 km' },
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777, country: 'India', state: 'Maharashtra', distance: '600 km' }


    ].map(city => ({
      ...city,
      source: 'predefined',
      timestamp: Date.now()
    }));
  }


  /**
   * Search cities by name (fuzzy search)
   * @param {string} query - Search query
   * @returns {Array} Matching cities
   */
  searchCities(query) {
    if (!query || query.length < 2) return [];

    const cities = this.getMajorCities();
    const lowercaseQuery = query.toLowerCase();

    return cities.filter(city =>
      city.name.toLowerCase().includes(lowercaseQuery) ||
      city.state.toLowerCase().includes(lowercaseQuery) ||
      city.country.toLowerCase().includes(lowercaseQuery)
    ).slice(0, 10); // Limit to 10 results
  }

  /**
   * Get cities by country
   * @param {string} country - Country name
   * @returns {Array} Cities in the country
   */
  getCitiesByCountry(country) {
    const cities = this.getMajorCities();
    return cities.filter(city =>
      city.country.toLowerCase() === country.toLowerCase()
    );
  }

  /**
   * Validate location coordinates
   * @param {Object} location - Location object
   * @returns {boolean} Is valid location
   */
  isValidLocation(location) {
    return location &&
      typeof location.lat === 'number' &&
      typeof location.lng === 'number' &&
      location.lat >= -90 && location.lat <= 90 &&
      location.lng >= -180 && location.lng <= 180;
  }

  /**
   * Get user's preferred location from localStorage
   * @returns {Object|null} Saved location or null
   */
  getSavedLocation() {
    try {
      const saved = localStorage.getItem('preferred_location');
      if (saved) {
        const location = JSON.parse(saved);
        if (this.isValidLocation(location)) {
          console.log('✅ Using saved location:', location.name);
          return location;
        }
      }
    } catch (error) {
      console.log('Failed to load saved location:', error);
    }
    return null;
  }

  /**
   * Save user's preferred location to localStorage
   * @param {Object} location - Location to save
   */
  saveLocation(location) {
    try {
      if (this.isValidLocation(location)) {
        localStorage.setItem('preferred_location', JSON.stringify(location));
        console.log('✅ Location saved:', location.name);
      }
    } catch (error) {
      console.log('Failed to save location:', error);
    }
  }

  /**
   * Clear saved location
   */
  clearSavedLocation() {
    try {
      localStorage.removeItem('preferred_location');
      console.log('✅ Saved location cleared');
    } catch (error) {
      console.log('Failed to clear saved location:', error);
    }
  }

  /**
   * Get default location (Nabha, Punjab)
   * @returns {Object} Default location
   */
  getDefaultLocation() {
    const defaultCity = this.getMajorCities().find(city => city.name === 'Indore');
    return {
      ...defaultCity,
      source: 'default'
    };
  }

  // Cache management
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
      return cached.data;
    }
    return null;
  }

  clearCache() {
    this.cache.clear();
    console.log('✅ Location cache cleared');
  }
}

export const manualLocationService = new ManualLocationService();