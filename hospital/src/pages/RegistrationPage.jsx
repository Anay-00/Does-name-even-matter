import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { registerPatient } from '../services/authApi';

const roles = [
  { key: 'patient', label: 'Patient', icon: '👤' },
];

const roleFieldConfig = {
  patient: [
    { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
    {
      name: 'gender',
      label: 'Gender',
      type: 'select',
      required: true,
      options: ['Male', 'Female', 'Other', 'Prefer not to say'],
    },
    {
      name: 'bloodGroup',
      label: 'Blood Group',
      type: 'select',
      required: true,
      options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    { name: 'emergencyContact', label: 'Emergency Contact Number', type: 'tel', required: true },
    { name: 'address', label: 'Address', type: 'text', required: true },
    { name: 'city', label: 'City', type: 'text', required: true },
    { name: 'state', label: 'State', type: 'text', required: true },
    { name: 'medicalConditions', label: 'Medical Conditions (Optional)', type: 'text', required: false },
    { name: 'allergies', label: 'Allergies (Optional)', type: 'text', required: false },
  ],
};

const baseIconByField = {
  fullName: '👤',
  email: '📧',
  mobile: '📱',
  password: '🔒',
  confirmPassword: '🔒',
};

const locationFieldLabels = {
  address: 'Address',
  city: 'City',
  state: 'State',
  postalCode: 'Postal Code',
  country: 'Country',
};

const inputClass =
  'w-full rounded-xl border border-white/30 bg-white/70 px-11 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100';

const InputWithIcon = ({ icon, error, ...props }) => (
  <div>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">{icon}</span>
      <input
        {...props}
        className={`${inputClass} ${error ? 'border-red-400 focus:ring-red-100' : ''}`}
      />
    </div>
    {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
  </div>
);

const SelectWithIcon = ({ icon, error, options, ...props }) => (
  <div>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">{icon}</span>
      <select
        {...props}
        className={`${inputClass} appearance-none pr-10 ${error ? 'border-red-400 focus:ring-red-100' : ''}`}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
    {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
  </div>
);

const RegistrationPage = ({ onBack, onSuccessRedirect }) => {
  const selectedRole = 'patient';
  const [basicInfo, setBasicInfo] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });
  const [roleDetails, setRoleDetails] = useState({});
  const [location, setLocation] = useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    latitude: null,
    longitude: null,
  });
  const [otp, setOtp] = useState({ sent: false, verified: false, value: '', generated: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const roleFields = useMemo(() => roleFieldConfig[selectedRole] || [], [selectedRole]);

  useEffect(() => {
    setRoleDetails({});
    setOtp({ sent: false, verified: false, value: '', generated: '' });
  }, []);

  const basicErrors = useMemo(() => {
    const errors = {};

    if (!basicInfo.fullName.trim()) errors.fullName = 'Full name is required.';
    if (basicInfo.email.trim() && !/^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/.test(basicInfo.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!basicInfo.mobile.trim()) {
      errors.mobile = 'Mobile number is required.';
    } else if (!/^\d{10,15}$/.test(basicInfo.mobile.replace(/\D/g, ''))) {
      errors.mobile = 'Enter a valid mobile number.';
    }

    if (!basicInfo.password) {
      errors.password = 'Password is required.';
    } else if (basicInfo.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!basicInfo.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (basicInfo.confirmPassword !== basicInfo.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  }, [basicInfo]);

  const roleErrors = useMemo(() => {
    const errors = {};

    roleFields.forEach((field) => {
      const value = roleDetails[field.name];
      if (!field.required) return;

      if (field.type === 'file') {
        if (!value) errors[field.name] = `${field.label} is required.`;
        return;
      }

      if (!String(value || '').trim()) {
        errors[field.name] = `${field.label} is required.`;
      }
    });

    return errors;
  }, [roleDetails, roleFields]);

  const locationErrors = useMemo(() => {
    const errors = {};

    Object.keys(locationFieldLabels).forEach((key) => {
      if (!String(location[key] || '').trim()) {
        errors[key] = `${locationFieldLabels[key]} is required.`;
      }
    });

    return errors;
  }, [location]);

  const canSubmit =
    Object.keys(basicErrors).length === 0 &&
    Object.keys(roleErrors).length === 0 &&
    Object.keys(locationErrors).length === 0 &&
    termsAccepted &&
    otp.verified;

  const totalSteps = 4;
  const canGoNext =
    (currentStep === 1 && Object.keys(basicErrors).length === 0) ||
    (currentStep === 2 && Object.keys(roleErrors).length === 0) ||
    (currentStep === 3 && Object.keys(locationErrors).length === 0) ||
    (currentStep === 4 && otp.verified && termsAccepted)

  const handleBasicChange = (field, value) => {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (field, value) => {
    setRoleDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field, value) => {
    setLocation((prev) => ({ ...prev, [field]: value }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported on this browser.');
      return;
    }

    setStatusMessage('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));

        setLocation((prev) => ({
          ...prev,
          latitude,
          longitude,
          address: prev.address || `Detected Location (${latitude}, ${longitude})`,
          city: prev.city || 'Detected City',
          state: prev.state || 'Detected State',
          country: prev.country || 'India',
        }));

        setStatusMessage('Location detected successfully.');
      },
      () => {
        setStatusMessage('Unable to detect location. Please enter manually.');
      },
      { timeout: 10000 }
    );
  };

  const handleSendOtp = () => {
    const generated = `${Math.floor(100000 + Math.random() * 900000)}`;
    setOtp({ sent: true, verified: false, value: '', generated });
    setStatusMessage(`OTP sent to ${basicInfo.mobile || 'your number'}. Demo OTP: ${generated}`);
  };

  const handleVerifyOtp = () => {
    if (!otp.sent) {
      setStatusMessage('Please send OTP first.');
      return;
    }

    if (otp.value === otp.generated) {
      setOtp((prev) => ({ ...prev, verified: true }));
    } else {
      setOtp((prev) => ({ ...prev, verified: false }));
      setStatusMessage('Incorrect OTP. Please try again.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setStatusMessage('Please complete all required fields and verification steps.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Creating patient account...');
    try {
      await registerPatient({
        fullName: basicInfo.fullName.trim(),
        phoneNumber: basicInfo.mobile.trim(),
        email: basicInfo.email.trim() || '',
        password: basicInfo.password,
        confirmPassword: basicInfo.confirmPassword
      });
      setShowSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccessRedirect(selectedRole);
      }, 1200);
    } catch (error) {
      setIsSubmitting(false);
      setStatusMessage(error.message || 'Registration failed. Please try again.');
    }
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps && canGoNext) {
      setCurrentStep((prev) => prev + 1);
    } else if (!canGoNext) {
      setStatusMessage('Please complete the current step before continuing.');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const mapSrc =
    location.latitude && location.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.02}%2C${location.latitude - 0.02}%2C${location.longitude + 0.02}%2C${location.latitude + 0.02}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`
      : null;

  if (showSuccess) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 px-4 py-10">
        <div className="absolute inset-0 pointer-events-none">
          {['🏥', '🚑', '🩺', '❤️‍🩹'].map((symbol, index) => (
            <motion.span
              key={symbol}
              className="absolute text-3xl opacity-20"
              initial={{ y: 40, opacity: 0 }}
              animate={{
                y: [30, -30, 30],
                opacity: [0.1, 0.25, 0.1],
                x: [0, index % 2 === 0 ? 15 : -15, 0],
              }}
              transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut' }}
              style={{ left: `${20 + index * 20}%`, top: `${15 + index * 17}%` }}
            >
              {symbol}
            </motion.span>
          ))}
        </div>

        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full rounded-2xl border border-white/40 bg-white/60 p-8 text-center shadow-xl backdrop-blur-xl"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✅
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Account Created Successfully!</h2>
            <p className="mt-2 text-slate-600">
              Redirecting to your {roles.find((role) => role.key === selectedRole)?.label} Dashboard...
            </p>
            <p className="mt-6 text-sm text-slate-500">Preparing your workspace in the real-time healthcare network.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 px-4 py-8 md:px-6">
      <div className="absolute inset-0 pointer-events-none">
        {['🏥', '🚑', '🩺', '❤️‍🩹'].map((symbol, index) => (
          <motion.span
            key={`${symbol}-${index}`}
            className="absolute text-3xl opacity-20"
            initial={{ y: 40, opacity: 0 }}
            animate={{
              y: [30, -35, 30],
              opacity: [0.05, 0.2, 0.05],
              x: [0, index % 2 === 0 ? 20 : -20, 0],
            }}
            transition={{ duration: 8 + index * 0.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ left: `${7 + index * 23}%`, top: `${10 + index * 18}%` }}
          >
            {symbol}
          </motion.span>
        ))}
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 pt-16 lg:grid-cols-2 lg:items-start">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden gap-6 rounded-3xl border border-white/40 bg-white/40 p-8 shadow-xl backdrop-blur-sm lg:sticky lg:top-24 lg:flex lg:flex-col"
        >
          <div>
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-100/70 px-4 py-1 text-sm font-medium text-blue-700">
              Healthcare Coordination Platform
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-slate-800">
              One Intelligent Network for Emergency and Everyday Care
            </h1>
            <p className="mt-4 text-slate-600">
              MediSync AI connects hospitals, ambulances, doctors, and patients in real-time for faster, safer, and smarter healthcare operations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '📡', title: 'Real-time Sync' },
              { icon: '🚨', title: 'Critical Alerts' },
              { icon: '🧠', title: 'AI Triage Support' },
              { icon: '🔒', title: 'Secure Onboarding' },
            ].map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ y: -5, scale: 1.02 }}
                className="rounded-2xl border border-white/40 bg-white/60 p-4 shadow-md"
              >
                <span className="text-xl">{item.icon}</span>
                <p className="mt-2 font-semibold text-slate-700">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-white/40 bg-white/55 p-6 shadow-xl backdrop-blur-xl sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Patient Registration</h2>
              <p className="mt-2 text-sm text-slate-600">
                Complete your patient profile to join the real-time healthcare network.
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-blue-200 bg-white/70 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              ← Back
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[1, 2, 3, 4].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${currentStep === step
                  ? 'bg-blue-600 text-white'
                  : step < currentStep
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white/70 text-slate-600'
                  }`}
              >
                Step {step}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-6">
            {currentStep === 1 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Step 1 — Basic Account Information</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <InputWithIcon
                      icon={baseIconByField.fullName}
                      type="text"
                      placeholder="Full Name"
                      value={basicInfo.fullName}
                      onChange={(event) => handleBasicChange('fullName', event.target.value)}
                      error={basicErrors.fullName}
                    />
                  </div>
                  <InputWithIcon
                    icon={baseIconByField.email}
                    type="email"
                    placeholder="Email Address"
                    value={basicInfo.email}
                    onChange={(event) => handleBasicChange('email', event.target.value)}
                    error={basicErrors.email}
                  />
                  <InputWithIcon
                    icon={baseIconByField.mobile}
                    type="tel"
                    placeholder="Mobile Number"
                    value={basicInfo.mobile}
                    onChange={(event) => handleBasicChange('mobile', event.target.value)}
                    error={basicErrors.mobile}
                  />
                  <InputWithIcon
                    icon={baseIconByField.password}
                    type="password"
                    placeholder="Password"
                    value={basicInfo.password}
                    onChange={(event) => handleBasicChange('password', event.target.value)}
                    error={basicErrors.password}
                  />
                  <InputWithIcon
                    icon={baseIconByField.confirmPassword}
                    type="password"
                    placeholder="Confirm Password"
                    value={basicInfo.confirmPassword}
                    onChange={(event) => handleBasicChange('confirmPassword', event.target.value)}
                    error={basicErrors.confirmPassword}
                  />
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Step 2 — Patient Details</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {roleFields.map((field) => {
                    const error = roleErrors[field.name];
                    const value = roleDetails[field.name] || '';

                    if (field.type === 'select') {
                      return (
                        <SelectWithIcon
                          key={field.name}
                          icon="📝"
                          value={value}
                          options={field.options || []}
                          onChange={(event) => handleRoleChange(field.name, event.target.value)}
                          error={error}
                        />
                      );
                    }

                    if (field.type === 'file') {
                      return (
                        <div key={field.name} className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
                          <input
                            type="file"
                            className={`${inputClass} px-3 ${error ? 'border-red-400 focus:ring-red-100' : ''}`}
                            onChange={(event) => handleRoleChange(field.name, event.target.files?.[0] || null)}
                          />
                          {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
                        </div>
                      );
                    }

                    return (
                      <InputWithIcon
                        key={field.name}
                        icon="📝"
                        type={field.type || 'text'}
                        placeholder={field.label}
                        value={value}
                        onChange={(event) => handleRoleChange(field.name, event.target.value)}
                        error={error}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {currentStep === 3 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Step 3 — Location Details</h3>
                <div className="mt-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={detectLocation}
                    className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm"
                  >
                    📍 Detect My Location
                  </motion.button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.keys(locationFieldLabels).map((field) => (
                    <InputWithIcon
                      key={field}
                      icon="📍"
                      type="text"
                      placeholder={locationFieldLabels[field]}
                      value={location[field]}
                      onChange={(event) => handleLocationChange(field, event.target.value)}
                      error={locationErrors[field]}
                    />
                  ))}
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-white/40 bg-white/70 p-2">
                  {mapSrc ? (
                    <iframe
                      title="location-map-preview"
                      src={mapSrc}
                      className="h-40 w-full rounded-lg"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 text-sm text-slate-600">
                      Small map preview will appear after location detection.
                    </div>
                  )}
                </div>
              </section>
            )}

            {currentStep === 4 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Step 4 — OTP Verification</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-start">
                  <InputWithIcon
                    icon="🔢"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp.value}
                    onChange={(event) => setOtp((prev) => ({ ...prev, value: event.target.value }))}
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSendOtp}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    Send OTP
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleVerifyOtp}
                    className="rounded-xl bg-blue-100 px-4 py-3 text-sm font-semibold text-blue-700"
                  >
                    Verify OTP
                  </motion.button>
                </div>
                {otp.verified ? <p className="mt-2 text-sm font-semibold text-emerald-600">✅ Mobile Verified</p> : null}
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700"> Terms and Consent</h3>
                  <label className="mt-3 flex items-start gap-3 rounded-xl border border-white/40 bg-white/70 p-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <span>I agree to MediSync AI Terms and Privacy Policy.</span>
                  </label>
                </section>
              </section>
            )}

             
          </div>

          {statusMessage ? <p className="mt-6 text-sm text-slate-600">{statusMessage}</p> : null}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            {currentStep < totalSteps ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNextStep}
                disabled={!canGoNext}
                className="sm:col-span-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue to Step {currentStep + 1}
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!canSubmit || isSubmitting}
                className="sm:col-span-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </motion.button>
            )}
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default RegistrationPage;
