import React, { useState, useEffect } from 'react';
import { Search, MapPin, Navigation, Clock, Star } from 'lucide-react';
import { manualLocationService } from '../services/manualLocationService';

const LocationSelector = ({ onLocationSelect, currentLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [majorCities, setMajorCities] = useState([]);
  const [savedLocation, setSavedLocation] = useState(null);

  useEffect(() => {
    // Load major cities
    const cities = manualLocationService.getMajorCities();
    setMajorCities(cities);

    // Load saved location
    const saved = manualLocationService.getSavedLocation();
    setSavedLocation(saved);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);

    try {
      // Search in predefined cities first
      const cityResults = manualLocationService.searchCities(query);
      setSearchResults(cityResults);

      // If no city results and query is long enough, try geocoding
      if (cityResults.length === 0 && query.length >= 3) {
        try {
          const geocoded = await manualLocationService.geocodeLocation(query);
          setSearchResults([geocoded]);
        } catch (error) {
          console.log('Geocoding failed:', error.message);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location) => {
    console.log('🎯 Location selected:', location);
    setSearchQuery(location.name);
    setShowSuggestions(false);
    
    // Save location
    manualLocationService.saveLocation(location);
    setSavedLocation(location);
    
    // Notify parent component
    onLocationSelect(location);
  };

  const handleUseSaved = () => {
    if (savedLocation) {
      handleLocationSelect(savedLocation);
    }
  };

  return (
    <div className="w=full max-w-7xl mx-auto bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-2xl border border-blue-100/50 p-8 mb-8 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg">
          <MapPin className="text-white" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Select Your Location</h2>
          <p className="text-gray-600">Choose your city to find nearby medical facilities</p>
        </div>
      </div>

      {/* Saved Location */}
      {savedLocation && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="text-blue-600" size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Recently used:</span>
                  <span className="font-semibold text-gray-800">{savedLocation.name}</span>
                </div>
                {savedLocation.state && (
                  <span className="text-sm text-gray-500">{savedLocation.state}, {savedLocation.country}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleUseSaved}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Use This Location
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 bg-blue-100 rounded-full">
            <Search className="text-blue-600" size={18} />
          </div>
          <input
            type="text"
            placeholder="Search for your city or area..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            className="w-full pl-14 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-lg placeholder-gray-400 bg-white/80 backdrop-blur-sm shadow-sm"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSuggestions && searchResults.length > 0 && (
          <div className="absolute z-20 w-full mt-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
            {searchResults.map((location, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(location)}
                className="w-full px-5 py-4 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-b border-gray-100 last:border-b-0 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 group-hover:bg-blue-100 rounded-full transition-colors duration-200">
                    <MapPin className="text-gray-500 group-hover:text-blue-600" size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 group-hover:text-blue-800">{location.name}</div>
                    {location.state && (
                      <div className="text-sm text-gray-500 group-hover:text-blue-600">
                        {location.state}, {location.country}
                      </div>
                    )}
                    {location.displayName && location.source === 'manual_geocoded' && (
                      <div className="text-xs text-gray-400 truncate max-w-xs mt-1">
                        {location.displayName}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    
      

      {/* Major Cities Grid */}
      {!showSuggestions && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🏥 Medical Cities in Punjab Region:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {majorCities.slice(0, 16).map((city, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(city)}
                className={`p-4 text-left rounded-xl border-2 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                  currentLocation?.name === city.name
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                    : 'border-gray-200 hover:border-blue-300 bg-white/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full transition-colors duration-200 ${
                    currentLocation?.name === city.name 
                      ? 'bg-blue-100' 
                      : 'bg-gray-100 group-hover:bg-blue-100'
                  }`}>
                    <Navigation className={`${
                      currentLocation?.name === city.name ? 'text-blue-600' : 'text-gray-500'
                    }`} size={16} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${
                      currentLocation?.name === city.name ? 'text-blue-800' : 'text-gray-800'
                    }`}>
                      {city.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {city.state}, {city.country}
                    </div>
                    {city.distance && (
                      <div className="text-xs text-gray-400 mt-1">
                        📍 {city.distance} from Indore
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Selection */}
      {currentLocation && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Star className="text-green-600" size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Selected location:</span>
                <span className="font-semibold text-gray-800">{currentLocation.name}</span>
                {currentLocation.state && (
                  <span className="text-sm text-gray-500">
                    ({currentLocation.state}, {currentLocation.country})
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                📍 Coordinates: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;