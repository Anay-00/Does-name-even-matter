import { useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaStar } from 'react-icons/fa';

const TestimonialsSection = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Dr. Sharma',
      role: 'Emergency Medicine Specialist',
      hospital: 'Apollo Hospital',
      image: '👨‍⚕️',
      text: 'MediSync AI drastically improves emergency response time across hospitals. We can now coordinate resources in real-time.',
      rating: 5,
    },
    {
      id: 2,
      name: 'Priya Patel',
      role: 'Hospital Administrator',
      hospital: 'City Care Center',
      image: '👩‍💼',
      text: 'The platform eliminated silos between our hospitals. ICU coordination has never been easier. Highly recommended!',
      rating: 5,
    },
    {
      id: 3,
      name: 'Rahul Singh',
      role: 'Patient',
      hospital: 'Emergency Care Clinic',
      image: '👨‍🦱',
      text: 'Thanks to MediSync, I got ambulance within 4 minutes during my emergency. It literally saved my life!',
      rating: 5,
    },
    {
      id: 4,
      name: 'Dr. Anjali Gupta',
      role: 'ICU Director',
      hospital: 'Metro Hospital',
      image: '👩‍⚕️',
      text: 'Real-time bed tracking and AI matching has improved our patient outcomes significantly. Excellent platform!',
      rating: 5,
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <section className="py-20 px-4 bg-white relative overflow-hidden">
      <div className="container mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-poppins mb-4 text-gray-900">
            Trusted by Healthcare<span className="text-blue-600"> Professionals</span>
          </h2>
          <p className="text-gray-600 text-lg">Hear from doctors, hospitals, and patients we've helped</p>
        </div>

        {/* Testimonials Carousel */}
        <div className="max-w-4xl mx-auto relative">
          <div className="relative h-80 md:h-64">
            {testimonials.map((testimonial, idx) => {
              if (idx !== currentIndex) return null;

              return (
                <div
                  key={testimonial.id}
                  className="absolute inset-0 p-8 md:p-12 glass-card rounded-2xl border border-blue-200/50"
                >
                  <div className="space-y-4">
                    {/* Rating */}
                    <div className="flex gap-1">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <FaStar key={i} className="text-yellow-400" size={18} />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-lg text-gray-700 font-inter italic">
                      "{testimonial.text}"
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                      <div className="text-4xl">{testimonial.image}</div>
                      <div>
                        <p className="font-bold text-gray-900">{testimonial.name}</p>
                        <p className="text-sm text-gray-600">{testimonial.role}</p>
                        <p className="text-xs text-gray-500">{testimonial.hospital}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={goToPrevious}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg"
            >
              <FaChevronLeft size={20} />
            </button>

            {/* Dots Indicator */}
            <div className="flex gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg"
            >
              <FaChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
