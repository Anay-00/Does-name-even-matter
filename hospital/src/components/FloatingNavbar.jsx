import { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FaHospital, FaBars, FaTimes } from 'react-icons/fa';

const FloatingNavbar = ({ onSOSClick, onLoginClick, onRegisterClick, onHospitalsClick, onTechnologyClick, onContactClick, onFindMedicineClick, onFindDoctorClick, onHomeClick, onFeaturesClick, activeItem }) => {
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const menuItems = ['Home', 'Features', 'Find Doctor', 'Find Medicine', 'Hospitals', 'Technology', 'Contact'];
  const handleSectionNavigation = (item) => {
    const targetHash = `#${item.toLowerCase()}`;
    if (onHomeClick) {
      onHomeClick();
      setTimeout(() => {
        window.location.hash = targetHash;
      }, 0);
      return;
    }

    window.location.hash = targetHash;
  };

  const navbarScale = useTransform(scrollY, [0, 100], [1, 0.95]);
  return (
    <motion.nav
      style={{ scale: navbarScale }}
      className="fixed top-0 left-0 right-0 z-50 w-full"
    >
      <motion.div className="bg-white/60 backdrop-blur-lg shadow-lg px-8 py-4 w-full">
        <div className="flex items-center justify-between space-x-6 max-w-7xl mx-auto">
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <FaHospital className="text-2xl text-blue-600" />
            </motion.div>
            <span className="text-lg font-bold text-blue-600 font-poppins">MediSync</span>
          </motion.div>

          <ul className="hidden md:flex space-x-6 text-gray-700">
            {menuItems.map((item, i) => (
              <motion.li key={item} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                {item === 'Home' ? (
                  <motion.button
                    type="button"
                    onClick={onHomeClick || (() => {})}
                    className={`relative font-inter ${activeItem === item ? 'text-blue-700' : ''}`}
                    whileHover={{ color: '#2563EB' }}
                  >
                    {item}
                    <motion.div className={`absolute bottom-0 h-0.5 bg-blue-600 origin-center ${activeItem === item ? 'left-0 w-full' : 'left-1/2 w-0'}`} whileHover={activeItem === item ? undefined : { width: '100%', x: '-50%' }} transition={{ duration: 0.3 }} />
                  </motion.button>
                ) : item === 'Hospitals' ? (
                  <motion.button
                    type="button"
                    onClick={onHospitalsClick || (() => {})}
                    className={`relative font-inter ${activeItem === item ? 'text-blue-700' : ''}`}
                    whileHover={{ color: '#2563EB' }}
                  >
                    {item}
                    <motion.div className={`absolute bottom-0 h-0.5 bg-blue-600 origin-center ${activeItem === item ? 'left-0 w-full' : 'left-1/2 w-0'}`} whileHover={activeItem === item ? undefined : { width: '100%', x: '-50%' }} transition={{ duration: 0.3 }} />
                  </motion.button>
                ) : item === 'Features' ? (
                  <motion.button
                    type="button"
                    onClick={onFeaturesClick || (() => {})}
                    className={`relative font-inter ${activeItem === item ? 'text-blue-700' : ''}`}
                    whileHover={{ color: '#2563EB' }}
                  >
                    {item}
                    <motion.div className={`absolute bottom-0 h-0.5 bg-blue-600 origin-center ${activeItem === item ? 'left-0 w-full' : 'left-1/2 w-0'}`} whileHover={activeItem === item ? undefined : { width: '100%', x: '-50%' }} transition={{ duration: 0.3 }} />
                  </motion.button>                ) : item === 'Find Doctor' ? (
                  <motion.button
                    type="button"
                    onClick={onFindDoctorClick || (() => {})}
                    className={`relative font-inter ${activeItem === item ? 'text-blue-700' : ''}`}
                    whileHover={{ color: '#2563EB' }}
                  >
                    {item}
                    <motion.div className={`absolute bottom-0 h-0.5 bg-blue-600 origin-center ${activeItem === item ? 'left-0 w-full' : 'left-1/2 w-0'}`} whileHover={activeItem === item ? undefined : { width: '100%', x: '-50%' }} transition={{ duration: 0.3 }} />
                  </motion.button>                ) : item === 'Technology' ? (
                  <motion.button
                    type="button"
                    onClick={onTechnologyClick || (() => {})}
                    className={`relative font-inter ${activeItem === item ? 'text-blue-700' : ''}`}
                    whileHover={{ color: '#2563EB' }}
                  >
                    {item}
                    <motion.div className={`absolute bottom-0 h-0.5 bg-blue-600 origin-center ${activeItem === item ? 'left-0 w-full' : 'left-1/2 w-0'}`} whileHover={activeItem === item ? undefined : { width: '100%', x: '-50%' }} transition={{ duration: 0.3 }} />
                  </motion.button>
                ) : item === 'Find Medicine' ? (
                  <motion.button
                    type="button"
                    onClick={onFindMedicineClick || (() => {})}
                    className={`relative font-inter ${activeItem === item ? 'text-blue-700' : ''}`}
                    whileHover={{ color: '#2563EB' }}
                  >
                    {item}
                    <motion.div className={`absolute bottom-0 h-0.5 bg-blue-600 origin-center ${activeItem === item ? 'left-0 w-full' : 'left-1/2 w-0'}`} whileHover={activeItem === item ? undefined : { width: '100%', x: '-50%' }} transition={{ duration: 0.3 }} />
                  </motion.button>
                ) : item === 'Contact' ? (
                  <motion.button
                    type="button"
                    onClick={onContactClick || (() => handleSectionNavigation(item))}
                    className={`relative font-inter ${activeItem === item ? 'text-blue-700' : ''}`}
                    whileHover={{ color: '#2563EB' }}
                  >
                    {item}
                    <motion.div className={`absolute bottom-0 h-0.5 bg-blue-600 origin-center ${activeItem === item ? 'left-0 w-full' : 'left-1/2 w-0'}`} whileHover={activeItem === item ? undefined : { width: '100%', x: '-50%' }} transition={{ duration: 0.3 }} />
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => handleSectionNavigation(item)}
                    className={`relative font-inter ${activeItem === item ? 'text-blue-700' : ''}`}
                    whileHover={{ color: '#2563EB' }}
                  >
                    {item}
                    <motion.div className={`absolute bottom-0 h-0.5 bg-blue-600 origin-center ${activeItem === item ? 'left-0 w-full' : 'left-1/2 w-0'}`} whileHover={activeItem === item ? undefined : { width: '100%', x: '-50%' }} transition={{ duration: 0.3 }} />
                  </motion.button>
                )}
              </motion.li>
            ))}
          </ul>

          <div className="hidden md:flex space-x-2">
            <motion.button
              onClick={onLoginClick}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-full"
              whileHover={{ scale: 1.05, y: -2 }}
            >
              Login
            </motion.button>
            <motion.button
              onClick={onRegisterClick}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full"
              whileHover={{ scale: 1.05, y: -2 }}
            >
              Register
            </motion.button>
            <motion.button
              onClick={onSOSClick}
              whileHover={{
                scale: 1.1,
                y: -4,
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.7)',
              }}
              animate={{
                boxShadow: ['0 0 10px rgba(239, 68, 68, 0.5)', '0 0 30px rgba(239, 68, 68, 0.9)', '0 0 10px rgba(239, 68, 68, 0.5)'],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="ml-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full font-bold text-sm"
            >
              🚨 Activate SOS
            </motion.button>
          </div>

          <button className="md:hidden text-gray-700" onClick={() => setOpen(!open)}>
            {open ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:hidden mt-4 bg-white rounded-lg">
            <ul className="flex flex-col space-y-2 p-4">
              {menuItems.map((item) => (
                <li key={item}>
                  {item === 'Home' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onHomeClick?.();
                        setOpen(false);
                      }}
                      className={`text-gray-700 hover:text-blue-600 ${activeItem === item ? 'text-blue-700 font-semibold' : ''}`}
                    >
                      {item}
                    </button>
                  ) : item === 'Hospitals' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onHospitalsClick?.();
                        setOpen(false);
                      }}
                      className={`text-gray-700 hover:text-blue-600 ${activeItem === item ? 'text-blue-700 font-semibold' : ''}`}
                    >
                      {item}
                    </button>
                  ) : item === 'Features' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onFeaturesClick?.();
                        setOpen(false);
                      }}
                      className={`text-gray-700 hover:text-blue-600 ${activeItem === item ? 'text-blue-700 font-semibold' : ''}`}
                    >
                      {item}
                    </button>
                  ) : item === 'Find Doctor' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onFindDoctorClick?.();
                        setOpen(false);
                      }}
                      className={`text-gray-700 hover:text-blue-600 ${activeItem === item ? 'text-blue-700 font-semibold' : ''}`}
                    >
                      {item}
                    </button>
                  ) : item === 'Technology' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onTechnologyClick?.();
                        setOpen(false);
                      }}
                      className={`text-gray-700 hover:text-blue-600 ${activeItem === item ? 'text-blue-700 font-semibold' : ''}`}
                    >
                      {item}
                    </button>
                  ) : item === 'Find Medicine' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onFindMedicineClick?.();
                        setOpen(false);
                      }}
                      className={`text-gray-700 hover:text-blue-600 ${activeItem === item ? 'text-blue-700 font-semibold' : ''}`}
                    >
                      {item}
                    </button>
                  ) : item === 'Contact' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onContactClick) {
                          onContactClick();
                        } else {
                          handleSectionNavigation(item);
                        }
                        setOpen(false);
                      }}
                      className={`text-gray-700 hover:text-blue-600 ${activeItem === item ? 'text-blue-700 font-semibold' : ''}`}
                    >
                      {item}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleSectionNavigation(item);
                        setOpen(false);
                      }}
                      className={`text-gray-700 hover:text-blue-600 ${activeItem === item ? 'text-blue-700 font-semibold' : ''}`}
                    >
                      {item}
                    </button>
                  )}
                </li>
              ))}
              <button
                onClick={() => {
                  onLoginClick?.();
                  setOpen(false);
                }}
                className="mt-2 w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-blue-700"
              >
                Login
              </button>
              <button
                onClick={() => {
                  onRegisterClick?.();
                  setOpen(false);
                }}
                className="mt-2 w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white"
              >
                Register
              </button>
              <motion.button
                onClick={() => {
                  onSOSClick?.();
                  setOpen(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: ['0 0 10px rgba(239, 68, 68, 0.5)', '0 0 30px rgba(239, 68, 68, 0.9)', '0 0 10px rgba(239, 68, 68, 0.5)'],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mt-4 w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-bold text-center"
              >
                🚨 Activate SOS
              </motion.button>
            </ul>
          </motion.div>
        )}
      </motion.div>
    </motion.nav>
  );
};

export default FloatingNavbar;
