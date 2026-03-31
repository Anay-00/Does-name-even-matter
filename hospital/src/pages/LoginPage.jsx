import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { loginWithPassword } from '../services/authApi';

const inputClass =
  'w-full rounded-xl border border-white/30 bg-white/80 px-11 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100';

const InputWithIcon = ({ icon, error, ...props }) => (
  <div>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">{icon}</span>
      <input {...props} className={`${inputClass} ${error ? 'border-red-400 focus:ring-red-100' : ''}`} />
    </div>
    {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
  </div>
);

const LoginPage = ({ onBack, onCreateAccount, onSuccessRedirect }) => {
  const selectedRole = 'patient';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const emailError = useMemo(() => {
    if (!email.trim()) return 'Phone number or email is required.';
    const normalized = email.trim();
    const asPhone = /^\d{10,15}$/.test(normalized.replace(/\D/g, ''));
    const asEmail = /^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/.test(normalized);
    if (!asPhone && !asEmail) return 'Enter a valid phone number or email.';
    return '';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return '';
  }, [password]);

  const canLoginWithPassword = !emailError && !passwordError;

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!canLoginWithPassword) {
      setStatusMessage('Complete required fields to continue login.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Authenticating securely...');

    try {
      await loginWithPassword({
        email: email.trim(),
        password,
        role: selectedRole
      });
      setStatusMessage('Login successful. Redirecting...');
      onSuccessRedirect(selectedRole, {
        rememberMe
      });
    } catch (error) {
      setStatusMessage(error.message || 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 px-4 py-8 md:px-6">
      <div className="absolute inset-0 pointer-events-none">
        {['🩺', '❤️‍🩹', '🏥', '🚑'].map((symbol, index) => (
          <motion.span
            key={`${symbol}-${index}`}
            className="absolute text-3xl opacity-10"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: [18, -20, 18], opacity: [0.06, 0.15, 0.06], x: [0, index % 2 ? -18 : 18, 0] }}
            transition={{ duration: 7 + index, repeat: Infinity, ease: 'easeInOut' }}
            style={{ left: `${10 + index * 22}%`, top: `${12 + index * 16}%` }}
          >
            {symbol}
          </motion.span>
        ))}
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 pt-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-white/40 bg-gradient-to-br from-blue-100/70 via-white/40 to-cyan-100/70 p-6 shadow-xl backdrop-blur-sm sm:p-8"
        >
          <h2 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">Real-Time Healthcare Network</h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Hospitals, ambulances, doctors, and patients connected for emergency-ready care.
          </p>

          <div className="relative mt-8 h-[320px] rounded-2xl border border-white/40 bg-white/55 p-4">
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              {Array.from({ length: 34 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute h-1 w-1 rounded-full bg-blue-300/40"
                  style={{ left: `${(i * 11) % 100}%`, top: `${(i * 19) % 100}%` }}
                />
              ))}
            </div>

            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full px-4 py-3">
              <line x1="22" y1="24" x2="78" y2="26" stroke="rgb(147 197 253 / 0.85)" strokeWidth="1.6" strokeDasharray="2 2" />
              <line x1="22" y1="24" x2="30" y2="74" stroke="rgb(147 197 253 / 0.85)" strokeWidth="1.6" strokeDasharray="2 2" />
              <line x1="78" y1="26" x2="70" y2="72" stroke="rgb(147 197 253 / 0.85)" strokeWidth="1.6" strokeDasharray="2 2" />
              <line x1="30" y1="74" x2="70" y2="72" stroke="rgb(147 197 253 / 0.85)" strokeWidth="1.6" strokeDasharray="2 2" />
            </svg>

            <motion.span
              className="pointer-events-none absolute left-[22%] top-[24%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
              animate={{ x: [0, 56, 0], y: [0, 2, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="pointer-events-none absolute left-[30%] top-[74%] h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
              animate={{ x: [0, 38, 0], y: [0, -2, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="absolute left-[12%] top-[12%]">
              <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3.5, repeat: Infinity }} className="rounded-full bg-white/90 p-3 text-2xl shadow-md">🏥</motion.div>
              <span className="mt-1 block text-xs font-semibold text-slate-600">Hospital Hub</span>
            </div>
            <div className="absolute right-[10%] top-[14%]">
              <motion.div animate={{ y: [0, -9, 0] }} transition={{ duration: 3.8, repeat: Infinity }} className="rounded-full bg-white/90 p-3 text-2xl shadow-md">🚑</motion.div>
              <span className="mt-1 block text-xs font-semibold text-slate-600">Ambulance Fleet</span>
            </div>
            <div className="absolute left-[18%] bottom-[10%]">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }} className="rounded-full bg-white/90 p-3 text-2xl shadow-md">👨‍⚕️</motion.div>
              <span className="mt-1 block text-xs font-semibold text-slate-600">Doctor Network</span>
            </div>
            <div className="absolute right-[18%] bottom-[9%]">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.2, repeat: Infinity }} className="rounded-full bg-white/90 p-3 text-2xl shadow-md">📍</motion.div>
              <span className="mt-1 block text-xs font-semibold text-slate-600">Patient Location</span>
            </div>

            <div className="absolute right-3 top-3 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              ● Network Live
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/40 bg-white/70 p-3 text-center">
              <p className="text-xs text-slate-500">Active Hospitals</p>
              <p className="mt-1 text-lg font-bold text-slate-800">148</p>
            </div>
            <div className="rounded-xl border border-white/40 bg-white/70 p-3 text-center">
              <p className="text-xs text-slate-500">Ambulances Live</p>
              <p className="mt-1 text-lg font-bold text-slate-800">312</p>
            </div>
            <div className="rounded-xl border border-white/40 bg-white/70 p-3 text-center">
              <p className="text-xs text-slate-500">Avg Sync Delay</p>
              <p className="mt-1 text-lg font-bold text-slate-800">1.2s</p>
            </div>
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleLogin}
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto w-full max-w-[420px] rounded-2xl border border-white/40 bg-white/55 p-6 shadow-xl backdrop-blur-xl sm:p-8 md:max-w-[460px]"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Patient Login</h1>
              <p className="mt-2 text-sm text-slate-600">
                Login to access your healthcare profile and emergency support tools.
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

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            👤 Patient Login
          </div>

          <div className="mt-5 space-y-4">
            <InputWithIcon icon="📧" type="text" placeholder="Phone number or Email" value={email} onChange={(event) => setEmail(event.target.value)} error={emailError} />
            <InputWithIcon icon="🔒" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} error={passwordError} />

            <div className="flex items-center justify-end">
              <button type="button" className="text-sm text-blue-600 underline-offset-4 transition hover:underline">
                Forgot Password?
              </button>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span>Remember my login.</span>
          </label>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading || !canLoginWithPassword}
            className="mt-5 w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Authenticating...' : '🔐 Login to Dashboard'}
          </motion.button>

          {statusMessage ? <p className="mt-3 text-sm text-slate-600">{statusMessage}</p> : null}

          <div className="mt-5 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <button type="button" onClick={onCreateAccount} className="font-semibold text-blue-700 hover:underline">
              Create Account
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default LoginPage;
