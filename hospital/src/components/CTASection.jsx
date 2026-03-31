import { FaRocket, FaArrowRight } from 'react-icons/fa';

const CTASection = ({ onSOSClick }) => {
  return (
    <section id="cta" className="py-16 px-4 relative overflow-hidden">
      {/* Simple solid background */}
      <div className="absolute inset-0 bg-blue-700" />

      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white font-poppins mb-4">
            Join the Future of<span className="block text-cyan-300"> Connected Healthcare</span>
          </h2>

          <p className="text-lg md:text-xl text-blue-100 font-inter mb-8 leading-relaxed">
            Join thousands of hospitals and healthcare providers transforming emergency response with real-time coordination.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 md:px-8 md:py-4 bg-white text-blue-700 rounded-xl font-bold text-base shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2">
              <FaRocket /> Register Your Hospital
            </button>

            <button
              onClick={onSOSClick}
              className="px-6 py-3 md:px-8 md:py-4 bg-red-500 text-white rounded-xl font-bold text-base shadow-xl hover:shadow-2xl transition-all border-2 border-white/30 flex items-center justify-center gap-2"
            >
              🚨 Activate Emergency Access <FaArrowRight />
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-blue-200 font-inter text-sm">
              ✨ Free consultation • 24/7 support • No setup fees
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
