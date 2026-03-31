const CTA = () => (
  <section className="bg-primary py-16 text-white text-center" id="cta">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold font-poppins mb-6">
        Join the Smart Healthcare Network
      </h2>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button className="px-6 py-3 bg-white text-primary rounded-md hover:bg-gray-100 transition">
          Register Hospital
        </button>
        <button className="px-6 py-3 border border-white text-white rounded-md hover:bg-blue-500 transition">
          Request Emergency Help
        </button>
      </div>
    </div>
  </section>
);

export default CTA;
