import { FaArrowRight } from 'react-icons/fa';

const steps = [
  'Emergency Reported',
  'AI Analyzes Situation',
  'Best Hospital Selected',
  'Ambulance Dispatched',
];

const Solution = () => (
  <section className="py-16 bg-white" id="solution">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold text-gray-900 font-poppins text-center mb-8">
        How MediSync AI Works
      </h2>
      <div className="flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-8">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className="text-2xl font-bold text-primary font-poppins">
              {index + 1}
            </div>
            <div className="ml-4 text-gray-700 font-inter">{step}</div>
            {index < steps.length - 1 && (
              <FaArrowRight className="ml-4 text-gray-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Solution;
