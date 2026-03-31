import { FaCheckCircle } from 'react-icons/fa';

const Hero = () => (
  <section className="bg-white py-20" id="home">
    <div className="container mx-auto px-4 flex flex-col-reverse md:flex-row items-center">
      {/* left side */}
      <div className="w-full md:w-1/2">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 font-poppins leading-tight">
          Smart Emergency Healthcare Network
        </h1>
        <p className="mt-4 text-lg text-gray-700 font-inter">
          Connect patients, hospitals, and ambulances in real-time to reduce
          emergency response time and save lives.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button className="px-6 py-3 bg-primary text-white rounded-md hover:bg-blue-700 transition">
            Find Emergency Care
          </button>
          <button className="px-6 py-3 bg-emergency text-white rounded-md hover:bg-red-600 transition">
            Emergency SOS
          </button>
        </div>
        <ul className="mt-6 space-y-2 text-gray-700 font-inter">
          {[
            'Real-time hospital data',
            'Instant ambulance dispatch',
            'Smart emergency recommendations',
          ].map((item) => (
            <li key={item} className="flex items-center">
              <FaCheckCircle className="text-green-500 mr-2" /> {item}
            </li>
          ))}
        </ul>
      </div>
      {/* right side illustration placeholder */}
      <div className="w-full md:w-1/2 mb-10 md:mb-0">
        <div className="w-full h-64 md:h-80 bg-gradient-to-br from-blue-100 to-white rounded-lg flex items-center justify-center">
          {/* placeholder graphic */}
          <span className="text-blue-300">[Illustration]</span>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
