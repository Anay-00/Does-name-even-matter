import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaHospital, FaBars, FaTimes } from 'react-icons/fa';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const menuItems = ['Home', 'Features', 'Hospitals', 'Dashboard', 'Contact'];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 w-full bg-white/70 backdrop-blur-lg shadow-sm z-50"
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <motion.div
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FaHospital className="text-2xl text-primary" />
          </motion.div>
          <span className="text-xl font-bold text-primary font-poppins">
            MediSync AI
          </span>
        </motion.div>

        {/* desktop menu */}
        <ul className="hidden md:flex space-x-6 text-gray-700">
          {menuItems.map((item, index) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <motion.a
                href={`#${item.toLowerCase()}`}
                className="relative font-inter hover:text-primary transition-colors"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                {item}
                <motion.div
                  className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary"
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </motion.a>
            </motion.li>
          ))}
        </ul>

        {/* actions */}
        <div className="hidden md:flex space-x-2">
          <motion.button
            className="px-4 py-2 border border-primary text-primary rounded hover:bg-blue-50 transition"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            Login
          </motion.button>
          <motion.button
            className="px-4 py-2 bg-gradient-to-r from-primary to-blue-700 text-white rounded hover:from-blue-700 hover:to-primary transition"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            Register
          </motion.button>
        </div>

        {/* mobile hamburger */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setOpen(!open)}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* mobile menu drawer */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-white shadow"
        >
          <ul className="flex flex-col space-y-2 px-4 py-3">
            {menuItems.map((item) => (
              <li key={item}>
                <a
                  href={`#${item.toLowerCase()}`}
                  className="block text-gray-700 hover:text-primary transition"
                  onClick={() => setOpen(false)}
                >
                  {item}
                </a>
              </li>
            ))}
            <li className="flex space-x-2 pt-2">
              <button className="flex-1 px-4 py-2 border border-primary text-primary rounded hover:bg-blue-50 transition">
                Login
              </button>
              <button className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-blue-700 text-white rounded hover:from-blue-700 hover:to-primary transition">
                Register
              </button>
            </li>
          </ul>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
