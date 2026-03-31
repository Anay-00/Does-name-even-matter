const MobilePreview = () => (
  <section className="py-16 bg-white" id="mobile">
    <div className="container mx-auto px-4 flex flex-col-reverse md:flex-row items-center">
      <div className="w-full md:w-1/2">
        <h2 className="text-3xl font-bold text-gray-900 font-poppins mb-4">
          MediSync works on mobile devices to provide emergency help anywhere.
        </h2>
        <p className="text-gray-700 font-inter">
          Access real-time hospital data, dispatch ambulances, and trigger SOS
          directly from your phone.
        </p>
      </div>
      <div className="w-full md:w-1/2 flex justify-center mb-8 md:mb-0">
        <div className="w-64 h-128 bg-gray-200 rounded-xl flex items-center justify-center">
          <span className="text-gray-400">[Phone mockup]</span>
        </div>
      </div>
    </div>
  </section>
);

export default MobilePreview;
