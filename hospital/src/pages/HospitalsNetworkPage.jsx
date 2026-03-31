import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import FloatingNavbar from '../components/FloatingNavbar';
import Footer from '../components/Footer';

const hospitalSeedData = [
  {
    id: 1,
    name: 'Apollo Hospital',
    location: 'MG Road, Bengaluru',
    city: 'Bengaluru',
    distanceKm: 2.1,
    icuBeds: 4,
    doctors: 12,
    ambulances: 2,
    ventilators: 6,
    emergencyAvailable: true,
    specialization: 'Cardiology',
    type: 'Private',
    emergencyContact: '+91 98765 10001',
    lat: 23,
    left: '18%',
    top: '32%',
  },
  {
    id: 2,
    name: 'City General Hospital',
    location: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    distanceKm: 3.6,
    icuBeds: 1,
    doctors: 9,
    ambulances: 1,
    ventilators: 3,
    emergencyAvailable: true,
    specialization: 'Trauma',
    type: 'Government',
    emergencyContact: '+91 98765 10002',
    lat: 12,
    left: '42%',
    top: '48%',
  },
  {
    id: 3,
    name: 'Sunrise Multi-Speciality',
    location: 'Whitefield, Bengaluru',
    city: 'Bengaluru',
    distanceKm: 5.2,
    icuBeds: 0,
    doctors: 7,
    ambulances: 0,
    ventilators: 1,
    emergencyAvailable: false,
    specialization: 'Neurology',
    type: 'Private',
    emergencyContact: '+91 98765 10003',
    lat: 0,
    left: '66%',
    top: '35%',
  },
  {
    id: 4,
    name: 'Metro Care Hospital',
    location: 'Jayanagar, Bengaluru',
    city: 'Bengaluru',
    distanceKm: 1.8,
    icuBeds: 6,
    doctors: 14,
    ambulances: 3,
    ventilators: 8,
    emergencyAvailable: true,
    specialization: 'Emergency Medicine',
    type: 'Private',
    emergencyContact: '+91 98765 10004',
    lat: 28,
    left: '29%',
    top: '66%',
  },
  {
    id: 5,
    name: 'State Medical Center',
    location: 'Hebbal, Bengaluru',
    city: 'Bengaluru',
    distanceKm: 7.4,
    icuBeds: 2,
    doctors: 11,
    ambulances: 1,
    ventilators: 4,
    emergencyAvailable: true,
    specialization: 'Cardiology',
    type: 'Government',
    emergencyContact: '+91 98765 10005',
    lat: 15,
    left: '80%',
    top: '56%',
  },
  {
    id: 6,
    name: 'Lifeline Hospital',
    location: 'Koramangala, Bengaluru',
    city: 'Bengaluru',
    distanceKm: 4.3,
    icuBeds: 3,
    doctors: 10,
    ambulances: 2,
    ventilators: 5,
    emergencyAvailable: true,
    specialization: 'Pulmonology',
    type: 'Private',
    emergencyContact: '+91 98765 10006',
    lat: 20,
    left: '55%',
    top: '72%',
  },
];

const filtersDefault = {
  city: 'All Cities',
  distance: 'Any',
  specialization: 'All',
  emergency: 'Any',
  type: 'Any',
};

const getAvailabilityStatus = (hospital) => {
  const score = hospital.icuBeds + hospital.ambulances + hospital.ventilators;

  if (score <= 1 || hospital.icuBeds === 0) return { label: 'Full', color: 'red' };
  if (score <= 5) return { label: 'Limited', color: 'yellow' };
  return { label: 'Available', color: 'green' };
};

const statusClassByColor = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
};

