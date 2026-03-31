import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa';

const SmartSearchSection = () => {
  const [filters, setFilters] = useState({
    searchQuery: '',
    city: '',
    distance: '10',
    specialization: '',
    emergencyLevel: 'moderate',
  });

  const [showResults, setShowResults] = useState(false);

  const mockResults = [
    {
      id: 1,
      name: 'Apollo Hospital',
      icuBeds: 4,
      ambulances: 2,
      doctors: 'Cardiologists',
      distance: 2.1,
      available: true,
    },
    {
      id: 2,
      name: 'City Care Medical Center',
      icuBeds: 6,
      ambulances: 3,
      doctors: 'General Physicians',
      distance: 3.5,
      available: true,
    },
    {
      id: 3,
      name: 'Emergency Care Clinic',
      icuBeds: 2,
      ambulances: 1,
      doctors: 'Trauma Specialists',
      distance: 5.2,
      available: false,
    },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    setShowResults(true);
  };

  return (
    <section className="py-20 px-4 bg-white relative overflow-hidden">
      <div className="container mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-poppins mb-4 text-gray-900">
            Smart Emergency Resource<span className="gradient-text-blue-cyan"> Search</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Find ICU beds, ventilators, ambulances, or specialists in real-time across our network
          </p>
        </motion.div>

        {/* Search form */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-12 p-8 glass-card rounded-2xl border border-blue-200/50"
        >
          {/* Main search input */}
          <div className="mb-6">
            <div className="relative">
              <FaSearch className="absolute left-4 top-4 text-blue-500 text-xl" />
              <input
                type="text"
                placeholder="Search ICU beds, ventilators, ambulances, or specialists..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full pl-12 pr-4 py-4 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900 font-inter"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900 bg-white font-inter"
            >
              <option value="">Select City</option>
              <option value="indore">Indore</option>
              <option value="delhi">Delhi</option>
              <option value="mumbai">Mumbai</option>
            </select>

            <select
              value={filters.distance}
              onChange={(e) => setFilters({ ...filters, distance: e.target.value })}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900 bg-white font-inter"
            >
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="20">20 km</option>
              <option value="50">50 km</option>
            </select>

            <select
              value={filters.specialization}
              onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900 bg-white font-inter"
            >
              <option value="">Any Specialization</option>
              <option value="cardiology">Cardiology</option>
              <option value="trauma">Trauma</option>
              <option value="neurology">Neurology</option>
            </select>

            <select
              value={filters.emergencyLevel}
              onChange={(e) => setFilters({ ...filters, emergencyLevel: e.target.value })}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900 bg-white font-inter"
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Search button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-4 gradient-blue-cyan text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <FaSearch /> Find Healthcare Resources
          </motion.button>
        </motion.form>

        {/* Results */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-4"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Resources ({mockResults.length})</h3>

            {mockResults.map((result, idx) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-6 glass-card rounded-xl border-2 ${
                  result.available
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-gray-200 opacity-60'
                } hover-lift`}
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">
                      🏥 {result.name}
                    </h4>
                    <p className="text-gray-600 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-blue-500" />
                      Distance: {result.distance} km
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">ICU Beds</p>
                    <p className="text-2xl font-bold text-blue-600">{result.icuBeds}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">Ambulances</p>
                    <p className="text-2xl font-bold text-red-600">🚑 {result.ambulances}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">Specialists</p>
                    <p className="text-sm font-semibold text-gray-900">{result.doctors}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 gradient-blue-cyan text-white rounded-lg font-semibold"
                    >
                      Request Bed
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-lg font-semibold hover:bg-blue-50"
                    >
                      View Hospital
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default SmartSearchSection;
