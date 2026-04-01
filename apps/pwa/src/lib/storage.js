const BOOKING_KEY = "opd_pwa.booking";
const HOSPITAL_KEY = "opd_pwa.lastHospital";

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function loadBooking() {
  return readJson(BOOKING_KEY, null);
}

export function saveBooking(booking) {
  if (!booking) {
    localStorage.removeItem(BOOKING_KEY);
    return;
  }
  localStorage.setItem(BOOKING_KEY, JSON.stringify(booking));
}

export function loadLastHospital() {
  return readJson(HOSPITAL_KEY, null);
}

export function saveLastHospital(hospital) {
  localStorage.setItem(HOSPITAL_KEY, JSON.stringify(hospital));
}
