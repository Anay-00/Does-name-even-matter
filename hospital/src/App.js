import React, { useEffect, useRef, useState, Suspense } from 'react';
import './App.css';
import './styles/emergencyAnimations.css';

import ContactPage from './pages/ContactPage';
import EmergencySOSPage from './pages/EmergencySOSPage';
import FindDoctor from './pages/FindDoctor.jsx';
import HospitalsNetworkPage from './pages/HospitalsNetworkPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import RoleDashboardPage from './pages/RoleDashboardPage';
import TechnologyPage from './pages/TechnologyPage';
import Chatbot from "./components/Chatbot";
import FeaturesGrid from './components/FeaturesGrid';
import { getAccessToken, getSessionUser } from './services/authApi';

const FindMedicine = React.lazy(() => import("./pages/Findmedicine.jsx"));

const allowedViews = new Set([
  'landing',
  'sos',
  'hospitals',
  'technology',
  'contact',
  'login',
  'register',
  'dashboard',
  'findmedicine',
  'finddoctor'
]);

const allowedRoles = new Set([
  'patient',
  'hospital_admin_staff',
  'dispatch_operator',
  'doctor',
  'nurse',
  'admin',
  'super_admin'
]);

function getInitialAppState() {
  if (typeof window === 'undefined') {
    return { view: 'landing', role: 'patient' };
  }

  const query = new URLSearchParams(window.location.search);
  const viewFromUrl = query.get('view');
  const roleFromUrl = query.get('role');

  return {
    view: allowedViews.has(viewFromUrl) ? viewFromUrl : 'landing',
    role: allowedRoles.has(roleFromUrl) ? roleFromUrl : 'patient'
  };
}

