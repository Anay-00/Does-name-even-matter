import { FaHospital, FaMapMarkedAlt, FaBed, FaHeartbeat, FaChartLine, FaRobot } from 'react-icons/fa';

const features = [
  { title: 'Live Hospital Map', icon: <FaMapMarkedAlt /> },
  { title: 'Ambulance Tracking', icon: <FaHospital /> },
  { title: 'ICU Bed Availability', icon: <FaBed /> },
  { title: 'Emergency SOS', icon: <FaHeartbeat /> },
  { title: 'Healthcare Analytics', icon: <FaChartLine /> },
  { title: 'AI Medical Assistant', icon: <FaRobot /> },
];

const Features = () => (
  <section className="py-16 bg-gray-100" id="features">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold text-gray-900 font-poppins text-center mb-8">
        Key Features
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition transform hover:-translate-y-1"
          >
            <div className="text-4xl text-primary mb-4">{f.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 font-poppins">
              {f.title}
            </h3>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
