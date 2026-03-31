import { motion } from 'framer-motion';

const HeroMapAnimation = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl overflow-hidden border border-slate-200/50 shadow-xl">
      <iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=72.85%2C18.95%2C72.95%2C19.05&layer=mapnik&marker=19.0%2C72.9"
        className="w-full h-full rounded-2xl"
        title="OpenStreetMap - Mumbai Healthcare Network"
        loading="lazy"
      ></iframe>
      {/* Overlay for branding */}
      <motion.div
        className="absolute top-3 left-3 lg:top-4 lg:left-4 bg-white/90 backdrop-blur-md rounded-xl p-3 lg:p-4 border border-white/60 shadow-lg max-w-xs text-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-xs lg:text-sm">
          <span className="text-lg">🏥</span> MediSync Network
        </h3>
        <div className="space-y-2 text-xs lg:text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Hospitals:</span>
            <span className="font-semibold text-green-600">50+ Connected</span>
          </div>
          <div className="flex justify-between">
            <span>Ambulances:</span>
            <span className="font-semibold text-blue-600">Real-time Tracking</span>
          </div>
          <div className="flex justify-between">
            <span>Coverage:</span>
            <span className="font-semibold text-red-600">City-wide</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HeroMapAnimation;
