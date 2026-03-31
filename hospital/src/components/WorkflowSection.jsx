import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { FaSearch, FaMapMarkerAlt, FaAmbulance } from 'react-icons/fa';

const WorkflowSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const steps = [
    {
      number: 1,
      title: 'Search Emergency Resources',
      description: 'Use AI-powered search to find ICU beds, specialists, and ambulances in your area',
      icon: <FaSearch />,
      color: 'from-blue-500 to-cyan-500',
      details: ['Real-time availability', 'Smart filtering', 'Distance-based'],
    },
    {
      number: 2,
      title: 'Find Nearest Hospital with Available ICU',
      description: 'AI matches your emergency with the best available hospital in your vicinity',
      icon: <FaMapMarkerAlt />,
      color: 'from-cyan-500 to-green-500',
      details: ['AI matching', 'Live tracking', 'Bed availability'],
    },
    {
      number: 3,
      title: 'Ambulance Dispatch and Patient Transfer',
      description: 'Nearest ambulance is automatically dispatched and patient reaches hospital safely',
      icon: <FaAmbulance />,
      color: 'from-red-500 to-orange-500',
      details: ['Auto dispatch', 'GPS tracking', 'Real-time updates'],
    },
  ];

  return (
    <section ref={ref} id="workflow" className="py-20 px-4 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      {/* Background decoration */}
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
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-poppins mb-4 text-gray-900">
            How MediSync AI<span className="gradient-text-blue-cyan"> Works</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Three simple steps to connect you with life-saving healthcare resources
          </p>
        </motion.div>

        {/* Desktop view - Horizontal flow */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Connecting line */}
            <motion.svg
              className="absolute top-24 left-0 w-full h-2"
              viewBox="0 0 1200 10"
              preserveAspectRatio="none"
              style={{ zIndex: 0 }}
            >
              <motion.path
                d="M 0 5 L 1200 5"
                stroke="url(#gradient)"
                strokeWidth="3"
                fill="none"
                strokeDasharray="1200"
                initial={{ strokeDashoffset: 1200 }}
                animate={inView ? { strokeDashoffset: 0 } : { strokeDashoffset: 1200 }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0EA5E9" />
                  <stop offset="50%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
            </motion.svg>

            {/* Steps */}
            <div className="grid grid-cols-3 gap-8 relative z-10">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, duration: 0.8 }}
                  className="flex flex-col items-center"
                >
                  {/* Step circle */}
                  <motion.div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} text-white flex items-center justify-center mb-6 shadow-lg relative`}
                    whileHover={{
                      scale: 1.15,
                      boxShadow: `0 0 30px ${step.color.includes('blue') ? 'rgba(14, 165, 233, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
                    }}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <span className="text-4xl">{step.icon}</span>
                  </motion.div>

                  {/* Step content */}
                  <div className="text-center">
                    <div className={`text-4xl font-bold bg-gradient-to-r ${step.color} bg-clip-text text-transparent mb-2`}>
                      {step.number}️⃣
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{step.description}</p>
                    <div className="space-y-2">
                      {step.details.map((detail, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 + idx * 0.1 }}
                          className="text-xs text-blue-600 font-semibold"
                        >
                          ✓ {detail}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile view - Vertical flow */}
        <div className="md:hidden space-y-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="flex gap-6"
            >
              {/* Number and Line */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.color} text-white flex items-center justify-center text-2xl font-bold shadow-lg`}
                >
                  {step.number}
                </motion.div>
                {i < steps.length - 1 && (
                  <motion.div
                    className={`w-1 h-12 bg-gradient-to-b ${step.color} mt-2`}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.2 }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{step.description}</p>
                <div className="space-y-1">
                  {step.details.map((detail, idx) => (
                    <p key={idx} className="text-xs text-blue-600 font-semibold">
                      ✓ {detail}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
