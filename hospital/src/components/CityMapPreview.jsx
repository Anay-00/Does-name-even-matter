import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaCircle } from 'react-icons/fa';

const CityMapPreview = () => {
  const hospitals = [
    { top: '25%', left: '20%', name: 'St. Mary Hospital', status: 'available', beds: 8 },
    { top: '45%', left: '70%', name: 'City Medical Center', status: 'available', beds: 4 },
    { top: '75%', left: '30%', name: 'Emergency Clinic', status: 'full', beds: 0 },
    { top: '35%', left: '50%', name: 'Apollo Hospital', status: 'limited', beds: 2 },
  ];

  return (
    <section id="map" className="py-20 px-4 bg-white relative overflow-hidden">
      {/* Background animation */}
      <motion.div
        className="absolute inset-0 opacity-5"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full w-96 h-96 blur-3xl" />
      </motion.div>

      <div className="container mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-poppins mb-4 text-gray-900">
            Live Hospital Resource<span className="gradient-text-blue-cyan"> Map</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Real-time visualization of hospital availability and emergency response coordination across the network
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Interactive Map */}
          <motion.div
            className="lg:col-span-2 relative h-96 md:h-96 bg-gradient-to-br from-blue-100 via-cyan-100 to-blue-50 rounded-2xl overflow-hidden shadow-xl border-2 border-blue-200"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Map background pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0EA5E9" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Hospital markers */}
            {hospitals.map((hospital, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{ top: hospital.top, left: hospital.left }}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                {/* Pulsing ring background */}
                <motion.div
                  className={`absolute inset-0 rounded-full border-2 ${
                    hospital.status === 'available'
                      ? 'border-green-400'
                      : hospital.status === 'limited'
                      ? 'border-yellow-400'
                      : 'border-red-400'
                  }`}
                  animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: '32px', height: '32px' }}
                />

                {/* Hospital marker */}
                <motion.div
                  className={`relative w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-white text-lg cursor-pointer ${
                    hospital.status === 'available'
                      ? 'bg-gradient-to-br from-green-400 to-green-500'
                      : hospital.status === 'limited'
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                      : 'bg-gradient-to-br from-red-400 to-red-500'
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🏥
                </motion.div>

                {/* Hospital name tooltip on hover */}
                <motion.div
                  className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-lg opacity-0 pointer-events-none"
                  whileHover={{ opacity: 1 }}
                >
                  {hospital.name}
                </motion.div>
              </motion.div>
            ))}

            {/* Emergency location indicator */}
            <motion.div
              className="absolute top-2/3 left-1/2 transform -translate-x-1/2"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="text-5xl drop-shadow-lg">🚑</div>
            </motion.div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-bold text-gray-900 mb-2">Status Legend:</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <FaCircle className="text-green-500" /> Available
                </div>
                <div className="flex items-center gap-2">
                  <FaCircle className="text-yellow-500" /> Limited
                </div>
                <div className="flex items-center gap-2">
                  <FaCircle className="text-red-500" /> Full
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hospital Details Panel */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Hospital Network Status</h3>

            {hospitals.map((hospital, i) => (
              <motion.div
                key={i}
                className={`p-4 rounded-lg border-2 glass-card ${
                  hospital.status === 'available'
                    ? 'border-green-300 bg-green-50/50'
                    : hospital.status === 'limited'
                    ? 'border-yellow-300 bg-yellow-50/50'
                    : 'border-red-300 bg-red-50/50'
                }`}
                whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)' }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-gray-900">{hospital.name}</h4>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <FaCircle
                        className={
                          hospital.status === 'available'
                            ? 'text-green-500'
                            : hospital.status === 'limited'
                            ? 'text-yellow-500'
                            : 'text-red-500'
                        }
                      />
                      {hospital.status === 'available'
                        ? 'Beds Available'
                        : hospital.status === 'limited'
                        ? 'Limited Beds'
                        : 'No Beds Available'}
                    </p>
                  </div>
                  <motion.span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      hospital.status === 'available'
                        ? 'bg-green-200 text-green-800'
                        : hospital.status === 'limited'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-red-200 text-red-800'
                    }`}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  >
                    {hospital.beds} ICU
                  </motion.span>
                </div>
              </motion.div>
            ))}

            {/* Overall Stats */}
            <motion.div
              className="mt-6 p-4 rounded-lg glass-card border-2 border-blue-200 bg-blue-50/50"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-sm text-gray-600 mb-2">Network Total</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                14 ICU Beds
              </p>
              <p className="text-xs text-gray-600 mt-2">Across 4 hospitals</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CityMapPreview;
