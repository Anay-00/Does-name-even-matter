import { motion } from 'framer-motion';

const SOSPreviewSection = ({ onSOSClick }) => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50"
        animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
        transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse' }}
      />

      {/* Floating emergency icons */}
      <motion.div className="absolute top-10 left-10 text-6xl opacity-10" animate={{ y: [0, -30, 0] }} transition={{ duration: 4, repeat: Infinity }}>
        🚨
      </motion.div>
      <motion.div className="absolute bottom-20 right-10 text-5xl opacity-10" animate={{ y: [0, 30, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }}>
        ❤️
      </motion.div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="p-8 md:p-12 glass-card rounded-2xl border-2 border-red-300 relative overflow-hidden"
          >
            {/* Pulsing glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 opacity-0 rounded-2xl"
              animate={{ opacity: [0, 0.1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-6xl"
                >
                  🚨
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-bold font-poppins text-gray-900">
                  Emergency SOS<span className="gradient-text-red"> Feature</span>
                </h2>
              </div>

              <p className="text-lg text-gray-700 mb-8 font-inter max-w-2xl">
                In life-threatening emergencies, activate SOS and instantly connect to the nearest hospital
                and ambulance. Our AI system prioritizes your case and dispatches resources in seconds.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { icon: '⚡', label: 'Instant Dispatch', description: 'Ambulance dispatched in seconds' },
                  { icon: '🗺️', label: 'GPS Matched', description: 'Nearest available resource' },
                  { icon: '📱', label: '24/7 Active', description: 'Always available for emergencies' },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-white/60 rounded-lg border border-red-200"
                  >
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.label}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={onSOSClick}
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 0 50px rgba(239, 68, 68, 0.6)',
                }}
                whileTap={{ scale: 0.95 }}
                animate={{ boxShadow: ['0 0 20px rgba(239, 68, 68, 0.3)', '0 0 40px rgba(239, 68, 68, 0.6)', '0 0 20px rgba(239, 68, 68, 0.3)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="px-8 py-4 md:py-6 gradient-red-orange text-white rounded-lg font-bold text-lg md:text-xl shadow-lg hover:shadow-2xl transition-all flex items-center justify-center gap-3 mx-auto"
              >
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                  🚨
                </motion.span>
                Activate Emergency SOS
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SOSPreviewSection;
