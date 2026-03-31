const stats = [
  { label: 'Hospitals Connected', value: '250+' },
  { label: 'ICU Beds Tracked', value: '900+' },
  { label: 'Ambulances Active', value: '120+' },
  { label: 'Doctors Available', value: '500+' },
];

const Stats = () => (
  <section className="bg-gray-100 py-16" id="hospitals">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <p className="text-3xl font-bold text-primary font-poppins">
              {stat.value}
            </p>
            <p className="mt-2 text-gray-700 font-inter">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Stats;
