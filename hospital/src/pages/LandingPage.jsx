import React from 'react';
import FloatingNavbar from '../components/FloatingNavbar';
import HeroSection from '../components/HeroSection';
import StatsSection from '../components/StatsSection';
import SmartSearchSection from '../components/SmartSearchSection';
import SOSPreviewSection from '../components/SOSPreviewSection';
import TestimonialsSection from '../components/TestimonialsSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

const LandingPage = ({ onSOSClick, onLoginClick, onRegisterClick, onHospitalsClick, onTechnologyClick, onContactClick, onFindDoctorClick, onFindMedicineClick, onFeaturesClick }) => {

  return (
    <div className="bg-gray-50 overflow-x-hidden">
      <FloatingNavbar
        onSOSClick={onSOSClick}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        onHospitalsClick={onHospitalsClick}
        onTechnologyClick={onTechnologyClick}
        onFeaturesClick={onFeaturesClick}
        onContactClick={onContactClick}
        onFindDoctorClick={onFindDoctorClick}
        onFindMedicineClick={onFindMedicineClick}
        activeItem="Home"
      />

      <HeroSection onSOSClick={onSOSClick} />
      <StatsSection />
      <SmartSearchSection />
      <SOSPreviewSection onSOSClick={onSOSClick} />
      <TestimonialsSection />
      <CTASection onSOSClick={onSOSClick} />
      <Footer />
    </div>
  );
};

export default LandingPage;
