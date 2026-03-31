import { useMemo } from 'react';

function PatientDashboardApp({
  profile,
  activeRequests,
  historyRequests,
  notifications,
  createRequestForm,
  setCreateRequestForm,
  onSubmitRequest,
  isSubmittingRequest,
  onSaveProfile,
  profileForm,
  setProfileForm,
  isSavingProfile,
  statusMessage,
  error,
  onBackHome,
  onLogout
}) {
  const summary = useMemo(() => {
    const pending = activeRequests.filter((item) => item.status === "pending").length;
    const allocated = activeRequests.filter((item) => item.status === "allocated").length;
    const progress = activeRequests.filter((item) => item.status === "in_progress").length;
    const completed = historyRequests.filter((item) => item.status === "completed").length;
    return { pending, allocated, progress, completed };
  }, [activeRequests, historyRequests]);

  const acceptedRequests = summary.allocated + summary.progress + summary.completed;
  const alertsCount = notifications.length + (error ? 1 : 0);
  const latestTracking = activeRequests.find((item) => item.ambulanceLocation || item.hospitalLocation) || null;
  const patientName = profile?.fullName || 'Patient';
  const initials = patientName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || 'PT';

  const quickActions = [
    { label: 'Request ICU Bed', resourceType: 'icu_bed', tone: 'from-blue-600 to-cyan-500' },
    { label: 'Call Ambulance', resourceType: 'ambulance', tone: 'from-rose-600 to-red-500' },
    { label: 'Request Ventilator', resourceType: 'ventilator', tone: 'from-indigo-600 to-blue-500' },
    { label: 'Emergency Doctor', resourceType: 'emergency_doctor', tone: 'from-emerald-600 to-teal-500' }
  ];

  const liveUpdates = useMemo(() => {
    const fromRequests = activeRequests.map((item) => ({
      id: `request-${item.id}`,
      title: `${item.resourceType} request ${item.status.replace(/_/g, ' ')}`,
      message: item.assignedHospitalName
        ? `Assigned hospital: ${item.assignedHospitalName}`
        : 'Waiting for hospital assignment.',
      createdAt: item.updatedAt || item.createdAt || new Date().toISOString()
    }));

    const fromNotifications = notifications.map((note) => ({
      id: `note-${note.id}`,
      title: note.title,
      message: note.message,
      createdAt: note.createdAt
    }));

    return [...fromRequests, ...fromNotifications]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
  }, [activeRequests, notifications]);

  const jumpToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleQuickAction = (resourceType) => {
    setCreateRequestForm((prev) => ({
      ...prev,
      resourceType,
      priorityLevel: resourceType === 'ambulance' ? 'critical' : prev.priorityLevel
    }));
    jumpToSection('request-service');
  };

  const sidebarItems = [
    { label: 'Dashboard', sectionId: 'dashboard-overview' },
    { label: 'Request Service', sectionId: 'request-service' },
    { label: 'Active Requests', sectionId: 'active-requests' },
    { label: 'Request History', sectionId: 'request-history' },
    { label: 'Live Tracking', sectionId: 'live-tracking' },
    { label: 'Profile', sectionId: 'profile-management' },
    { label: 'Settings', sectionId: 'settings-panel' }
  ];

  return (
    <div className="relative min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white px-4 py-6 shadow-sm lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white">PT</div>
          <div>
            <p className="text-sm font-bold text-slate-800">Patient Portal</p>
            <p className="text-xs text-slate-500">Care Dashboard</p>
          </div>
        </div>

        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => jumpToSection(item.sectionId)}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="px-4 py-5 lg:ml-64 lg:px-8">
        <header className="sticky top-0 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Patient Dashboard</h1>
              <p className="text-sm text-slate-500">Modern, live and connected patient care console</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span>●</span> Live Connected
              </span>
              <button
                type="button"
                onClick={() => jumpToSection('live-updates')}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Notifications ({notifications.length})
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{initials}</div>
              <button
                type="button"
                onClick={onBackHome}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Home
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full bg-gradient-to-r from-slate-700 to-slate-800 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {statusMessage ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</p> : null}
        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section id="dashboard-overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Active Requests</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">{activeRequests.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Accepted Requests</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">{acceptedRequests}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending Requests</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-700">{summary.pending}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Alerts</p>
            <p className="mt-2 text-3xl font-extrabold text-rose-700">{alertsCount}</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <button
                key={action.resourceType}
                type="button"
                onClick={() => handleQuickAction(action.resourceType)}
                className={`rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-semibold text-white shadow-sm ${action.tone}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div id="active-requests" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Active Requests</h3>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{activeRequests.length} Active</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Request Type</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Assigned Hospital</th>
                    <th className="px-2 py-2">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-5 text-center text-slate-500">No active requests.</td>
                    </tr>
                  ) : (
                    activeRequests.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-2 py-3 font-medium">{item.resourceType}</td>
                        <td className="px-2 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                        </td>
                        <td className="px-2 py-3">{item.assignedHospitalName || 'Pending assignment'}</td>
                        <td className="px-2 py-3">{item.ambulanceEtaMinutes ? `${item.ambulanceEtaMinutes} mins` : 'Pending'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div id="live-updates" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">Live Updates</h3>
            <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-1">
              {liveUpdates.length === 0 ? <p className="text-sm text-slate-600">No live updates yet.</p> : null}
              {liveUpdates.map((update) => (
                <div key={update.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{update.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{update.message}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{new Date(update.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div id="request-service" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h3 className="text-lg font-bold text-slate-800">Request Service</h3>
            <p className="mt-1 text-sm text-slate-600">Create and submit care or emergency service requests.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={createRequestForm.resourceType}
                onChange={(event) => setCreateRequestForm((prev) => ({ ...prev, resourceType: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="icu_bed">ICU Bed</option>
                <option value="normal_bed">Normal Bed</option>
                <option value="ambulance">Ambulance</option>
                <option value="ventilator">Ventilator</option>
                <option value="emergency_doctor">Emergency Doctor</option>
              </select>
              <select
                value={createRequestForm.priorityLevel}
                onChange={(event) => setCreateRequestForm((prev) => ({ ...prev, priorityLevel: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input
                value={createRequestForm.patientCondition}
                onChange={(event) => setCreateRequestForm((prev) => ({ ...prev, patientCondition: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm sm:col-span-2"
                placeholder="Patient condition"
              />
              <input
                value={createRequestForm.address}
                onChange={(event) => setCreateRequestForm((prev) => ({ ...prev, address: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm sm:col-span-2"
                placeholder="Current location address"
              />
              <input
                type="number"
                step="0.000001"
                value={createRequestForm.latitude}
                onChange={(event) => setCreateRequestForm((prev) => ({ ...prev, latitude: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                placeholder="Latitude"
              />
              <input
                type="number"
                step="0.000001"
                value={createRequestForm.longitude}
                onChange={(event) => setCreateRequestForm((prev) => ({ ...prev, longitude: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                placeholder="Longitude"
              />
              <textarea
                value={createRequestForm.additionalNotes}
                onChange={(event) => setCreateRequestForm((prev) => ({ ...prev, additionalNotes: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm sm:col-span-2"
                rows={3}
                placeholder="Additional notes"
              />
            </div>

            <button
              type="button"
              disabled={isSubmittingRequest}
              onClick={onSubmitRequest}
              className="mt-4 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60"
            >
              {isSubmittingRequest ? "Submitting..." : "Submit Emergency Request"}
            </button>
          </div>

          <div id="live-tracking" className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">Live Tracking</h3>
            {!latestTracking ? <p className="mt-2 text-sm text-slate-600">No live ambulance tracking available yet.</p> : null}
            {latestTracking ? (
              <div className="mt-3 rounded-xl border border-cyan-200 bg-white/80 p-4 text-sm text-slate-700">
                <p className="font-semibold">Request: {latestTracking.id}</p>
                <p className="mt-1">Hospital: {latestTracking.assignedHospitalName || 'Pending'}</p>
                <p className="mt-1">ETA: {latestTracking.ambulanceEtaMinutes ? `${latestTracking.ambulanceEtaMinutes} mins` : 'Pending'}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Ambulance Coordinates: {latestTracking.ambulanceLocation ? `${latestTracking.ambulanceLocation.latitude}, ${latestTracking.ambulanceLocation.longitude}` : 'Not yet available'}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div id="request-history" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Request History</h3>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{historyRequests.length} Total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Request</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRequests.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-5 text-center text-slate-500">No request history.</td>
                    </tr>
                  ) : (
                    historyRequests.slice(0, 8).map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-2 py-3 font-medium">{item.resourceType}</td>
                        <td className="px-2 py-3">{item.status}</td>
                        <td className="px-2 py-3 text-xs">{new Date(item.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div id="profile-management" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">Profile Management</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={profileForm.fullName || ""} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Full name" />
              <input value={profileForm.emergencyContact || ""} onChange={(e) => setProfileForm((p) => ({ ...p, emergencyContact: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Emergency contact" />
              <input value={profileForm.address || ""} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm sm:col-span-2" placeholder="Address" />
              <input value={profileForm.city || ""} onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="City" />
              <input value={profileForm.state || ""} onChange={(e) => setProfileForm((p) => ({ ...p, state: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="State" />
            </div>
            <button
              type="button"
              disabled={isSavingProfile}
              onClick={onSaveProfile}
              className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div id="settings-panel" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">Settings</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span>Email Alerts</span>
                <span className="text-emerald-700">Enabled</span>
              </label>
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span>SMS Updates</span>
                <span className="text-emerald-700">Enabled</span>
              </label>
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span>Auto Refresh</span>
                <span className="text-emerald-700">10s</span>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Notifications</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{notifications.length}</span>
            </div>
            <div className="mt-4 max-h-[360px] space-y-2 overflow-auto pr-1">
              {notifications.length === 0 ? <p className="text-sm text-slate-600">No notifications.</p> : null}
              {notifications.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.message}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export { PatientDashboardApp };
export default PatientDashboardApp;
