import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { FaAmbulance, FaBed, FaNetworkWired } from 'react-icons/fa';

const ProblemsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const problems = [
    {
      title: 'Ambulance Delays',
      description: 'Patients struggle to find ambulances quickly.',
      icon: <FaAmbulance className="text-5xl text-blue-600" />,
    },
    {
      title: 'ICU Bed Shortage',
      description: 'Hospitals lack real-time bed availability.',
      icon: <FaBed className="text-5xl text-blue-600" />,
    },
    {
      title: 'Hospital Disconnection',
      description: 'Healthcare systems operate independently.',
      icon: <FaNetworkWired className="text-5xl text-blue-600" />,
    },
  ];

  return (
    <section ref={ref} id="problems" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          className="text-4xl font-bold text-center text-gray-900 font-poppins mb-12"
        >
          Why Emergency Healthcare Needs Innovation
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition"
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              whileHover={{
                y: -15,
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(20, 184, 166, 0.1))',
              }}
            >
              <motion.div
                className="mb-6"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                whileHover={{ rotate: 10, scale: 1.1 }}
              >
                {p.icon}
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 font-poppins mb-3">{p.title}</h3>
              <p className="text-gray-700 font-inter">{p.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemsSection;
