import { FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import HeroMapAnimation from './HeroMapAnimation';

const HeroSection = ({ onSOSClick }) => {
  return (
    <section id="home" className="relative w-full min-h-screen overflow-hidden pt-16 pb-28 flex items-center bg-white">
      <div className="container mx-auto px-4 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-120px)] lg:gap-16">
          {/* Left content */}
          <div className="space-y-6 flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-poppins leading-tight text-gray-900">
              Emergency Care in{' '}
              <span className="text-blue-600">Seconds</span>
            </h1>

            <p className="text-base md:text-lg text-gray-600 font-inter leading-relaxed max-w-md">
              Real-time coordination connecting patients, hospitals, and ambulances to deliver lifesaving emergency care instantly.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onSOSClick}
                className="px-7 py-3 bg-red-600 text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                🚑 Find Emergency Care
                <FaArrowRight size={16} />
              </button>

              <button className="px-7 py-3 bg-blue-600 text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                🏥 Explore Network
                <FaArrowRight size={18} />
              </button>
            </div>

            {/* Trust indicators */}
            <div className="space-y-2 pt-2">
              {[
                'Real-time hospital network',
                'AI emergency routing',
                'Instant ambulance dispatch',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-500 text-lg flex-shrink-0" />
                  <span className="text-gray-700 font-inter text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Map */}
          <div className="flex items-center justify-center h-full w-full pt-16">
            <div className="w-full h-full min-h-96 lg:h-[500px]">
              <HeroMapAnimation />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
