import React, { useState, useEffect } from 'react';
import { Search, MapPin, Phone, Clock, AlertCircle, Loader, Pill, CheckCircle, XCircle, RefreshCw, Navigation, Star } from 'lucide-react';
import LocationSelector from '../components/LocationSelector';
import { medicineService } from '../services/medicineService';
import { manualLocationService } from '../services/manualLocationService';
import FloatingNavbar from '../components/FloatingNavbar';
// import Header from '../assets/component/Header';
import Footer from '../components/Footer';



const FindMedicine = ({ onBack, onSOSClick, onLoginClick, onRegisterClick, onHospitalsClick, onTechnologyClick, onContactClick, onFindMedicineClick, onFindDoctorClick, onFeaturesClick }) => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [pharmacies, setPharmacies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searchRadius, setSearchRadius] = useState(10);
    const [showOnlyOpen, setShowOnlyOpen] = useState(false);

    const searchPharmacies = React.useCallback(async (lat, lng) => {
        setLoading(true);
        setError(null);

        try {
            console.log(`🔍 Searching pharmacies for coordinates: ${lat}, ${lng}`);

            const results = await medicineService.searchNearbyPharmacies(lat, lng, searchRadius);

            console.log(`✅ Found ${results.length} pharmacies`);
            setPharmacies(results);

            if (results.length === 0) {
                setError('No pharmacies found in this area. Please try a different location or increase the search radius.');
            }

        } catch (err) {
            console.error('❌ Failed to search pharmacies:', err);
            setError(`Failed to find pharmacies: ${err.message}`);
            setPharmacies([]);
        } finally {
            setLoading(false);
        }
    }, [searchRadius]);

    useEffect(() => {
        // Load default location and search pharmacies
        const savedLocation = manualLocationService.getSavedLocation();
        if (savedLocation) {
            setCurrentLocation(savedLocation);
            searchPharmacies(savedLocation.lat, savedLocation.lng);
        } else {
            const defaultLocation = manualLocationService.getDefaultLocation();
            setCurrentLocation(defaultLocation);
            searchPharmacies(defaultLocation.lat, defaultLocation.lng);
        }
    }, [searchPharmacies]);

    const handleLocationSelect = (location) => {
        console.log('🎯 New location selected:', location);
        setCurrentLocation(location);
        setError(null);
        searchPharmacies(location.lat, location.lng);
    };

    const handleMedicineSearch = async () => {
        if (!searchQuery.trim()) {
            alert('Please enter a medicine name to search');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const results = await medicineService.searchMedicineAvailability(
                searchQuery,
                currentLocation.lat,
                currentLocation.lng,
                searchRadius
            );

            setSearchResults(results);

            if (results.availableAt.length === 0) {
                setError(`Medicine "${searchQuery}" not found in nearby pharmacies. Try searching with a different name or increase the search radius.`);
            }

        } catch (err) {
            console.error('❌ Medicine search failed:', err);
            setError(`Failed to search for medicine: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRadiusChange = (newRadius) => {
        setSearchRadius(newRadius);
        if (currentLocation) {
            searchPharmacies(currentLocation.lat, currentLocation.lng);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
        setError(null);
    };

    const getOpenStatusColor = (isOpen) => {
        if (isOpen === null) return 'text-gray-500 bg-gray-50';
        return isOpen ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
    };

    const getOpenStatusText = (isOpen) => {
        if (isOpen === null) return 'Hours Unknown';
        return isOpen ? 'Open Now' : 'Closed';
    };

    const filteredPharmacies = pharmacies.filter(pharmacy => {
        if (showOnlyOpen && pharmacy.isOpen === false) return false;
        return true;
    });

    const displayPharmacies = searchResults ? searchResults.availableAt : filteredPharmacies;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <FloatingNavbar
                onSOSClick={onSOSClick}
                onLoginClick={onLoginClick}
                onRegisterClick={onRegisterClick}
                onHospitalsClick={onHospitalsClick}
                onTechnologyClick={onTechnologyClick}
                onContactClick={onContactClick}
                onFindMedicineClick={onFindMedicineClick}
                onFindDoctorClick={onFindDoctorClick}
                onHomeClick={onBack}
                onFeaturesClick={onFeaturesClick}
                activeItem="Find Medicine"
            />
            <div className="p-4 pt-24 md:pt-28">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8 mt-4">
                        <div className="inline-flex items-center gap-3 mb-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg">
                                <Pill className="text-white" size={32} />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                    Find Medicine
                                </h1>
                                <p className="text-lg text-gray-600 mt-1">Real-time medicine availability at nearby pharmacies</p>
                            </div>
                        </div>
                    </div>

                    {/* Location Selector */}
                    <LocationSelector
                        onLocationSelect={handleLocationSelect}
                        currentLocation={currentLocation}
                    />

                    {/* Medicine Search */}
                    <div className="bg-gradient-to-r from-white to-green-50/50 rounded-2xl shadow-xl border border-green-100/50 p-6 mb-8 backdrop-blur-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Medicine Search Input */}
                            <div className="lg:col-span-2 space-y-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <div className="p-1 bg-green-100 rounded-full">
                                        <Search size={14} className="text-green-600" />
                                    </div>
                                    Search Medicine
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Enter medicine name (e.g., Paracetamol, Aspirin)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleMedicineSearch()}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={clearSearch}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search Radius */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <div className="p-1 bg-blue-100 rounded-full">
                                        <Navigation size={14} className="text-blue-600" />
                                    </div>
                                    Search Radius: <span className="text-blue-600">{searchRadius} km</span>
                                </label>
                                <select
                                    value={searchRadius}
                                    onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm"
                                >
                                    <option value={2}>🎯 2 km - Very Close</option>
                                    <option value={5}>📍 5 km - Nearby</option>
                                    <option value={10}>🌆 10 km - Local Area</option>
                                    <option value={15}>🏙️ 15 km - Extended</option>
                                </select>
                            </div>

                            {/* Search Button */}
                            <div className="flex items-end">
                                <button
                                    onClick={handleMedicineSearch}
                                    disabled={loading || !searchQuery.trim()}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 font-medium"
                                >
                                    {loading ? (
                                        <>
                                            <Loader className="animate-spin" size={18} />
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <Search size={18} />
                                            Find Medicine
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-green-100">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={showOnlyOpen}
                                    onChange={(e) => setShowOnlyOpen(e.target.checked)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                Show only open pharmacies
                            </label>

                            <button
                                onClick={() => currentLocation && searchPharmacies(currentLocation.lat, currentLocation.lng)}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Search Results Summary */}
                    {searchResults && (
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-6 mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-100 rounded-full">
                                    <Pill className="text-emerald-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        Search Results for "{searchResults.medicine.name}"
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {searchResults.medicine.category} • {searchResults.medicine.prescription ? 'Prescription Required' : 'Over-the-Counter'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white/60 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-emerald-600">{searchResults.availableAt.length}</div>
                                    <div className="text-sm text-gray-600">Pharmacies with stock</div>
                                </div>
                                <div className="bg-white/60 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-600">{searchResults.totalPharmacies}</div>
                                    <div className="text-sm text-gray-600">Total pharmacies searched</div>
                                </div>
                                <div className="bg-white/60 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-orange-600">{searchResults.availabilityRate}%</div>
                                    <div className="text-sm text-gray-600">Availability rate</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-center gap-3">
                            <AlertCircle className="text-red-500" size={20} />
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                            <span className="ml-3 text-lg text-gray-600">
                                {searchQuery ? `Searching for ${searchQuery}...` : 'Finding nearby pharmacies...'}
                            </span>
                        </div>
                    )}

                    {/* Pharmacy Results */}
                    {!loading && displayPharmacies.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-gray-800">
                                    {searchResults ? `Pharmacies with "${searchResults.medicine.name}" in stock` : 'Nearby Pharmacies'}
                                    <span className="text-green-600 ml-2">({displayPharmacies.length})</span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {displayPharmacies.map((pharmacy, index) => (
                                    <div key={pharmacy.id || index} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                                        <div className="p-6">
                                            {/* Pharmacy Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="p-2 bg-green-100 rounded-full">
                                                            <Pill className="text-green-600" size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-semibold text-gray-800">{pharmacy.name}</h4>
                                                            {pharmacy.rating && (
                                                                <div className="flex items-center gap-1">
                                                                    <Star className="text-yellow-500 fill-current" size={14} />
                                                                    <span className="text-sm text-gray-600">{pharmacy.rating}</span>
                                                                    <span className="text-xs text-gray-400">rating</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                        <MapPin size={14} />
                                                        <span>{pharmacy.address}</span>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOpenStatusColor(pharmacy.isOpen)}`}>
                                                            <Clock size={12} className="inline mr-1" />
                                                            {getOpenStatusText(pharmacy.isOpen)}
                                                        </span>

                                                        <span className="text-sm text-blue-600 font-medium">
                                                            📍 {pharmacy.distance} km away
                                                        </span>

                                                        {pharmacy.city && (
                                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                                {pharmacy.city}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    {pharmacy.hasEmergencyService && (
                                                        <div className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium text-center">
                                                            24/7
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-500 text-center">
                                                        {pharmacy.availableMedicines.length} medicines
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Info */}
                                            {pharmacy.phone && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                                    <Phone size={14} />
                                                    <a href={`tel:${pharmacy.phone}`} className="text-blue-600 hover:underline">
                                                        {pharmacy.phone}
                                                    </a>
                                                </div>
                                            )}

                                            {/* Medicine Availability */}
                                            {searchResults ? (
                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <CheckCircle className="text-green-600" size={16} />
                                                        <span className="font-semibold text-green-800">
                                                            {searchResults.medicine.name} Available
                                                        </span>
                                                    </div>
                                                    {pharmacy.availableMedicines
                                                        .filter(med =>
                                                            med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                            med.generic.toLowerCase().includes(searchQuery.toLowerCase())
                                                        )
                                                        .map((med, idx) => (
                                                            <div key={idx} className="bg-white/70 rounded-md p-3 mb-2 last:mb-0">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-gray-800">{med.name}</div>
                                                                        <div className="text-xs text-gray-500">Generic: {med.generic}</div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-lg font-bold text-green-600">₹{med.price}</div>
                                                                        <div className={`text-sm ${med.inStock ? 'text-green-600' : 'text-red-600'}`}>
                                                                            {med.inStock ? `${med.quantity} in stock` : 'Out of stock'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {searchResults.medicine.prescription && (
                                                                    <div className="mt-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full inline-block">
                                                                        📋 Prescription Required
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            ) : (
                                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Pill className="text-blue-600" size={16} />
                                                        <span className="font-medium text-blue-800">
                                                            Available Medicines ({pharmacy.availableMedicines.length})
                                                        </span>
                                                    </div>

                                                    {/* Featured medicines with prices */}
                                                    <div className="space-y-2 mb-3">
                                                        {pharmacy.availableMedicines.slice(0, 3).map((med, idx) => (
                                                            <div key={idx} className="bg-white/70 rounded-md p-2 flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <div className="text-sm font-medium text-gray-800">{med.name}</div>
                                                                    <div className="text-xs text-gray-500">{med.category}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-sm font-bold text-blue-600">₹{med.price}</div>
                                                                    <div className={`text-xs ${med.inStock ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {med.inStock ? 'In Stock' : 'Out of Stock'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Medicine categories */}
                                                    <div className="flex flex-wrap gap-1">
                                                        {[...new Set(pharmacy.availableMedicines.slice(0, 8).map(med => med.category))].map((category, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                                {category}
                                                            </span>
                                                        ))}
                                                        {pharmacy.availableMedicines.length > 8 && (
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                                                +{pharmacy.availableMedicines.length - 8} more categories
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-3 mt-4">
                                                {pharmacy.phone && (
                                                    <a
                                                        href={`tel:${pharmacy.phone}`}
                                                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 text-center text-sm font-medium"
                                                    >
                                                        📞 Call Now
                                                    </a>
                                                )}
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-center text-sm font-medium"
                                                >
                                                    🗺️ Directions
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default FindMedicine;