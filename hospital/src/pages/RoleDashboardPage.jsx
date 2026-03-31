import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { clearSession, getAccessToken, getSessionUser } from '../services/authApi';
import {
  createManualHospitalRequest,
  getCommandCenterSnapshot,
  listEmergencyMedia,
  listHospitalRequests,
  respondToRequest,
  retryRequestAllocation
} from '../services/emergencyApi';
import { connectRealtimeEvents } from '../services/realtimeApi';
import * as AdminDashboardModule from '../apps/admin-dashboard/AdminDashboardApp';
import * as HospitalDashboardModule from '../apps/hospital-dashboard/HospitalDashboardApp';
import * as PatientDashboardModule from '../apps/patient-dashboard/PatientDashboardApp';
import {
  createPatientRequest,
  getPatientProfile,
  listActivePatientRequests,
  listPatientNotifications,
  listPatientRequestHistory,
  updatePatientProfile
} from '../services/patientApi';

const AdminDashboardApp = AdminDashboardModule.default || AdminDashboardModule.AdminDashboardApp;
const HospitalDashboardApp = HospitalDashboardModule.default || HospitalDashboardModule.HospitalDashboardApp;
const PatientDashboardApp = PatientDashboardModule.default || PatientDashboardModule.PatientDashboardApp;

