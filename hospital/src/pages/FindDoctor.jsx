// FindDoctor.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Heart,
  Stethoscope,
  Star,
  Search,
  Filter,
  MapPin,
  Clock,
  Calendar,
} from "lucide-react";
import FloatingNavbar from "../components/FloatingNavbar";
import Footer from "../components/Footer";
import { generateRoomId, getCurrentUser } from "../utils/roomUtils";
// The following line is no longer needed as the ID is from the backend
// import { getDoctorIdByEmail } from "../supabaseClient.js";

export default function FindDoctor({ onBack, onSOSClick, onLoginClick, onRegisterClick, onHospitalsClick, onTechnologyClick, onContactClick, onFindMedicineClick, onFindDoctorClick, onHomeClick, onFeaturesClick }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dummyDoctors = useMemo(() => ([
    {
      _id: "1",
      fullName: "Dr. Rajesh Kumar",
      specialization: "Cardiology",
      rating: 4.8,
      yearsOfExperience: 12,
      clinicHospitalAddress: "Apollo Hospital, MG Road, Bangalore",
      workingHours: "9:00 AM - 5:00 PM",
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      consultationFee: 500,
      supabaseId: "doc-001",
      img: "https://i.pravatar.cc/150?img=1"
    },
    {
      _id: "2",
      fullName: "Dr. Priya Sharma",
      specialization: "Neurology",
      rating: 4.7,
      yearsOfExperience: 10,
      clinicHospitalAddress: "City Hospital, Indiranagar, Bangalore",
      workingHours: "10:00 AM - 6:00 PM",
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Sat"],
      consultationFee: 450,
      supabaseId: "doc-002",
      img: "https://i.pravatar.cc/150?img=2"
    },
    {
      _id: "3",
      fullName: "Dr. Anmol Singh",
      specialization: "Orthopedics",
      rating: 4.9,
      yearsOfExperience: 15,
      clinicHospitalAddress: "Max Healthcare, Whitefield, Bangalore",
      workingHours: "8:00 AM - 4:00 PM",
      workingDays: ["Tue", "Wed", "Thu", "Fri", "Sat"],
      consultationFee: 600,
      supabaseId: "doc-003",
      img: "https://i.pravatar.cc/150?img=3"
    },
    {
      _id: "4",
      fullName: "Dr. Maya Patel",
      specialization: "Pediatrics",
      rating: 4.6,
      yearsOfExperience: 8,
      clinicHospitalAddress: "Columbia Hospital, Koramangala, Bangalore",
      workingHours: "9:00 AM - 5:00 PM",
      workingDays: ["Mon", "Wed", "Thu", "Fri", "Sat"],
      consultationFee: 400,
      supabaseId: "doc-004",
      img: "https://i.pravatar.cc/150?img=4"
    },
    {
      _id: "5",
      fullName: "Dr. Vikram Gupta",
      specialization: "Dermatology",
      rating: 4.8,
      yearsOfExperience: 11,
      clinicHospitalAddress: "Fortis Hospital, Bannerghatta Road, Bangalore",
      workingHours: "10:00 AM - 6:00 PM",
      workingDays: ["Mon", "Tue", "Thu", "Fri", "Sat"],
      consultationFee: 550,
      supabaseId: "doc-005",
      img: "https://i.pravatar.cc/150?img=5"
    },
    {
      _id: "6",
      fullName: "Dr. Sneha Reddy",
      specialization: "Obstetrics",
      rating: 4.9,
      yearsOfExperience: 13,
      clinicHospitalAddress: "Apollo Maternity, HSR Layout, Bangalore",
      workingHours: "8:00 AM - 5:00 PM",
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      consultationFee: 700,
      supabaseId: "doc-006",
      img: "https://i.pravatar.cc/150?img=6"
    }
  ]), []);

  useEffect(() => {
    let isMounted = true;

    const fetchDoctors = async () => {
      setLoading(true);
      setError(null);
      try {
        // Simulate API call with dummy data
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (isMounted) {
          setDoctors(dummyDoctors);
        }
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
        if (isMounted) {
          setError("Failed to load doctors. Please try again.");
          setDoctors([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDoctors();

    return () => {
      isMounted = false;
    };
  }, [dummyDoctors]);

    // Simplify the function to use the ID directly from the doc object
    const handleChatWithDoctor = (doctorId) => {
      const currentUser = getCurrentUser();

      if (!currentUser) {
        alert("Please login first");
        onLoginClick();
        return;
      }

      const roomId = generateRoomId(currentUser.id, doctorId);
      alert(`Chat with doctor would navigate to room: ${roomId}`);
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen text-xl font-medium">
          Loading doctors...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center h-xl text-red-600 font-medium">
          {error}
        </div>
      );
    }

    return (
      <>
        <FloatingNavbar
          onSOSClick={onSOSClick}
          onLoginClick={onLoginClick}
          onRegisterClick={onRegisterClick}
          onHospitalsClick={onHospitalsClick}
          onTechnologyClick={onTechnologyClick}
          onContactClick={onContactClick}
          onFindMedicineClick={onFindMedicineClick}
          onFindDoctorClick={onFindDoctorClick}
          onHomeClick={onHomeClick}
          onFeaturesClick={onFeaturesClick}
          activeItem="Find Doctor"
        />
        <section className="bg-gradient-to-br from-slate-50 to-blue-50 text-gray-900 py-16 pt-20 md:pt-24">
          <div className="max-w-6xl mx-auto text-center px-4">
            <Stethoscope className="mx-auto mb-4 w-10 h-10 text-blue-600" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Find Your Perfect Doctor
            </h2>
            <p className="mt-2 text-lg text-gray-600">
              Connect with experienced healthcare professionals for personalized
              medical care
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mt-12">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <Users className="mx-auto w-8 h-8 mb-2 text-blue-600" />
                <p className="text-2xl font-semibold text-gray-900">500+</p>
                <p className="mt-1 text-gray-600">Expert Doctors</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <Heart className="mx-auto w-8 h-8 mb-2 text-red-500" />
                <p className="text-2xl font-semibold text-gray-900">50k+</p>
                <p className="mt-1 text-gray-600">Happy Patients</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <Stethoscope className="mx-auto w-8 h-8 mb-2 text-green-600" />
                <p className="text-2xl font-semibold text-gray-900">25+</p>
                <p className="mt-1 text-gray-600">Specializations</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <Star className="mx-auto w-8 h-8 mb-2 text-yellow-500" />
                <p className="text-2xl font-semibold text-gray-900">4.8</p>
                <p className="mt-1 text-gray-600">Average Rating</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-white border rounded-2xl shadow-md p-6 text-gray-800 -mt-12 relative z-10">
              <div className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-gray-50">
                <Search className="w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search doctors by name, specialty, or location..."
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                <div className="flex items-center gap-1 text-gray-600 text-sm cursor-pointer">
                  <Filter className="w-4 h-4" />
                  <span>Filter by:</span>
                </div>
              </div>
            </div>
            <div className="mt-16 text-left">
              <h3 className="text-2xl font-semibold text-gray-900">
                Available Doctors
              </h3>
              <p className="text-sm mt-1 text-gray-500">
                {doctors.length} doctors found
              </p>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                {doctors.length > 0 ? (
                  doctors.map((doc) => (
                    <div
                      key={doc._id}
                      className="bg-white rounded-xl shadow-md p-5 flex flex-col transition-all duration-300 hover:shadow-xl w-full"
                    >
                      <div
                        className="flex items-start gap-4 cursor-pointer"
                      >
                        <img
                          src={doc.img || "https://i.pravatar.cc/100"}
                          alt={doc.fullName}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div>
                          <h2 className="text-lg font-semibold text-blue-600">
                            {doc.fullName}
                          </h2>
                          <p className="text-cyan-600 font-medium">
                            {doc.specialization}
                          </p>
                          <p className="text-yellow-500 flex items-center">
                            ⭐ {doc.rating || "N/A"} • {doc.yearsOfExperience}{" "}
                            years
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 text-gray-600 text-sm space-y-1">
                        {/* Display the Supabase ID here */}
                        {doc.supabaseId && (
                          <p className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">Supabase ID:</span> {doc.supabaseId}
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-cyan-500" />
                          {doc.clinicHospitalAddress}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-cyan-500" />
                          {doc.workingHours}
                        </p>
                        <p className="flex items-center gap-2 flex-wrap">
                          <Calendar className="w-4 h-4 text-cyan-500" />
                          {doc.workingDays.map((d, i) => (
                            <span
                              key={i}
                              className="bg-teal-500 text-white px-2 py-0.5 rounded-md text-xs font-medium ml-1"
                            >
                              {d}
                            </span>
                          ))}
                        </p>
                        <p className="text-green-600 font-semibold">
                          ₹{doc.consultationFee} consultation
                        </p>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {/* <button
                        onClick={() => handleVideoCall(doc.supabaseId)}
                        className="bg-blue-500 text-white py-2 px-3 rounded-lg font-medium transition-all duration-300 hover:bg-blue-600 flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        Video Call */}
                        {/* </button> */}
                        <button
                          // Pass the doctor's supabaseId to the chat handler
                          onClick={() => handleChatWithDoctor(doc.supabaseId)}
                          className="bg-green-500 text-white py-2 px-3 rounded-lg font-medium transition-all duration-300 hover:bg-green-600"
                        >
                          💬 Chat
                        </button>
                        <button
                          onClick={() =>
                            alert(`Booking appointment with ${doc.fullName}`)
                          }
                          className="flex-1 bg-gradient-to-r from-cyan-400 to-teal-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-all duration-300 hover:from-cyan-500 hover:to-teal-600"
                        >
                          <Calendar className="w-4 h-4" /> Book Appointment
                        </button>
                        <button
                          onClick={() =>
                            alert(`Generating report for ${doc.fullName}`)
                          }
                          className="border border-gray-300 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-300 hover:text-white hover:border-transparent hover:bg-gradient-to-r hover:from-purple-500 hover:to-purple-700"
                        >
                          📄 Report
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 text-center text-gray-500">
                    No doctors found for this specialization.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }