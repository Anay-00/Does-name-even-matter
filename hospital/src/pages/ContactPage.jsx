import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope,
  FaHospital,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaQuestionCircle,
  FaRegCommentDots,
  FaUser,
  FaUserTag,
} from 'react-icons/fa';
import FloatingNavbar from '../components/FloatingNavbar';
import Footer from '../components/Footer';

const contactCards = [
  {
    icon: <FaPhoneAlt className="text-xl text-blue-600" />,
    title: 'Phone Support',
    value: '+91 XXX XXX XXXX',
  },
  {
    icon: <FaEnvelope className="text-xl text-blue-600" />,
    title: 'Email Support',
    value: 'support@MediSync.ai',
    isEmail: true,
  },
  {
    icon: <FaMapMarkerAlt className="text-xl text-blue-600" />,
    title: 'Headquarters Location',
    value: 'Healthcare Innovation Center',
  },
];

const faqItems = [
  {
    q: 'How do hospitals join MediSync AI?',
    a: 'Hospitals can submit onboarding details through the partnership section. Our team then verifies infrastructure and activates live resource integration.',
  },
  {
    q: 'How does the SOS system work?',
    a: 'SOS triggers real-time matching between nearby hospitals and ambulance teams based on availability, distance, and emergency requirements.',
  },
  {
    q: 'How can I request emergency services?',
    a: 'Use the Activate SOS button to send your emergency request. MediSync routes it instantly to the nearest eligible response network.',
  },
];