function App() {
  const initial = getInitialAppState();
  const [view, setView] = useState(initial.view);
  const [dashboardRole, setDashboardRole] = useState(initial.role);
  const [showFeaturesPopup, setShowFeaturesPopup] = useState(false);
  const [sosPosition, setSosPosition] = useState({ x: 0, y: 110 });
  const [isDraggingSOS, setIsDraggingSOS] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const movedWhileDraggingRef = useRef(false);

  const SOS_BUTTON_SIZE = 64;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const rightOffset = 24;
    const initialX = Math.max(8, window.innerWidth - SOS_BUTTON_SIZE - rightOffset);
    setSosPosition({ x: initialX, y: 110 });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    query.set('view', view);

    if (view === 'dashboard') {
      query.set('role', dashboardRole);
    } else {
      query.delete('role');
    }

    const nextQuery = query.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [view, dashboardRole]);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (sessionUser?.role) {
      setDashboardRole(sessionUser.role);
    }
  }, []);

  useEffect(() => {
    if (view === 'dashboard' && !getAccessToken()) {
      setView('login');
    }
  }, [view]);

  useEffect(() => {
    if (!isDraggingSOS || typeof window === 'undefined') {
      return undefined;
    }

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    function handlePointerMove(event) {
      movedWhileDraggingRef.current = true;
      setSosPosition(() => {
        const maxX = Math.max(0, window.innerWidth - SOS_BUTTON_SIZE);
        const maxY = Math.max(0, window.innerHeight - SOS_BUTTON_SIZE);
        return {
          x: clamp(event.clientX - dragOffsetRef.current.x, 0, maxX),
          y: clamp(event.clientY - dragOffsetRef.current.y, 0, maxY)
        };
      });
    }

    function handlePointerUp() {
      setIsDraggingSOS(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingSOS]);

  function handleSOSPointerDown(event) {
    movedWhileDraggingRef.current = false;
    dragOffsetRef.current = {
      x: event.clientX - sosPosition.x,
      y: event.clientY - sosPosition.y
    };
    setIsDraggingSOS(true);
  }

  function handleSOSPopupClick(event) {
    if (movedWhileDraggingRef.current) {
      event.preventDefault();
      movedWhileDraggingRef.current = false;
      return;
    }
    setView('sos');
  }

  return (
    <>
      {view === 'sos' && <EmergencySOSPage onClose={() => setView('landing')} />}


      {view === 'landing' && (
        <LandingPage
          onSOSClick={() => setView('sos')}
          onLoginClick={() => setView('login')}
          onRegisterClick={() => setView('register')}
          onHospitalsClick={() => setView('hospitals')}
          onTechnologyClick={() => setView('technology')}
          onContactClick={() => setView('contact')}
          onFindMedicineClick={() => setView('findmedicine')}
          onFindDoctorClick={() => setView('finddoctor')}
          onFeaturesClick={() => setShowFeaturesPopup(true)}
        />
      )}

      {view === 'hospitals' && (
        <HospitalsNetworkPage
          onHomeClick={() => setView('landing')}
          onSOSClick={() => setView('sos')}
          onLoginClick={() => setView('login')}
          onRegisterClick={() => setView('register')}
          onHospitalsClick={() => setView('hospitals')}
          onTechnologyClick={() => setView('technology')}
          onContactClick={() => setView('contact')}
          onFindMedicineClick={() => setView('findmedicine')}
          onFindDoctorClick={() => setView('finddoctor')}
          onFeaturesClick={() => setShowFeaturesPopup(true)}
        />
      )}

      {view === 'technology' && (
        <TechnologyPage
          onHomeClick={() => setView('landing')}
          onSOSClick={() => setView('sos')}
          onLoginClick={() => setView('login')}
          onRegisterClick={() => setView('register')}
          onHospitalsClick={() => setView('hospitals')}
          onTechnologyClick={() => setView('technology')}
          onContactClick={() => setView('contact')}
          onFindMedicineClick={() => setView('findmedicine')}
          onFindDoctorClick={() => setView('finddoctor')}
          onFeaturesClick={() => setShowFeaturesPopup(true)}
        />
      )}

      {view === 'contact' && (
        <ContactPage
          onHomeClick={() => setView('landing')}
          onSOSClick={() => setView('sos')}
          onLoginClick={() => setView('login')}
          onRegisterClick={() => setView('register')}
          onHospitalsClick={() => setView('hospitals')}
          onTechnologyClick={() => setView('technology')}
          onContactClick={() => setView('contact')}
          onFindMedicineClick={() => setView('findmedicine')}
          onFindDoctorClick={() => setView('finddoctor')}
          onFeaturesClick={() => setShowFeaturesPopup(true)}
        />
      )}

      {view === 'login' && (
        <LoginPage
          onBack={() => setView('landing')}
          onCreateAccount={() => setView('register')}
          onSuccessRedirect={(role) => {
            setDashboardRole(role);
            setView('dashboard');
          }}
        />
      )}

      {view === 'register' && (
        <RegistrationPage
          onBack={() => setView('landing')}
          onSuccessRedirect={(role) => {
            setDashboardRole(role);
            setView('dashboard');
          }}
        />
      )}

      {view === 'dashboard' && (
        <RoleDashboardPage
          role={dashboardRole}
          onBackHome={() => setView('landing')}
        />
      )}

      {view === 'findmedicine' && (
        <Suspense fallback={<div>Loading...</div>}>
          <FindMedicine
            onBack={() => setView('landing')}
            onSOSClick={() => setView('sos')}
            onLoginClick={() => setView('login')}
            onRegisterClick={() => setView('register')}
            onHospitalsClick={() => setView('hospitals')}
            onTechnologyClick={() => setView('technology')}
            onContactClick={() => setView('contact')}
            onFindMedicineClick={() => setView('findmedicine')}
            onFindDoctorClick={() => setView('finddoctor')}
            onHomeClick={() => setView('landing')}
            onFeaturesClick={() => setShowFeaturesPopup(true)}
          />
        </Suspense>
      )}

      {view === 'finddoctor' && (
        <FindDoctor
          onBack={() => setView('landing')}
          onSOSClick={() => setView('sos')}
          onLoginClick={() => setView('login')}
          onRegisterClick={() => setView('register')}
          onHospitalsClick={() => setView('hospitals')}
          onTechnologyClick={() => setView('technology')}
          onContactClick={() => setView('contact')}
          onFindMedicineClick={() => setView('findmedicine')}
          onFindDoctorClick={() => setView('finddoctor')}
          onHomeClick={() => setView('landing')}
          onFeaturesClick={() => setShowFeaturesPopup(true)}
        />
      )}

      {showFeaturesPopup ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowFeaturesPopup(false)}
        >
          <div
            className="relative max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowFeaturesPopup(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-2xl text-gray-500 shadow-md hover:text-gray-700"
              aria-label="Close features"
            >
              ×
            </button>
            <div className="p-8">
              <FeaturesGrid modal={true} />
            </div>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onPointerDown={handleSOSPointerDown}
        onClick={handleSOSPopupClick}
        aria-label="Open SOS"
        title="Open SOS"
        className="fixed z-[60] rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-2xl"
        style={{
          left: `${sosPosition.x}px`,
          top: `${sosPosition.y}px`,
          width: `${SOS_BUTTON_SIZE}px`,
          height: `${SOS_BUTTON_SIZE}px`,
          cursor: isDraggingSOS ? 'grabbing' : 'grab',
          fontSize: '2rem',
          userSelect: 'none',
          boxShadow: '0 12px 28px rgba(220, 38, 38, 0.55), 0 0 24px rgba(239, 68, 68, 0.6)'
        }}
      >
        🚨
      </button>
      <Chatbot />

    </>

  );
}

export default App;
