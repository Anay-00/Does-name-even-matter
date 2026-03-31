import { motion } from 'framer-motion';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaGithub, FaArrowRight, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = ({ onNavigateHome }) => {
  const currentYear = new Date().getFullYear();

  // Newsletter subscription handler
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for subscribing to MediSync AI updates!');
  };

  // Footer content sections
  const sections = {
    platform: [
      { label: 'Overview', href: '#home' },
      { label: 'Real-Time Coordination', href: '#workflow' },
      { label: 'Impact', href: '#impact' },
    ],
    features: [
      { label: 'Smart Search', href: '#features' },
      { label: 'Live Resource Visibility', href: '#features' },
      { label: 'Emergency SOS', href: '#contact' },
    ],
    technology: [
      { label: 'Architecture', href: '#architecture' },
      { label: 'AI Matching', href: '#technology' },
      { label: 'Security', href: '#security' },
    ],
    hospitals: [
      { label: 'Hospital Network', href: '#hospitals' },
      { label: 'Ambulance Readiness', href: '#hospitals' },
      { label: 'Emergency Capacity', href: '#hospitals' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '#privacy' },
      { label: 'Terms of Service', href: '#terms' },
      { label: 'Cookie Policy', href: '#cookies' },
      { label: 'Compliance', href: '#compliance' },
    ],
  };

  const socialLinks = [
    { icon: <FaTwitter />, label: 'Twitter', href: '#twitter' },
    { icon: <FaLinkedin />, label: 'LinkedIn', href: '#linkedin' },
    { icon: <FaFacebook />, label: 'Facebook', href: '#facebook' },
    { icon: <FaInstagram />, label: 'Instagram', href: '#instagram' },
    { icon: <FaGithub />, label: 'GitHub', href: '#github' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const handleFooterLinkClick = (event, href) => {
    if (!onNavigateHome || !href || !href.startsWith('#')) return;

    event.preventDefault();
    onNavigateHome();
    setTimeout(() => {
      window.location.hash = href;
    }, 0);
  };

  return (
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <motion.div
          className="absolute top-20 right-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl"
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"
          animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Top Newsletter Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-10 border-b border-white/10 py-8"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Stay Updated
            </h3>
            <p className="text-gray-400 text-center mb-6">
              Subscribe to get the latest updates on emergency response features and healthcare innovations.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email..."
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition"
                required
              />
              <motion.button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/50 transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Subscribe <FaArrowRight />
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>

      {/* Main Footer Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8"
        >
          {/* Brand Section */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <motion.div className="text-3xl font-bold mb-4 flex items-center gap-2">
              <span className="text-3xl">🏥</span>
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">MediSync</span>
            </motion.div>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Revolutionizing emergency healthcare through AI-powered real-time coordination of patients, hospitals, and ambulances.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, i) => (
                <motion.a
                  key={i}
                  href={social.href}
                  onClick={(event) => handleFooterLinkClick(event, social.href)}
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 transition"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  title={social.label}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Platform */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-bold mb-6 text-white">Platform</h4>
            <ul className="space-y-3">
              {sections.platform.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    onClick={(event) => handleFooterLinkClick(event, link.href)}
                    className="text-gray-400 hover:text-cyan-400 transition flex items-center gap-2 group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition">→</span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Features */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-bold mb-6 text-white">Features</h4>
            <ul className="space-y-3">
              {sections.features.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    onClick={(event) => handleFooterLinkClick(event, link.href)}
                    className="text-gray-400 hover:text-cyan-400 transition flex items-center gap-2 group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition">→</span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Technology */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-bold mb-6 text-white">Technology</h4>
            <ul className="space-y-3">
              {sections.technology.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    onClick={(event) => handleFooterLinkClick(event, link.href)}
                    className="text-gray-400 hover:text-cyan-400 transition flex items-center gap-2 group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition">→</span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Hospitals + Contact Info */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-bold mb-6 text-white">Hospitals</h4>
            <ul className="space-y-3 mb-6">
              {sections.hospitals.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    onClick={(event) => handleFooterLinkClick(event, link.href)}
                    className="text-gray-400 hover:text-cyan-400 transition flex items-center gap-2 group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition">→</span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <h5 className="text-base font-bold mb-4 text-white">Contact</h5>
            <div className="space-y-4">
              <a href="tel:+15551234567" className="flex items-start gap-3 text-gray-400 hover:text-cyan-400 transition group">
                <FaPhone className="text-cyan-400 mt-1 shrink-0" />
                <div>
                  <p className="text-sm group-hover:text-cyan-400">+1 (555) 123-4567</p>
                  <p className="text-xs text-gray-500">24/7 Support</p>
                </div>
              </a>
              <a href="mailto:support@MediSync.ai" className="flex items-start gap-3 text-gray-400 hover:text-cyan-400 transition group">
                <FaEnvelope className="text-cyan-400 mt-1 shrink-0" />
                <div>
                  <p className="text-sm group-hover:text-cyan-400">support@MediSync.ai</p>
                  <p className="text-xs text-gray-500">Response in 1hr</p>
                </div>
              </a>
              <div className="flex items-start gap-3 text-gray-400">
                <FaMapMarkerAlt className="text-cyan-400 mt-1 shrink-0" />
                <div>
                  <p className="text-sm">123 Health Tower</p>
                  <p className="text-xs text-gray-500">Medical City, HC 12345</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Divider with animation */}
        <motion.div
          className="border-t border-white/10 my-6"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        />

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col md:flex-row justify-between items-center gap-6"
        >
          {/* Legal Links */}
          <div className="flex flex-wrap gap-6 justify-center md:justify-start text-sm">
            {sections.legal.map((link, i) => (
              <a
                key={i}
                href={link.href}
                onClick={(event) => handleFooterLinkClick(event, link.href)}
                className="text-gray-500 hover:text-cyan-400 transition"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-center text-gray-500 text-sm">
            <p>
              &copy; {currentYear} <span className="font-semibold text-white">MediSync AI</span>. All rights reserved.
            </p>
            <p className="text-xs mt-1">Saving Lives Through Smart Technology</p>
          </div>

          {/* Trust Badges */}
          <div className="flex gap-4 justify-center">
            <div className="text-center">
              <div className="text-2xl mb-1">🔒</div>
              <p className="text-xs text-gray-500">HIPAA Compliant</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">⭐</div>
              <p className="text-xs text-gray-500">ISO 27001</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">✓</div>
              <p className="text-xs text-gray-500">SOC 2 Type II</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom gradient bar */}
      <motion.div
        className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5 }}
      />
    </footer>
  );
};

export default Footer;