const ContactPage = ({ onHomeClick, onSOSClick, onLoginClick, onRegisterClick, onHospitalsClick, onTechnologyClick, onContactClick, onFindMedicineClick, onFindDoctorClick, onFeaturesClick }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    userType: 'Patient',
    subject: '',
    message: '',
  });
  const [openFaq, setOpenFaq] = useState(0);

  const handleSubmit = (event) => {
    event.preventDefault();
    alert('Message sent successfully. Our team will contact you shortly.');
    setFormData({
      fullName: '',
      email: '',
      mobile: '',
      userType: 'Patient',
      subject: '',
      message: '',
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gray-50 text-gray-900">
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
        activeItem="Contact"
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-28 pb-16 md:px-6 space-y-16">
        <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-8 shadow-sm md:p-12">
          <div className="pointer-events-none absolute inset-0">
            {[
              { icon: '🏥', left: '10%', top: '22%' },
              { icon: '🚑', left: '78%', top: '20%' },
              { icon: '📞', left: '18%', top: '72%' },
              { icon: '📍', left: '84%', top: '70%' },
            ].map((item, index) => (
              <motion.span
                key={`${item.icon}-${index}`}
                className="absolute text-3xl opacity-15"
                style={{ left: item.left, top: item.top }}
                animate={{ y: [0, -12, 0], opacity: [0.08, 0.2, 0.08] }}
                transition={{ duration: 4 + index, repeat: Infinity, ease: 'easeInOut' }}
              >
                {item.icon}
              </motion.span>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10 max-w-4xl">
            <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">Get in Touch with MediSync AI</h1>
            <p className="mt-5 text-base text-gray-600 md:text-lg">
              We’re here to help hospitals, patients, and emergency responders connect faster and save lives through real-time healthcare coordination.
            </p>
          </motion.div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold md:text-4xl">Contact Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {contactCards.map((card) => (
              <motion.article
                key={card.title}
                whileHover={{ y: -8, boxShadow: '0 18px 35px rgba(59,130,246,0.18)' }}
                className="rounded-2xl border border-blue-100 bg-white/70 p-6 backdrop-blur-lg shadow-sm"
              >
                <div className="mb-4 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">{card.icon}</div>
                <h3 className="text-lg font-semibold">{card.title}</h3>
                {card.isEmail ? (
                  <a href={`mailto:${card.value}`} className="mt-2 block text-blue-700 hover:underline">
                    {card.value}
                  </a>
                ) : (
                  <p className="mt-2 text-gray-600">{card.value}</p>
                )}
              </motion.article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm lg:col-span-3 md:p-8"
          >
            <h2 className="text-2xl font-bold md:text-3xl">Send Message</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputField icon={<FaUser />} placeholder="Full Name" value={formData.fullName} onChange={(value) => setFormData((prev) => ({ ...prev, fullName: value }))} />
              <InputField icon={<FaEnvelope />} type="email" placeholder="Email Address" value={formData.email} onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))} />
              <InputField icon={<FaPhoneAlt />} type="tel" placeholder="Mobile Number" value={formData.mobile} onChange={(value) => setFormData((prev) => ({ ...prev, mobile: value }))} />
              <SelectField
                icon={<FaUserTag />}
                value={formData.userType}
                onChange={(value) => setFormData((prev) => ({ ...prev, userType: value }))}
                options={['Patient', 'Hospital', 'Ambulance', 'Partner']}
              />
            </div>

            <div className="mt-4 space-y-4">
              <InputField icon={<FaRegCommentDots />} placeholder="Subject" value={formData.subject} onChange={(value) => setFormData((prev) => ({ ...prev, subject: value }))} />
              <div className="relative">
                <FaRegCommentDots className="pointer-events-none absolute left-4 top-4 text-blue-500" />
                <textarea
                  required
                  value={formData.message}
                  onChange={(event) => setFormData((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Message"
                  rows={5}
                  className="w-full rounded-2xl border border-blue-200 bg-white py-3 pl-11 pr-4 text-gray-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 font-semibold text-white"
            >
              Send Message
            </motion.button>
          </motion.form>

          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold">Need Immediate Medical Help?</h3>
              <p className="mt-3 text-gray-600">This connects you to nearest hospitals and ambulance services in real time.</p>
              <motion.button
                onClick={onSOSClick}
                whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(239,68,68,0.65)' }}
                whileTap={{ scale: 0.98 }}
                animate={{ boxShadow: ['0 0 10px rgba(239,68,68,0.45)', '0 0 28px rgba(239,68,68,0.8)', '0 0 10px rgba(239,68,68,0.45)'] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mt-5 w-full rounded-full bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 font-bold text-white"
              >
                🚨 Activate Emergency SOS
              </motion.button>
            </section>

            <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold">Join the MediSync Hospital Network</h3>
              <p className="mt-3 text-gray-600">
                Hospitals can integrate with MediSync AI to provide real-time updates on ICU beds, doctors, and emergency services.
              </p>
              <motion.button
                onClick={onRegisterClick}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                className="mt-5 rounded-full border border-blue-300 bg-blue-50 px-6 py-3 font-semibold text-blue-700"
              >
                🏥 Register Your Hospital
              </motion.button>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="relative h-24">
                  {[{ left: '12%', top: '38%' }, { left: '46%', top: '20%' }, { left: '78%', top: '48%' }].map((node, idx) => (
                    <div key={idx} className="absolute" style={{ left: node.left, top: node.top }}>
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2 + idx, repeat: Infinity }} className="w-9 h-9 rounded-full bg-white border border-blue-200 flex items-center justify-center">
                        <FaHospital className="text-blue-600" />
                      </motion.div>
                    </div>
                  ))}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <motion.path d="M15 24 L46 13 L80 28" fill="transparent" stroke="rgba(59,130,246,0.65)" strokeWidth="1.2" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
                  </svg>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold md:text-3xl">MediSync AI Operations Center</h2>
            <p className="mt-3 text-gray-600">Main coordination and support center for platform operations.</p>
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-blue-100">
              <iframe
                title="MediSync-operations-map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=77.56%2C12.93%2C77.66%2C13.03&layer=mapnik"
                className="h-64 w-full"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-blue-900/10 to-transparent" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.15, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="absolute -inset-3 rounded-full bg-red-500/40"
                />
                <FaMapMarkerAlt className="relative text-3xl text-red-600" />
              </div>
            </div>
          </motion.div>

          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold md:text-3xl">FAQ / Quick Help</h2>
            <div className="mt-5 space-y-3">
              {faqItems.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={item.q} className="rounded-2xl border border-blue-100 bg-blue-50/40 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    >
                      <span className="font-medium text-gray-800 flex items-center gap-2"><FaQuestionCircle className="text-blue-600" />{item.q}</span>
                      <span className="text-blue-700 font-bold">{isOpen ? '−' : '+'}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 text-gray-600"
                        >
                          {item.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        <section id="contact" className="rounded-3xl border border-cyan-300/30 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 p-8 text-center md:p-12">
          <h2 className="text-3xl font-extrabold md:text-5xl">Together We Can Build a Connected Healthcare Network</h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <motion.button
              onClick={onSOSClick}
              whileHover={{ scale: 1.05, boxShadow: '0 0 24px rgba(239,68,68,0.8)' }}
              whileTap={{ scale: 0.96 }}
              className="rounded-full bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 font-semibold text-white"
            >
              🚨 Activate SOS
            </motion.button>
            <motion.button
              onClick={onHospitalsClick}
              whileHover={{ scale: 1.05, boxShadow: '0 0 24px rgba(34,211,238,0.55)' }}
              whileTap={{ scale: 0.96 }}
              className="rounded-full border border-cyan-300/40 bg-white/85 px-6 py-3 font-semibold"
            >
              🏥 Explore Hospitals
            </motion.button>
          </div>
        </section>
      </main>

      <Footer onNavigateHome={onHomeClick} />
    </div>
  );
};

const InputField = ({ icon, placeholder, value, onChange, type = 'text' }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">{icon}</span>
    <input
      required
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-full border border-blue-200 bg-white py-3 pl-11 pr-4 text-gray-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    />
  </div>
);

const SelectField = ({ icon, value, onChange, options }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">{icon}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-full border border-blue-200 bg-white py-3 pl-11 pr-4 text-gray-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

export default ContactPage;