function statusClass(status) {
  const map = {
    accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending_hospital_response: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected_retrying: 'bg-orange-100 text-orange-700 border-orange-200',
    failed_no_match: 'bg-rose-100 text-rose-700 border-rose-200',
    cancelled: 'bg-slate-200 text-slate-700 border-slate-300',
    created: 'bg-blue-100 text-blue-700 border-blue-200'
  };
  return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function prettyStatus(status) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const RoleDashboardPage = ({ role = 'patient', onBackHome }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState(role === 'doctor' ? 'accepted' : 'pending_hospital_response');
  const [isActioningId, setIsActioningId] = useState('');
  const [commandCenter, setCommandCenter] = useState(null);
  const [wallMode, setWallMode] = useState(false);
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [mediaByRequest, setMediaByRequest] = useState({});
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientProfileForm, setPatientProfileForm] = useState({});
  const [patientActiveRequests, setPatientActiveRequests] = useState([]);
  const [patientHistoryRequests, setPatientHistoryRequests] = useState([]);
  const [patientNotifications, setPatientNotifications] = useState([]);
  const [patientRequestForm, setPatientRequestForm] = useState({
    resourceType: 'ambulance',
    patientCondition: '',
    priorityLevel: 'high',
    address: '',
    latitude: '22.7196',
    longitude: '75.8577',
    additionalNotes: ''
  });
  const [isSubmittingPatientRequest, setIsSubmittingPatientRequest] = useState(false);
  const [isSavingPatientProfile, setIsSavingPatientProfile] = useState(false);
  const [patientStatusMessage, setPatientStatusMessage] = useState('');
  const [manualForm, setManualForm] = useState({
    patientName: '',
    callerPhone: '',
    emergencyType: 'trauma_injury',
    symptom: 'trauma_injury',
    address: 'AITR, Indore',
    latitude: '22.824',
    longitude: '75.943'
  });
  const token = useMemo(() => getAccessToken(), []);
  const sessionUser = useMemo(() => getSessionUser(), []);
  const isOperationalRole = role !== 'patient';
  const canRespond = ['hospital_admin_staff', 'dispatch_operator', 'doctor', 'nurse'].includes(role);
  const canRetry = ['hospital_admin_staff', 'dispatch_operator', 'admin', 'super_admin'].includes(role);
  const canManualCreate = ['hospital_admin_staff', 'dispatch_operator', 'admin', 'super_admin'].includes(role);
  const isCommandCenterRole = ['admin', 'super_admin'].includes(role);
  const isHospitalDashboard = ['hospital_admin_staff', 'dispatch_operator', 'doctor', 'nurse'].includes(role);
  const isPatientRole = role === 'patient';

  const dashboardKind = isCommandCenterRole ? 'admin' : isHospitalDashboard ? 'hospital' : 'patient';

  const dashboardCards = useMemo(() => {
    const counters = commandCenter?.counters || {};
    if (dashboardKind === 'admin') {
      return [
        { label: 'Total Requests', value: counters.total ?? 0, tone: 'text-blue-700' },
        { label: 'Pending Decisions', value: counters.pending_hospital_response ?? 0, tone: 'text-amber-700' },
        { label: 'Accepted', value: counters.accepted ?? 0, tone: 'text-emerald-700' },
        { label: 'Unresolved', value: (counters.failed_no_match ?? 0) + (counters.rejected_retrying ?? 0), tone: 'text-rose-700' }
      ];
    }

    if (dashboardKind === 'hospital') {
      return [
        { label: 'Queue Total', value: counters.total ?? items.length, tone: 'text-blue-700' },
        { label: 'Awaiting Response', value: counters.pending_hospital_response ?? 0, tone: 'text-amber-700' },
        { label: 'Handled (Accepted)', value: counters.accepted ?? 0, tone: 'text-emerald-700' },
        { label: 'Retries/Failures', value: (counters.failed_no_match ?? 0) + (counters.rejected_retrying ?? 0), tone: 'text-indigo-700' }
      ];
    }

    return [];
  }, [commandCenter?.counters, dashboardKind, items.length]);

  const recentActivity = useMemo(() => commandCenter?.recent || [], [commandCenter?.recent]);

  const loadCommandCenter = useCallback(async () => {
    if (!isOperationalRole || !token) {
      return;
    }
    try {
      const snapshot = await getCommandCenterSnapshot(token);
      setCommandCenter(snapshot);
    } catch {
      // Keep prior snapshot silently.
    }
  }, [isOperationalRole, token]);

  const loadRequests = useCallback(async () => {
    if (!isOperationalRole || !token) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const payload = await listHospitalRequests(token, {
        status: activeStatus,
        limit: 30
      });
      setItems(payload.items || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch requests.');
    } finally {
      setIsLoading(false);
    }
  }, [activeStatus, isOperationalRole, token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadCommandCenter();
  }, [loadCommandCenter]);

  useEffect(() => {
    if (!isOperationalRole || !token) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadRequests();
      loadCommandCenter();
    }, 10000);

    return () => clearInterval(timer);
  }, [isOperationalRole, loadCommandCenter, loadRequests, token]);

  useEffect(() => {
    if (role !== 'doctor' || !token || items.length === 0) {
      return;
    }

    const acceptedItems = items.filter((item) => item.status === 'accepted').slice(0, 12);
    void Promise.all(
      acceptedItems.map(async (item) => {
        try {
          const payload = await listEmergencyMedia(token, item.id);
          return [item.id, payload.items || []];
        } catch {
          return [item.id, []];
        }
      })
    ).then((pairs) => {
      setMediaByRequest((prev) => {
        const next = { ...prev };
        for (const [requestId, list] of pairs) {
          next[requestId] = list;
        }
        return next;
      });
    });
  }, [items, role, token]);

  useEffect(() => {
    if (!isOperationalRole || !token) {
      return undefined;
    }

    const disconnect = connectRealtimeEvents(token, (event) => {
      if (!event?.type || event.type === 'heartbeat') {
        return;
      }
      loadRequests();
      loadCommandCenter();
    });

    return () => disconnect();
  }, [isOperationalRole, loadCommandCenter, loadRequests, token]);

  const loadPatientDashboard = useCallback(async () => {
    if (!isPatientRole || !token) {
      return;
    }
    try {
      const [profilePayload, activePayload, historyPayload, notificationPayload] = await Promise.all([
        getPatientProfile(token),
        listActivePatientRequests(token),
        listPatientRequestHistory(token),
        listPatientNotifications(token)
      ]);

      const profile = profilePayload?.profile || null;
      setPatientProfile(profile);
      setPatientProfileForm(profile || {});
      setPatientActiveRequests(activePayload?.items || []);
      setPatientHistoryRequests(historyPayload?.items || []);
      setPatientNotifications(notificationPayload?.items || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load patient dashboard.');
    }
  }, [isPatientRole, token]);

  useEffect(() => {
    if (!isPatientRole || !token) {
      return undefined;
    }

    void loadPatientDashboard();
    const timer = setInterval(() => {
      void loadPatientDashboard();
    }, 10000);
    return () => clearInterval(timer);
  }, [isPatientRole, loadPatientDashboard, token]);

  const handleSubmitPatientRequest = async () => {
    if (!token) {
      return;
    }

    if (!patientRequestForm.patientCondition.trim() || !patientRequestForm.address.trim()) {
      setError('Please fill patient condition and location.');
      return;
    }

    setIsSubmittingPatientRequest(true);
    setError('');
    try {
      await createPatientRequest(token, {
        resourceType: patientRequestForm.resourceType,
        patientCondition: patientRequestForm.patientCondition,
        priorityLevel: patientRequestForm.priorityLevel,
        location: {
          latitude: Number(patientRequestForm.latitude),
          longitude: Number(patientRequestForm.longitude),
          address: patientRequestForm.address
        },
        additionalNotes: patientRequestForm.additionalNotes
      });
      setPatientStatusMessage('Emergency request submitted successfully.');
      setPatientRequestForm((prev) => ({ ...prev, patientCondition: '', additionalNotes: '' }));
      await loadPatientDashboard();
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit request.');
    } finally {
      setIsSubmittingPatientRequest(false);
    }
  };

  const handleSavePatientProfile = async () => {
    if (!token) {
      return;
    }
    setIsSavingPatientProfile(true);
    setError('');
    try {
      const payload = await updatePatientProfile(token, {
        fullName: patientProfileForm.fullName,
        emergencyContact: patientProfileForm.emergencyContact,
        address: patientProfileForm.address,
        city: patientProfileForm.city,
        state: patientProfileForm.state,
        medicalConditions: patientProfileForm.medicalConditions,
        allergies: patientProfileForm.allergies
      });
      setPatientProfile(payload.profile);
      setPatientProfileForm(payload.profile);
      setPatientStatusMessage('Profile updated successfully.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save profile.');
    } finally {
      setIsSavingPatientProfile(false);
    }
  };

  const handleAction = async (requestId, action, assignedHospitalId) => {
    if (!token) {
      return;
    }
    setIsActioningId(requestId);
    setError('');
    try {
      await respondToRequest(token, requestId, {
        action,
        hospitalId: sessionUser?.hospitalId || assignedHospitalId || undefined
      });
      await loadRequests();
    } catch (actionError) {
      setError(actionError.message || 'Unable to submit response.');
    } finally {
      setIsActioningId('');
    }
  };

  const handleRetry = async (requestId) => {
    if (!token) {
      return;
    }

    setIsActioningId(requestId);
    setError('');
    try {
      await retryRequestAllocation(token, requestId, 'manual_retry_from_dashboard');
      await loadRequests();
      await loadCommandCenter();
    } catch (actionError) {
      setError(actionError.message || 'Unable to retry request.');
    } finally {
      setIsActioningId('');
    }
  };

  const handleManualCreate = async () => {
    if (!token) {
      return;
    }

    const patientName = manualForm.patientName.trim();
    const callerPhone = manualForm.callerPhone.trim();
    if (!patientName || callerPhone.length < 10) {
      setError('Manual create requires patient name and valid caller phone.');
      return;
    }

    setIsCreatingManual(true);
    setError('');
    try {
      const resourcesByType = {
        cardiac_arrest: ['ambulance', 'icu_bed', 'emergency_doctor'],
        stroke_alert: ['ambulance', 'icu_bed', 'emergency_doctor'],
        trauma_injury: ['ambulance', 'normal_bed', 'emergency_doctor'],
        respiratory_distress: ['ambulance', 'normal_bed', 'emergency_doctor'],
        fever_illness: ['ambulance', 'normal_bed'],
        minor_injury: ['ambulance', 'normal_bed']
      };

      await createManualHospitalRequest(token, {
        callerName: patientName,
        callerPhone,
        patientName,
        patientAge: 30,
        patientGender: 'other',
        emergencyType: manualForm.emergencyType,
        symptoms: [manualForm.symptom],
        requestedResources: resourcesByType[manualForm.emergencyType] || ['ambulance', 'normal_bed', 'emergency_doctor'],
        location: {
          latitude: Number(manualForm.latitude),
          longitude: Number(manualForm.longitude),
          address: manualForm.address,
          landmark: 'Dispatch Console'
        },
        requestedForSelf: false
      });
      setManualForm((prev) => ({
        ...prev,
        patientName: '',
        callerPhone: ''
      }));
      await loadRequests();
      await loadCommandCenter();
    } catch (createError) {
      setError(createError.message || 'Unable to create manual emergency request.');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const logoutAndExit = () => {
    clearSession();
    onBackHome?.();
  };

  const renderActionButtons = (item) => (
    <>
      {canRespond && item.status === 'pending_hospital_response' ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={isActioningId === item.id}
            onClick={() => handleAction(item.id, 'accept', item.assignedHospitalId)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={isActioningId === item.id}
            onClick={() => handleAction(item.id, 'reject', item.assignedHospitalId)}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      ) : null}

      {canRetry && ['failed_no_match', 'rejected_retrying', 'pending_hospital_response'].includes(item.status) ? (
        <div className="mt-3">
          <button
            type="button"
            disabled={isActioningId === item.id}
            onClick={() => handleRetry(item.id)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Retry Allocation
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur-xl sm:p-10"
        >
          {isOperationalRole ? (
            <div className="mb-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onBackHome}
                className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
              >
                Back to Home
              </button>
              <button
                type="button"
                onClick={logoutAndExit}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                Logout
              </button>
            </div>
          ) : null}

          {isOperationalRole ? (
            dashboardKind === 'admin' ? (
              <AdminDashboardApp
                dashboardCards={dashboardCards}
                wallMode={wallMode}
                setWallMode={setWallMode}
                commandCenter={commandCenter}
                prettyStatus={prettyStatus}
                activeStatus={activeStatus}
                setActiveStatus={setActiveStatus}
                loadRequests={loadRequests}
                canManualCreate={canManualCreate}
                manualForm={manualForm}
                setManualForm={setManualForm}
                handleManualCreate={handleManualCreate}
                isCreatingManual={isCreatingManual}
                error={error}
                isLoading={isLoading}
                items={items}
                renderActionButtons={renderActionButtons}
                statusClass={statusClass}
                recentActivity={recentActivity}
              />
            ) : (
              <HospitalDashboardApp
                role={role}
                dashboardCards={dashboardCards}
                prettyStatus={prettyStatus}
                activeStatus={activeStatus}
                setActiveStatus={setActiveStatus}
                loadRequests={loadRequests}
                canManualCreate={canManualCreate}
                manualForm={manualForm}
                setManualForm={setManualForm}
                handleManualCreate={handleManualCreate}
                isCreatingManual={isCreatingManual}
                error={error}
                isLoading={isLoading}
                items={items}
                renderActionButtons={renderActionButtons}
                statusClass={statusClass}
                recentActivity={recentActivity}
                mediaByRequest={mediaByRequest}
              />
            )
          ) : (
            <PatientDashboardApp
              profile={patientProfile}
              activeRequests={patientActiveRequests}
              historyRequests={patientHistoryRequests}
              notifications={patientNotifications}
              createRequestForm={patientRequestForm}
              setCreateRequestForm={setPatientRequestForm}
              onSubmitRequest={handleSubmitPatientRequest}
              isSubmittingRequest={isSubmittingPatientRequest}
              onSaveProfile={handleSavePatientProfile}
              profileForm={patientProfileForm}
              setProfileForm={setPatientProfileForm}
              isSavingProfile={isSavingPatientProfile}
              statusMessage={patientStatusMessage}
              error={error}
              onBackHome={onBackHome}
              onLogout={logoutAndExit}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RoleDashboardPage;
