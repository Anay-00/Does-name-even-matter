import { useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { FaHospital, FaAmbulance, FaBed, FaUserMd } from 'react-icons/fa';

const CountUpNumber = ({ end, duration = 2.5 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = end / (duration * 60);
    const interval = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(interval);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [end, duration]);

  return <span>{count}+</span>;
};

const StatsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const stats = [
    { label: 'Hospitals Connected', value: 250, icon: FaHospital, color: 'bg-blue-600' },
    { label: 'ICU Beds Available', value: 900, icon: FaBed, color: 'bg-green-600' },
    { label: 'Ambulances Active', value: 120, icon: FaAmbulance, color: 'bg-red-600' },
    { label: 'Doctors On Duty', value: 500, icon: FaUserMd, color: 'bg-purple-600' },
  ];

  return (
    <section ref={ref} id="stats" className="py-20 px-4 bg-gray-50 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-poppins mb-4 text-gray-900">
            Our Growing Healthcare<span className="text-blue-600"> Network</span>
          </h2>
          <p className="text-gray-600 text-lg">Real-time statistics from MediSync AI network</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const IconComponent = stat.icon;
            return (
              <div key={stat.label} className="group relative overflow-hidden">
                {/* Card */}
                <div className="relative bg-white rounded-2xl p-8 border border-gray-200 shadow-lg h-full flex flex-col hover:shadow-xl transition-shadow">
                  {/* Icon */}
                  <div className={`${stat.color} w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl mb-4`}>
                    <IconComponent size={32} />
                  </div>

                  {/* Number */}
                  <p className="text-4xl md:text-5xl font-bold text-gray-900 font-poppins">
                    {inView && <CountUpNumber end={stat.value} />}
                  </p>

                  {/* Label */}
                  <p className="mt-4 text-gray-700 font-inter font-medium">{stat.label}</p>

                  {/* Bottom accent */}
                  <div className={`mt-auto h-1 ${stat.color} rounded-full w-full`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
