import { FaAmbulance, FaBed, FaHospitalAlt } from 'react-icons/fa';

const problems = [
  {
    title: 'Ambulance Delays',
    description: 'Patients struggle to find ambulances.',
    icon: <FaAmbulance className="text-4xl text-primary" />,
  },
  {
    title: 'ICU Bed Shortage',
    description: 'Hospitals lack real-time bed information.',
    icon: <FaBed className="text-4xl text-primary" />,
  },
  {
    title: 'Disconnected Hospitals',
    description: 'Hospitals operate independently.',
    icon: <FaHospitalAlt className="text-4xl text-primary" />,
  },
];

const Problems = () => (
  <section className="py-16" id="problems">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold text-gray-900 font-poppins text-center mb-8">
        Challenges in Emergency Healthcare
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {problems.map((p) => (
          <div
            key={p.title}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition flex flex-col items-center text-center"
          >
            {p.icon}
            <h3 className="mt-4 text-xl font-semibold text-gray-900 font-poppins">
              {p.title}
            </h3>
            <p className="mt-2 text-gray-700 font-inter">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Problems;