const HospitalsNetworkPage = ({ onHomeClick, onSOSClick, onLoginClick, onRegisterClick, onHospitalsClick, onTechnologyClick, onContactClick, onFindMedicineClick, onFindDoctorClick, onFeaturesClick }) => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(filtersDefault);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [animatedStats, setAnimatedStats] = useState({
    hospitals: 0,
    icuBeds: 0,
    ambulances: 0,
    doctors: 0,
  });

  const filteredHospitals = useMemo(() => {
    return hospitalSeedData.filter((hospital) => {
      const fullText = `${hospital.name} ${hospital.location} ${hospital.specialization}`.toLowerCase();
      const queryMatch = !search.trim() || fullText.includes(search.trim().toLowerCase());

      const cityMatch = filters.city === 'All Cities' || hospital.city === filters.city;
      const distanceMatch =
        filters.distance === 'Any' ||
        (filters.distance === '< 3 km' && hospital.distanceKm < 3) ||
        (filters.distance === '< 5 km' && hospital.distanceKm < 5) ||
        (filters.distance === '< 10 km' && hospital.distanceKm < 10);
      const specializationMatch = filters.specialization === 'All' || hospital.specialization === filters.specialization;
      const emergencyMatch =
        filters.emergency === 'Any' ||
        (filters.emergency === 'Available' && hospital.emergencyAvailable) ||
        (filters.emergency === 'Unavailable' && !hospital.emergencyAvailable);
      const typeMatch = filters.type === 'Any' || hospital.type === filters.type;

      return queryMatch && cityMatch && distanceMatch && specializationMatch && emergencyMatch && typeMatch;
    });
  }, [filters, search]);

  const statsTargets = useMemo(() => {
    const totals = filteredHospitals.reduce(
      (acc, hospital) => {
        acc.hospitals += 1;
        acc.icuBeds += hospital.icuBeds;
        acc.ambulances += hospital.ambulances;
        acc.doctors += hospital.doctors;
        return acc;
      },
      { hospitals: 0, icuBeds: 0, ambulances: 0, doctors: 0 }
    );

    return totals;
  }, [filteredHospitals]);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 900;

    const animate = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats({
        hospitals: Math.round(statsTargets.hospitals * ease),
        icuBeds: Math.round(statsTargets.icuBeds * ease),
        ambulances: Math.round(statsTargets.ambulances * ease),
        doctors: Math.round(statsTargets.doctors * ease),
      });

      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [statsTargets]);

  const filterChips = Object.entries(filters)
    .filter(([, value]) => !['All Cities', 'Any', 'All'].includes(value))
    .map(([key, value]) => ({ key, value }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50">
      <FloatingNavbar
        onSOSClick={onSOSClick}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        onHospitalsClick={onHospitalsClick}
        onTechnologyClick={onTechnologyClick}
        onContactClick={onContactClick}
        onFindMedicineClick={onFindMedicineClick}
        onFindDoctorClick={onFindDoctorClick}
        onFeaturesClick={onFeaturesClick}
        onHomeClick={onHomeClick}
        activeItem="Hospitals"
      />

      <div className="px-4 py-8 md:px-6">
      <div className="absolute inset-0 pointer-events-none">
        {['🏥', '🚑', '🩺', '❤️‍🩹'].map((icon, idx) => (
          <motion.span
            key={`${icon}-${idx}`}
            className="absolute text-3xl opacity-10"
            animate={{ y: [18, -20, 18], x: [0, idx % 2 ? -14 : 14, 0], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 6 + idx, repeat: Infinity, ease: 'easeInOut' }}
            style={{ left: `${9 + idx * 22}%`, top: `${12 + idx * 18}%` }}
          >
            {icon}
          </motion.span>
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl pt-20">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/40 bg-white/55 p-6 shadow-xl backdrop-blur-xl sm:p-8"
        >
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/40 bg-white/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Hospitals Network</p>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-800 sm:text-4xl">Connected Hospitals Saving Lives in Real Time</h1>
              <p className="mt-4 text-sm text-slate-600 sm:text-base">
                Discover verified hospitals in the MediSync network with live ICU capacity, emergency readiness, and on-duty specialists.
              </p>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Built for faster decisions in critical situations with city-wide visibility from one secure dashboard.
              </p>
              <button
                type="button"
                onClick={onHomeClick}
                className="mt-5 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
              >
                ← Back to Home
              </button>
            </div>

            <div className="relative h-[260px] overflow-hidden rounded-2xl border border-white/40 bg-white/60 sm:h-[300px]">
              <iframe
                title="hero-hospital-map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=77.45%2C12.85%2C77.76%2C13.10&layer=mapnik"
                className="absolute inset-0 h-full w-full"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent" />

              {filteredHospitals.map((hospital) => {
                const status = getAvailabilityStatus(hospital);
                return (
                  <button
                    key={`hero-marker-${hospital.id}`}
                    type="button"
                    onMouseEnter={() => setHoveredMarker(hospital.id)}
                    onMouseLeave={() => setHoveredMarker(null)}
                    onClick={() => setSelectedHospital(hospital)}
                    className="absolute"
                    style={{ left: hospital.left, top: hospital.top }}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.45, 0.8] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${statusClassByColor[status.color]} opacity-40`}
                    />
                    <span className={`relative block h-3 w-3 rounded-full ${statusClassByColor[status.color]}`} />
                  </button>
                );
              })}

              {hoveredMarker ? (
                <div className="absolute bottom-3 left-3 rounded-lg border border-white/40 bg-white/85 px-3 py-2 text-xs text-slate-700 shadow-lg">
                  {(() => {
                    const h = filteredHospitals.find((item) => item.id === hoveredMarker);
                    if (!h) return null;
                    return (
                      <>
                        <p className="font-bold text-slate-800">{h.name}</p>
                        <p>ICU Beds: {h.icuBeds}</p>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: '🏥', label: 'Total Hospitals Connected', value: animatedStats.hospitals },
            { icon: '🛏', label: 'ICU Beds Available', value: animatedStats.icuBeds },
            { icon: '🚑', label: 'Ambulances Active', value: animatedStats.ambulances },
            { icon: '👨‍⚕️', label: 'Doctors On Duty', value: animatedStats.doctors },
          ].map((card) => (
            <motion.div
              key={card.label}
              whileHover={{ y: -6 }}
              className="rounded-2xl border border-white/40 bg-white/60 p-5 shadow-lg backdrop-blur-lg"
            >
              <p className="text-xl">{card.icon}</p>
              <p className="mt-3 text-sm text-slate-600">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{card.value}</p>
            </motion.div>
          ))}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-lg backdrop-blur-lg">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_repeat(5,1fr)]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hospitals, ICU beds, doctors, or emergency services..."
              className="w-full rounded-xl border border-white/30 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
            />

            <select value={filters.city} onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))} className="rounded-xl border border-white/30 bg-white/80 px-3 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100">
              <option>All Cities</option>
              <option>Bengaluru</option>
            </select>
            <select value={filters.distance} onChange={(e) => setFilters((prev) => ({ ...prev, distance: e.target.value }))} className="rounded-xl border border-white/30 bg-white/80 px-3 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100">
              <option>Any</option>
              <option>{'< 3 km'}</option>
              <option>{'< 5 km'}</option>
              <option>{'< 10 km'}</option>
            </select>
            <select value={filters.specialization} onChange={(e) => setFilters((prev) => ({ ...prev, specialization: e.target.value }))} className="rounded-xl border border-white/30 bg-white/80 px-3 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100">
              <option>All</option>
              <option>Cardiology</option>
              <option>Trauma</option>
              <option>Neurology</option>
              <option>Emergency Medicine</option>
              <option>Pulmonology</option>
            </select>
            <select value={filters.emergency} onChange={(e) => setFilters((prev) => ({ ...prev, emergency: e.target.value }))} className="rounded-xl border border-white/30 bg-white/80 px-3 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100">
              <option>Any</option>
              <option>Available</option>
              <option>Unavailable</option>
            </select>
            <select value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))} className="rounded-xl border border-white/30 bg-white/80 px-3 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100">
              <option>Any</option>
              <option>Private</option>
              <option>Government</option>
            </select>
          </div>

          {filterChips.length > 0 ? (
            <motion.div layout className="mt-4 flex flex-wrap gap-2">
              {filterChips.map((chip) => (
                <motion.button
                  layout
                  key={chip.key}
                  type="button"
                  onClick={() => {
                    const resetValue = chip.key === 'city' ? 'All Cities' : chip.key === 'specialization' ? 'All' : 'Any';
                    setFilters((prev) => ({ ...prev, [chip.key]: resetValue }));
                  }}
                  className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                  {chip.value} ×
                </motion.button>
              ))}
            </motion.div>
          ) : null}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredHospitals.map((hospital) => {
              const status = getAvailabilityStatus(hospital);

              return (
                <motion.article
                  key={hospital.id}
                  whileHover={{ y: -6 }}
                  className="rounded-2xl border border-white/40 bg-white/65 p-5 shadow-lg backdrop-blur-lg transition hover:border-blue-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">🏥 {hospital.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">📍 {hospital.location}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{hospital.distanceKm} km</span>
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-slate-700">
                    <p>🛏 ICU Beds: <span className="font-semibold">{hospital.icuBeds} Available</span></p>
                    <p>👨‍⚕️ Doctors: <span className="font-semibold">{hospital.doctors} Available</span></p>
                    <p>🚑 Ambulances: <span className="font-semibold">{hospital.ambulances} Active</span></p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className={`h-2.5 w-2.5 rounded-full ${statusClassByColor[status.color]}`}
                    />
                    <span>{status.color === 'green' ? '🟢' : status.color === 'yellow' ? '🟡' : '🔴'} {status.label}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedHospital(hospital)}
                      className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow"
                    >
                      Request Emergency
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 rounded-2xl border border-white/40 bg-white/65 p-6 shadow-lg backdrop-blur-lg">
          <h2 className="text-2xl font-bold text-slate-800">AI Powered Emergency Hospital Matching</h2>
          <p className="mt-2 text-slate-600">Our intelligent system finds the nearest hospital with the required medical resources in seconds.</p>

          <div className="mt-5 grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded-xl bg-white/80 p-4 text-center font-semibold text-slate-700">Patient</div>
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-center text-xl text-blue-600">→</motion.span>
            <div className="rounded-xl bg-white/80 p-4 text-center font-semibold text-slate-700">MediSync AI System</div>
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-center text-xl text-blue-600">→</motion.span>
            <div className="rounded-xl bg-white/80 p-4 text-center font-semibold text-slate-700">Best Hospital Match</div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 mb-8 rounded-3xl border border-white/40 bg-white/70 p-6 text-center shadow-xl backdrop-blur-xl sm:p-8">
          <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl">Need Emergency Medical Help?</h2>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onSOSClick}
              className="rounded-full bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 font-semibold text-white shadow-lg"
            >
              🚨 Activate SOS
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 420, behavior: 'smooth' })}
              className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg"
            >
              🔍 Find Nearest Hospital
            </button>
          </div>
        </motion.section>
      </div>

      {selectedHospital ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl rounded-2xl border border-white/40 bg-white/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{selectedHospital.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{selectedHospital.location}</p>
              </div>
              <button type="button" onClick={() => setSelectedHospital(null)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">Close</button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Emergency Contact: <span className="font-semibold">{selectedHospital.emergencyContact}</span></div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">ICU Beds: <span className="font-semibold">{selectedHospital.icuBeds}</span></div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Ventilators: <span className="font-semibold">{selectedHospital.ventilators}</span></div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Ambulances: <span className="font-semibold">{selectedHospital.ambulances}</span></div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:col-span-2">Doctors by specialization: <span className="font-semibold">{selectedHospital.specialization}, Critical Care, General Medicine</span></div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button type="button" className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">Request ICU Bed</button>
              <button type="button" className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white">Call Hospital</button>
              <button type="button" className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700">View on Map</button>
            </div>
          </motion.div>
        </div>
      ) : null}

      </div>

      <Footer onNavigateHome={onHomeClick} />
    </div>
  );
};

export default HospitalsNetworkPage;
