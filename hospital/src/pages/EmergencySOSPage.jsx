import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaHeartbeat, FaCheckCircle, FaMicrophone, FaTimes, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { createEmergencyRequest, getEmergencyStatus, uploadEmergencyMedia } from '../services/emergencyService';

const EmergencySOSPage = ({ onClose }) => {
  const [activeRequest, setActiveRequest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const [formData, setFormData] = useState({
    emergencyFor: 'self',
    fullName: '',
    age: '',
    gender: '',
    mobile: '',
    emergencyType: [],
    additionalSymptoms: '',
    emergencyDescription: '',
    latitude: '',
    longitude: '',
    address: '',
    city: '',
  });

  const [errors, setErrors] = useState({});
  const [locationDetected, setLocationDetected] = useState(false);

  useEffect(() => {
    const requestId = activeRequest?.id;
    const status = activeRequest?.status;
    if (!requestId || ["accepted", "completed", "cancelled", "failed_no_match"].includes(status)) {
      return undefined;
    }

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const latest = await getEmergencyStatus(requestId);
        if (!cancelled) {
          setActiveRequest(latest);
        }
      } catch (error) {
        if (!cancelled) {
          setRequestError(error.message || 'Unable to refresh request status.');
        }
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeRequest?.id, activeRequest?.status]);

  // Auto-detect location with reverse geocoding
  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lon = position.coords.longitude.toFixed(4);
          
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lon,
          }));
          
          // Reverse geocoding to get address
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            if (data.address) {
              const address = data.address.road || data.address.house_number || '';
              const city = data.address.city || data.address.town || data.address.village || '';
              setFormData(prev => ({
                ...prev,
                address: data.display_name || address,
                city: city,
              }));
            }
          } catch (err) {
            console.error('Reverse geocoding failed:', err);
          }
          
          setLocationDetected(true);
        },
        (error) => {
          let errorMessage = 'Unable to detect location. Please enable location services and try again.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location information not available. Please try again.';
          }
          setErrors(prev => ({ ...prev, location: errorMessage }));
          setLocationDetected(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setErrors(prev => ({ ...prev, location: 'Geolocation is not supported by your browser.' }));
    }
  };

  // Voice input for symptoms
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setFormData(prev => ({
        ...prev,
        additionalSymptoms: prev.additionalSymptoms + ' ' + transcript,
      }));
    };
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.mobile || formData.mobile.length < 10) newErrors.mobile = 'Valid mobile number required';
    if (formData.emergencyType.length === 0) newErrors.emergencyType = 'Please select at least one emergency type';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.latitude || !formData.longitude) newErrors.location = 'Please detect location before submitting';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitSOS = async () => {
    if (!validateForm()) {
      return;
    }

    const normalizedSymptoms = [...formData.emergencyType];
    if (formData.additionalSymptoms.trim()) {
      normalizedSymptoms.push(formData.additionalSymptoms.trim().toLowerCase());
    }
    if (formData.emergencyDescription.trim()) {
      normalizedSymptoms.push(formData.emergencyDescription.trim().toLowerCase());
    }

    const emergencyTypeMap = {
      cardiac_arrest: 'cardiac_arrest',
      stroke_alert: 'stroke_alert',
      trauma_injury: 'trauma_injury',
      respiratory_distress: 'respiratory_distress',
      fever_illness: 'fever_illness',
      minor_injury: 'minor_injury'
    };

    const resourceByType = {
      cardiac_arrest: ['ambulance', 'icu_bed', 'emergency_doctor'],
      stroke_alert: ['ambulance', 'icu_bed', 'emergency_doctor'],
      trauma_injury: ['ambulance', 'normal_bed', 'emergency_doctor'],
      respiratory_distress: ['ambulance', 'normal_bed', 'emergency_doctor'],
      fever_illness: ['ambulance', 'normal_bed'],
      minor_injury: ['ambulance', 'normal_bed']
    };

    const primarySymptom = formData.emergencyType[0] || 'minor_injury';
    const payload = {
      callerName: formData.fullName,
      callerPhone: formData.mobile,
      patientName: formData.fullName,
      patientAge: formData.age ? Number(formData.age) : 0,
      patientGender: (formData.gender || 'other').toLowerCase(),
      emergencyType: emergencyTypeMap[primarySymptom] || 'minor_injury',
      symptoms: normalizedSymptoms,
      requestedResources: resourceByType[primarySymptom] || ['ambulance', 'normal_bed'],
      location: {
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        address: formData.address,
        landmark: formData.city
      },
      requestedForSelf: formData.emergencyFor === 'self'
    };

    setIsSubmitting(true);
    setRequestError('');
    try {
      const created = await createEmergencyRequest(payload);
      setActiveRequest(created);

      // Trigger an immediate follow-up fetch so UI reflects queue transition quickly.
      const latest = await getEmergencyStatus(created.id);
      setActiveRequest(latest);
    } catch (error) {
      setRequestError(error.message || 'Unable to create emergency request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const symptomOptions = [
    { label: 'Cardiac Arrest (Critical)', value: 'cardiac_arrest', icon: '❤️' },
    { label: 'Stroke Alert (Critical)', value: 'stroke_alert', icon: '🧠' },
    { label: 'Trauma Injury (Moderate)', value: 'trauma_injury', icon: '🩹' },
    { label: 'Respiratory Distress (Moderate)', value: 'respiratory_distress', icon: '💨' },
    { label: 'Fever Illness (Low)', value: 'fever_illness', icon: '🌡️' },
    { label: 'Minor Injury (Low)', value: 'minor_injury', icon: '🩺' },
  ];

  if (activeRequest?.status === 'accepted') {
    return <ResponseDashboard formData={formData} request={activeRequest} onClose={onClose} />;
  }

  if (activeRequest?.id) {
    return <SearchingDashboard status={activeRequest.status} requestError={requestError} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center px-4 py-12 overflow-x-hidden">
      {/* Back button */}
      <button
        onClick={onClose}
        className="fixed top-6 left-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition-colors flex items-center justify-center"
        title="Go back"
      >
        <FaArrowLeft size={20} />
      </button>

      {/* Form Container */}
      <div className="w-full max-w-2xl">
        <SinglePageSOSForm
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          detectLocation={detectLocation}
          locationDetected={locationDetected}
          symptomOptions={symptomOptions}
          isListening={isListening}
          startVoiceInput={startVoiceInput}
          requestError={requestError}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitSOS}
        />
      </div>
    </div>
  );
};

