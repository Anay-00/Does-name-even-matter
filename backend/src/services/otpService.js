const otpStore = new Map();

export function sendMockOtp(phone) {
  const otp = "123456";
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(phone, { otp, expiresAt });
  return { phone, otp, expiresAt };
}

export function verifyMockOtp(phone, otp) {
  const record = otpStore.get(phone);
  if (!record) {
    return false;
  }
  if (record.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return false;
  }
  const ok = record.otp === otp;
  if (ok) {
    otpStore.delete(phone);
  }
  return ok;
}
