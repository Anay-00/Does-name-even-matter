const PROFILE_KEY = "medisync.pwa.profile";
const REQUEST_KEY = "medisync.pwa.activeRequest";
const QUEUE_KEY = "medisync.pwa.requestQueue";
const AUTH_KEY = "medisync.pwa.auth";
const HOUSEHOLD_KEY = "medisync.pwa.household";
const SETUP_DONE_KEY = "medisync.pwa.setupDone";
const REQUEST_HISTORY_KEY = "medisync.pwa.requestHistory";

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function loadProfile() {
  return readJson(PROFILE_KEY, {
    name: "",
    phone: "",
    age: "",
    gender: "male"
  });
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadActiveRequest() {
  return readJson(REQUEST_KEY, null);
}

export function saveActiveRequest(request) {
  if (!request) {
    localStorage.removeItem(REQUEST_KEY);
    return;
  }
  localStorage.setItem(REQUEST_KEY, JSON.stringify(request));
}

export function loadQueue() {
  return readJson(QUEUE_KEY, []);
}

export function saveQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function loadAuthSession() {
  return readJson(AUTH_KEY, {
    verified: false,
    phone: "",
    verifiedAt: null
  });
}

export function saveAuthSession(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function loadHousehold() {
  return readJson(HOUSEHOLD_KEY, []);
}

export function saveHousehold(items) {
  localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(items));
}

export function loadSetupDone() {
  return readJson(SETUP_DONE_KEY, false);
}

export function saveSetupDone(done) {
  localStorage.setItem(SETUP_DONE_KEY, JSON.stringify(Boolean(done)));
}

export function loadRequestHistory() {
  return readJson(REQUEST_HISTORY_KEY, []);
}

export function saveRequestHistory(items) {
  localStorage.setItem(REQUEST_HISTORY_KEY, JSON.stringify(items));
}