const SinglePageSOSForm = ({
  formData,
  setFormData,
  errors,
  detectLocation,
  locationDetected,
  symptomOptions,
  isListening,
  startVoiceInput,
  requestError,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-2xl mx-auto"
    >
      {/* Red Header Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-5 text-center">
        <h1 className="text-3xl font-bold text-white">EMERGENCY SOS</h1>
      </div>

      {/* Form Content */}
      <div className="px-8 py-5 space-y-4">
        <div className="text-center mb-4">
          <p className="text-gray-700 text-sm font-medium">Fill the details so help can reach you quickly.</p>
        </div>

        {/* Emergency For Selection */}
        <div>
          <label className="block text-gray-800 font-semibold mb-2 text-sm">Who needs emergency assistance?</label>
          <div className="flex gap-4">
            {[
              { value: 'self', label: 'For Me' },
              { value: 'other', label: 'For Someone Else' }
            ].map((option) => (
              <label key={option.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="emergencyFor"
                  value={option.value}
                  checked={formData.emergencyFor === option.value}
                  onChange={(e) => setFormData({ ...formData, emergencyFor: e.target.value })}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="ml-2 text-gray-800 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-gray-800 font-semibold mb-1 text-sm">
            {formData.emergencyFor === 'self' ? 'Your Full Name' : "Patient's Full Name"} <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Enter your name"
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors text-sm ${
              errors.fullName ? 'border-red-500' : 'border-gray-300 focus:border-red-600'
            } text-gray-800`}
          />
          {errors.fullName && <p className="text-red-600 text-xs mt-0.5">{errors.fullName}</p>}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-gray-800 font-semibold mb-1 text-sm">
            {formData.emergencyFor === 'self' ? 'Your Phone Number' : 'Contact Phone Number'} <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            placeholder="Enter mobile number"
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors text-sm ${
              errors.mobile ? 'border-red-500' : 'border-gray-300 focus:border-red-600'
            } text-gray-800`}
          />
          {errors.mobile && <p className="text-red-600 text-xs mt-0.5">{errors.mobile}</p>}
        </div>

        {/* Age */}
        <div>
          <label className="block text-gray-800 font-semibold mb-1 text-sm">Age <span className="text-gray-500 font-normal">(Optional)</span></label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="Enter age"
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors text-sm ${
              errors.age ? 'border-red-500' : 'border-gray-300 focus:border-red-600'
            } text-gray-800`}
          />
          {errors.age && <p className="text-red-600 text-xs mt-0.5">{errors.age}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-gray-800 font-semibold mb-2 text-sm">Gender <span className="text-gray-500 font-normal">(Optional)</span></label>
          <div className="flex gap-4">
            {['Male', 'Female', 'Other'].map((option) => (
              <label key={option} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value={option}
                  checked={formData.gender === option}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-4 h-4 text-red-600 cursor-pointer"
                />
                <span className="ml-2 text-gray-800 text-sm">{option}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="text-red-600 text-xs mt-1">{errors.gender}</p>}
        </div>

        {/* Emergency Type Selection */}
        <div>
          <label className="block text-gray-800 font-semibold mb-2 text-sm">Type of Emergency <span className="text-red-600">*</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {symptomOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const isSelected = formData.emergencyType.includes(option.value);
                  setFormData({
                    ...formData,
                    emergencyType: isSelected
                      ? formData.emergencyType.filter(type => type !== option.value)
                      : [...formData.emergencyType, option.value]
                  });
                }}
                className={`py-2 px-3 rounded-lg font-semibold text-xs transition-all border-2 flex items-center justify-between gap-1 relative ${
                  formData.emergencyType.includes(option.value)
                    ? 'bg-blue-500 bg-opacity-30 text-blue-800 border-blue-400'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
                {formData.emergencyType.includes(option.value) && (
                  <div className="bg-blue-500 rounded-full p-0.5">
                    <FaCheck size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          {errors.emergencyType && <p className="text-red-600 text-xs mt-1">{errors.emergencyType}</p>}
        </div>

        {/* Emergency Description */}
        <div>
          <label className="block text-gray-800 font-semibold mb-1 text-sm">Describe Your Emergency <span className="text-gray-500 font-normal">(Optional)</span></label>
          <textarea
            value={formData.emergencyDescription}
            onChange={(e) => setFormData({ ...formData, emergencyDescription: e.target.value })}
            placeholder="Please provide detailed information about the emergency (symptoms, location details, any medication allergies, etc.)"
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors text-sm resize-none h-20 ${
              errors.emergencyDescription ? 'border-red-500' : 'border-gray-300 focus:border-red-600'
            } text-gray-800`}
          />
          {errors.emergencyDescription && <p className="text-red-600 text-xs mt-0.5">{errors.emergencyDescription}</p>}
        </div>

        {/* Address */}
        <div>
          <label className="block text-gray-800 font-semibold mb-1 text-sm">Address <span className="text-red-600">*</span></label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Enter your current address"
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors text-sm ${
              errors.address ? 'border-red-500' : 'border-gray-300 focus:border-red-600'
            } text-gray-800`}
          />
          {errors.address && <p className="text-red-600 text-xs mt-0.5">{errors.address}</p>}
        </div>

        {/* Use Current Location Button */}
        <motion.button
          onClick={detectLocation}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2 px-4 border-2 border-red-600 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <FaMapMarkerAlt size={16} />
          Use Current Location
        </motion.button>

        {locationDetected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 border border-green-300 rounded-lg p-2 text-center"
          >
            <p className="text-green-700 font-medium text-xs">Location Detected Successfully</p>
          </motion.div>
        )}

        {/* Send SOS Button */}
        <motion.button
          onClick={onSubmit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-bold text-base transition-all"
        >
          SEND EMERGENCY SOS
        </motion.button>

        {/* Footer Message */}
        <div className="pt-2 text-center border-t border-gray-200">
          <p className="text-gray-600 text-xs">Your request will be sent to nearby hospitals and ambulance services.</p>
        </div>
      </div>
    </motion.div>
  );
};

// Response Dashboard - Searching
const SearchingDashboard = ({ status, requestError }) => {
  const heading = status === 'failed_no_match' ? 'No Match Found Yet' : 'Searching Nearby Hospitals...';
  const subheading = status === 'failed_no_match'
    ? 'No hospital accepted in the current radius. The command center is retrying.'
    : 'Your emergency has been received. Connecting you with the nearest hospitals.';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center px-4"
    >
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-8"
        >
          <FaHeartbeat className="text-6xl text-red-500 mx-auto" />
        </motion.div>

        <h1 className="text-4xl font-bold text-white mb-4">{heading}</h1>
        <p className="text-gray-300 text-lg mb-8">{subheading}</p>

        {/* Radar Animation */}
        <motion.div
          className="relative w-48 h-48 mx-auto mb-8"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 border-4 border-blue-500 rounded-full opacity-20" />
          <div className="absolute inset-4 border-4 border-blue-400 rounded-full opacity-40" />
          <div className="absolute inset-8 border-4 border-blue-300 rounded-full opacity-60" />
          <motion.div
            className="absolute inset-16 bg-red-600 rounded-full"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>

        <p className="text-gray-400">Please stay calm and ensure your location is correct.</p>
        {requestError ? <p className="text-red-300 mt-4">{requestError}</p> : null}
      </div>
    </motion.div>
  );
};

// Response Dashboard - Assigned
const ResponseDashboard = ({ formData, request, onClose }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaNote, setMediaNote] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isMediaNoteListening, setIsMediaNoteListening] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState('');
  const [mediaUploadResult, setMediaUploadResult] = useState(null);
  const hospitalName = request?.assignedHospitalName || 'Assigned Hospital';
  const ambulanceNumber = request?.assignedAmbulanceVehicleNumber || 'Awaiting vehicle assignment';
  const ambulanceType = request?.assignedAmbulanceType || 'Emergency Unit';
  const ambulanceContact = request?.assignedAmbulanceMobileNumber || '';
  const doctorName = request?.assignedDoctorName || 'On-duty team';
  const patientLocation = {
    latitude: Number(request?.location?.latitude || formData.latitude || 0),
    longitude: Number(request?.location?.longitude || formData.longitude || 0)
  };
  const ambulanceLocation = {
    latitude: Number(request?.assignedAmbulanceLocation?.latitude || 0),
    longitude: Number(request?.assignedAmbulanceLocation?.longitude || 0)
  };

  const hasAmbulanceAssigned = Boolean(request?.assignedAmbulanceId || request?.assignedAmbulanceVehicleNumber);
  const hasTrackableAmbulanceLocation = Math.abs(ambulanceLocation.latitude) > 0.000001 && Math.abs(ambulanceLocation.longitude) > 0.000001;
  const etaMinutes = Number(request?.ambulanceEtaMinutes || 0);

  const startMediaNoteVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.start();
    setIsMediaNoteListening(true);

    recognition.onend = () => {
      setIsMediaNoteListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();

      if (!transcript) {
        return;
      }

      setMediaNote((prev) => `${prev}${prev.trim() ? ' ' : ''}${transcript}`);
    };
  };

  const handleMediaUpload = async (event) => {
    event.preventDefault();
    if (!selectedMedia || !request?.id) {
      setMediaUploadError('Please select an audio/video file first.');
      return;
    }

    setIsUploadingMedia(true);
    setMediaUploadError('');

    try {
      const uploaded = await uploadEmergencyMedia({
        requestId: request.id,
        callerPhone: formData.mobile,
        mediaFile: selectedMedia,
        note: mediaNote
      });
      setMediaUploadResult(uploaded);
      setSelectedMedia(null);
      setMediaNote('');
    } catch (error) {
      setMediaUploadError(error.message || 'Unable to upload media evidence.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const timelineSteps = [
    { label: 'Request Sent', completed: true },
    { label: 'Hospital Matched', completed: Boolean(request?.assignedHospitalId) },
    { label: 'Ambulance Assigned', completed: hasAmbulanceAssigned },
    { label: 'Live Tracking Active', completed: hasTrackableAmbulanceLocation },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-x-hidden">
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full p-3 transition-colors"
      >
        <FaTimes size={24} />
      </button>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="mb-4"
          >
            <FaCheckCircle className="text-7xl text-green-500 mx-auto" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Emergency Request Received!</h1>
          <p className="text-gray-300 text-lg">Hospitals in your area are responding immediately</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Hospital Response Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Hospital Found</h2>

            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-gray-300 text-sm mb-1">Hospital Name</p>
                <p className="text-2xl font-bold text-white">{hospitalName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-1">Assigned Doctor</p>
                  <p className="text-xl font-bold text-cyan-300">{doctorName}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-1">Assigned Room</p>
                  <p className="text-xl font-bold text-emerald-300">{request?.assignedRoomNumber || 'Triage Desk'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-1">Ambulance Number</p>
                  <p className="text-lg font-bold text-white">{ambulanceNumber}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-1">Ambulance Type</p>
                  <p className="text-lg font-bold text-white">{ambulanceType}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-1">Ambulance Contact</p>
                  <p className="text-lg font-bold text-white">{ambulanceContact || 'Updating'}</p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="bg-red-600/10 border-2 border-red-600 rounded-lg p-4 text-center"
              >
                <p className="text-white text-lg font-bold mb-2">Response Status</p>
                <p className="text-red-300 text-2xl font-bold">
                  {etaMinutes > 0 ? `ETA: ${etaMinutes} minutes` : (hasTrackableAmbulanceLocation ? 'Ambulance route live' : 'Dispatch in progress')}
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Timeline Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl"
          >
            <h3 className="text-xl font-bold text-white mb-6">Progress</h3>
            <div className="space-y-4">
              {timelineSteps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.5 + 1 }}
                  className="flex items-center gap-3"
                >
                  <motion.div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                      step.completed ? 'bg-green-600 text-white' : 'bg-slate-600 text-gray-400'
                    }`}
                    animate={step.completed ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    {step.completed ? <FaCheckCircle /> : (idx + 1)}
                  </motion.div>
                  <div>
                    <p className={`font-medium ${step.completed ? 'text-white' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {!step.completed && idx === 2 ? <p className="text-xs text-amber-300">Waiting for confirmed unit assignment</p> : null}
                    {!step.completed && idx === 3 ? <p className="text-xs text-amber-300">GPS lock pending from ambulance device</p> : null}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Live Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl mb-12"
        >
          <h3 className="text-2xl font-bold text-white mb-4">Ambulance Location</h3>
          <LiveMap
            patientLocation={patientLocation}
            ambulanceLocation={ambulanceLocation}
            address={request?.location?.address || formData.address}
            hasTrackableAmbulanceLocation={hasTrackableAmbulanceLocation}
          />
        </motion.div>

        {/* Patient Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl"
        >
          <h3 className="text-2xl font-bold text-white mb-6">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoBlock label="Emergency For" value={formData.emergencyFor === 'self' ? 'Self' : 'Someone Else'} />
            <InfoBlock label="Name" value={formData.fullName} />
            <InfoBlock label="Age" value={`${formData.age} years`} />
            <InfoBlock label="Mobile" value={formData.mobile} />
          </div>
          
          {/* Emergency Details */}
          <div className="mt-6 pt-6 border-t border-slate-600">
            <h4 className="text-lg font-bold text-white mb-4">Emergency Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <p className="text-gray-400 text-sm mb-2">Emergency Types</p>
                <div className="flex flex-wrap gap-2">
                  {formData.emergencyType.map((type) => (
                    <span key={type} className="bg-blue-500 bg-opacity-20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-blue-400">
                      <FaCheck size={10} />
                      {type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600">
                <p className="text-gray-400 text-sm mb-2">Description</p>
                <p className="text-white font-medium text-sm break-words">{formData.emergencyDescription}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-600">
            <h4 className="text-lg font-bold text-white mb-3">Share Audio/Video For Immediate Guidance</h4>
            <p className="text-gray-300 text-sm mb-4">Upload a short audio/video clip so safe immediate first-aid suggestions can be generated and forwarded to the assigned doctor.</p>
            <form className="space-y-3" onSubmit={handleMediaUpload}>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={(event) => setSelectedMedia(event.target.files?.[0] || null)}
                className="w-full text-sm text-gray-200"
              />
              <div className="relative">
                <textarea
                  value={mediaNote}
                  onChange={(event) => setMediaNote(event.target.value)}
                  placeholder="Optional: mention symptoms visible in audio/video"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 pr-12 text-white"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={startMediaNoteVoiceInput}
                  title="Voice input"
                  aria-label="Voice input"
                  className={`absolute right-2 top-2 rounded-full p-2 transition ${isMediaNoteListening ? 'bg-red-600 text-white' : 'bg-slate-600 text-gray-100 hover:bg-slate-500'}`}
                >
                  <FaMicrophone size={14} />
                </button>
              </div>
              <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold" disabled={isUploadingMedia}>
                {isUploadingMedia ? 'Uploading...' : 'Upload And Generate Guidance'}
              </button>
            </form>

            {mediaUploadError ? <p className="text-red-400 mt-3 text-sm">{mediaUploadError}</p> : null}

            {mediaUploadResult ? (
              <div className="mt-4 bg-slate-700/60 rounded-lg p-4 border border-slate-600">
                <p className="text-green-300 font-semibold mb-2">Media shared with assigned doctor.</p>
                <p className="text-gray-200 text-sm">AI Safe Guidance: {mediaUploadResult.aiGuidance}</p>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!ambulanceContact}
            onClick={() => {
              if (ambulanceContact) {
                window.location.href = `tel:${ambulanceContact}`;
              }
            }}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-bold transition-colors"
          >
            {ambulanceContact ? 'Call Ambulance' : 'Contact Syncing'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
          >
            Close
          </motion.button>
        </div>
      </div>
    </div>
  );
};

const LiveMap = ({ patientLocation, ambulanceLocation, address, hasTrackableAmbulanceLocation }) => {
  const fallbackLat = Number(patientLocation?.latitude || 0);
  const fallbackLng = Number(patientLocation?.longitude || 0);
  const centerLat = hasTrackableAmbulanceLocation ? Number(ambulanceLocation.latitude) : fallbackLat;
  const centerLng = hasTrackableAmbulanceLocation ? Number(ambulanceLocation.longitude) : fallbackLng;
  const hasCenter = Math.abs(centerLat) > 0.000001 && Math.abs(centerLng) > 0.000001;

  if (!hasCenter) {
    return (
      <div className="rounded-lg border-2 border-slate-600 bg-slate-700 p-6 text-center text-gray-300">
        Live map is unavailable because location coordinates are missing.
      </div>
    );
  }

  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.01}%2C${centerLat - 0.01}%2C${centerLng + 0.01}%2C${centerLat + 0.01}&layer=mapnik&marker=${centerLat}%2C${centerLng}`;
  const destinationLat = Number(patientLocation?.latitude || centerLat);
  const destinationLng = Number(patientLocation?.longitude || centerLng);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}&travelmode=driving`;

  return (
    <div className="space-y-3">
      <div className="relative h-72 overflow-hidden rounded-lg border-2 border-slate-600 bg-slate-700">
        <iframe
          title="Live emergency map"
          src={mapEmbedUrl}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-300">
          {hasTrackableAmbulanceLocation ? 'Tracking ambulance GPS location in real time.' : 'Tracking patient location until ambulance GPS syncs.'}
          {address ? ` Destination: ${address}` : ''}
        </p>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Open Navigation
        </a>
      </div>
    </div>
  );
};

const InfoBlock = ({ label, value }) => (
  <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600">
    <p className="text-gray-400 text-sm mb-2">{label}</p>
    <p className="text-white font-bold text-lg">{value}</p>
  </div>
);

export default EmergencySOSPage;
