import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MessageSquareCode,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { auth } from '../lib/firebase.ts';
import { useApp } from '../context/AppContext.tsx';
import { BackBar } from './BackBar.tsx';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

function getEmailAuthError(
  err: any,
  options?: { isAdmin?: boolean; isGoogle?: boolean; isOtp?: boolean }
): { message: string; notice?: string } {
  const code = err?.code || '';
  const isAdmin = Boolean(options?.isAdmin);
  const isGoogle = Boolean(options?.isGoogle);
  const isOtp = Boolean(options?.isOtp);

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      message: 'Gmail login popup band kar diya gaya. Dobara "Continue with Gmail (Google)" par click karein.',
    };
  }
  if (code === 'auth/popup-blocked') {
    return {
      message: 'Browser ne Gmail login popup block kar diya hai. Browser settings me popup allow karein ya Mobile OTP se login karein.',
    };
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return {
      message: 'Is Gmail se account pehle se bana hai. Kripya Mobile/Email Password ya original login method se sign in karein.',
    };
  }
  if (code === 'auth/operation-not-allowed') {
    if (isAdmin) {
      return {
        message: 'Selected Sign-in method Firebase Console me enabled nahi hai.',
        notice: 'Firebase Console → Authentication → Sign-in method me Google aur Email/Password provider enable karein.',
      };
    }
    if (isOtp) {
      console.warn('Phone Auth is disabled in Firebase Console. Enable Sign-in method -> Phone for project gen-lang-client-0586369088.');
      return {
        message:
          'Mobile OTP abhi activate ho raha hai. Tab tak aap upar "Continue with Gmail (Google)" button par click karke turant login kar sakte hain.',
      };
    }
    console.warn('Email/Password Auth is disabled in Firebase Console. Enable Sign-in method -> Email/Password for project gen-lang-client-0586369088.');
    return {
      message: isGoogle
        ? 'Abhi Gmail login uplabdh nahi hai. Kripya Mobile OTP se try karein.'
        : 'Password login abhi activate ho raha hai. Aap upar "Continue with Gmail (Google)" button se direct login kar sakte hain.',
    };
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return {
      message: 'Galat Mobile Number / Email ya Password. Kripya check karke dobara try karein.',
    };
  }
  if (code === 'auth/email-already-in-use') {
    return {
      message: 'Is Mobile Number ya Email se account pehle se bana hai. Kripya Sign In ya Gmail Login karein.',
    };
  }
  if (code === 'auth/weak-password') {
    return {
      message: 'Password kam se kam 6 characters ka hona chahiye.',
    };
  }
  if (code === 'auth/invalid-email') {
    return {
      message: 'Kripya sahi 10-digit Mobile Number ya Email address darj karein.',
    };
  }
  if (code === 'auth/invalid-phone-number') {
    return {
      message: 'Kripya sahi 10-digit Mobile Number darj karein.',
    };
  }
  if (code === 'auth/invalid-verification-code') {
    return {
      message: 'Galat OTP code. Kripya SMS me aaya sahi 6-digit OTP darj karein.',
    };
  }
  if (code === 'auth/code-expired') {
    return {
      message: 'OTP expire ho gaya hai. Kripya dobara Send OTP par click karein.',
    };
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    console.warn(
      `Auth unauthorized domain "${host}". Add it in Firebase Console → Authentication → Settings → Authorized domains (project gen-lang-client-0586369088).`
    );
    if (isAdmin) {
      return {
        message: 'Is website domain par Google/OTP auth authorized nahi hai.',
        notice: `Firebase Console → Authentication → Settings → Authorized domains me "${host || 'current domain'}" add karein.`,
      };
    }
    return {
      message: isGoogle
        ? `Yeh domain (${host || 'current site'}) abhi Gmail login ke liye authorized nahi hai. Coaching admin se is domain ko authorize karne ko kahein.`
        : `Yeh domain (${host || 'current site'}) abhi Mobile OTP ke liye authorized nahi hai. Coaching admin se is domain ko authorize karne ko kahein.`,
    };
  }
  if (
    code === 'auth/captcha-check-failed' ||
    code === 'auth/billing-not-enabled' ||
    code === 'auth/quota-exceeded'
  ) {
    console.warn('Phone OTP auth unavailable:', code);
    return {
      message:
        'Mobile OTP SMS abhi uplabdh nahi hai. Aap upar "Continue with Gmail" ya "Mobile / Email Password" tab se turant account bana sakte hain.',
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      message: 'Bahut zyada prayas ho gaye hain. Thodi der baad dobara try karein.',
    };
  }
  if (code === 'auth/user-disabled') {
    return {
      message: 'Aapka account abhi band hai. Kripya coaching office se sampark karein.',
    };
  }
  if (code === 'auth/operation-not-supported-in-this-environment') {
    return {
      message: 'Is embedded browser me Gmail popup support nahi hai. Link ko direct Chrome ya Safari browser me kholein.',
    };
  }
  if (code === 'auth/web-storage-unsupported') {
    return {
      message: 'Browser cookies ya storage blocked hain. Normal Chrome/Safari mode me cookies allow karke dobara try karein.',
    };
  }
  if (code === 'auth/internal-error') {
    console.error('Firebase Auth internal error:', err);
    return {
      message: 'Gmail login connect nahi ho paya. Page refresh karke ya Chrome browser me popup allow karke dobara try karein.',
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      message: 'Internet connection kamzor hai. Apna network check karke dobara try karein.',
    };
  }

  if (isGoogle && code) {
    console.error('Google Sign-In error:', code, err?.message);
  }

  return {
    message: isAdmin
      ? 'Admin login complete nahi ho paya. Kripya email aur password check karein.'
      : 'Login nahi ho paya. Kripya apni details check karke dobara try karein.',
  };
}

export function StudentLoginPage() {
  const {
    currentPath,
    authReady,
    firebaseUser,
    role,
    isAccountBlocked,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPhoneOtp,
    confirmPhoneOtp,
    sendPasswordReset,
    navigate,
    showToast,
  } = useApp();

  const [authTab, setAuthTab] = useState<'otp' | 'password'>('otp');
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Phone OTP state
  const [otpMobile, setOtpMobile] = useState('');
  const [otpName, setOtpName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpConfirmation, setOtpConfirmation] = useState<ConfirmationResult | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [resetSentMsg, setResetSentMsg] = useState('');

  const routeByRole = useCallback(
    (r: string) => {
      if (r === 'super_admin' || r === 'admin') {
        navigate('/admin');
        return;
      }
      if (r === 'teacher') {
        navigate('/teacher');
        return;
      }
      const qIdx = currentPath.indexOf('?');
      if (qIdx !== -1) {
        const redirectTarget = new URLSearchParams(currentPath.slice(qIdx + 1)).get('redirect');
        if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
          navigate(redirectTarget);
          return;
        }
      }
      navigate('/student');
    },
    [currentPath, navigate]
  );

  useEffect(() => {
    if (authReady && firebaseUser && role && !isAccountBlocked) {
      routeByRole(role);
    }
  }, [authReady, firebaseUser, role, isAccountBlocked, routeByRole]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  const resetRecaptcha = useCallback(() => {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // ignore cleanup error
    }
    recaptchaRef.current = null;
    const el = document.getElementById('zoc-otp-recaptcha');
    if (el) el.innerHTML = '';
  }, []);

  useEffect(() => {
    return () => {
      resetRecaptcha();
    };
  }, [resetRecaptcha]);

  function switchTab(nextTab: 'otp' | 'password') {
    setAuthTab(nextTab);
    setErrorNotice('');
    setResetSentMsg('');
  }

  function switchMode(next: 'login' | 'register' | 'reset') {
    setMode(next);
    setErrorNotice('');
    setResetSentMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorNotice('');
    setResetSentMsg('');

    if (mode === 'register') {
      const cleanName = name.trim();
      let cleanMobile = mobile.replace(/\D/g, '');
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) cleanMobile = cleanMobile.slice(2);
      const cleanEmail = email.trim().toLowerCase();

      if (cleanName.length < 2) {
        const msg = 'Kripya apna poora naam darj karein.';
        setErrorNotice(msg);
        showToast(msg, 'error');
        return;
      }
      if (cleanMobile.length !== 10) {
        const msg = 'Kripya sahi 10-digit Mobile Number darj karein.';
        setErrorNotice(msg);
        showToast(msg, 'error');
        return;
      }
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        const msg = 'Kripya sahi Email address darj karein (ya khali chhod dein).';
        setErrorNotice(msg);
        showToast(msg, 'error');
        return;
      }
      if (password.length < 6) {
        const msg = 'Password kam se kam 6 characters ka hona chahiye.';
        setErrorNotice(msg);
        showToast(msg, 'error');
        return;
      }
      if (password !== confirmPassword) {
        const msg = 'Password aur Confirm Password match nahi kar rahe hain.';
        setErrorNotice(msg);
        showToast(msg, 'error');
        return;
      }

      setLoading(true);
      try {
        const res = await registerWithEmail(cleanEmail, password, cleanName, cleanMobile);
        const idNote = res.studentId ? ` Aapka Student ID: ${res.studentId}` : '';
        showToast(`Account ban gaya hai!${idNote}`, 'success');
        routeByRole(res.role);
      } catch (err: any) {
        const parsed = getEmailAuthError(err, { isAdmin: false });
        setErrorNotice(parsed.notice || parsed.message);
        showToast(parsed.message, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'reset') {
      const cleanEmail = email.trim();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        const msg = 'Password reset karne ke liye apna registered Email address darj karein.';
        setErrorNotice(msg);
        showToast(msg, 'error');
        return;
      }
      setLoading(true);
      try {
        await sendPasswordReset(cleanEmail);
        const msg = `${cleanEmail} par password reset email bhej diya gaya hai. Inbox aur Spam folder check karein.`;
        setResetSentMsg(msg);
        showToast('Password reset link aapke email par bhej diya gaya hai.', 'success');
        setMode('login');
      } catch (err: any) {
        const parsed = getEmailAuthError(err, { isAdmin: false });
        setErrorNotice(parsed.notice || parsed.message);
        showToast(parsed.message, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login with Email or Mobile Number + Password
    const rawId = identifier.trim();
    if (!rawId) {
      const msg = 'Kripya apna Mobile Number ya Email darj karein.';
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }
    if (!rawId.includes('@')) {
      let digits = rawId.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
      if (digits.length !== 10) {
        const msg = 'Kripya sahi 10-digit Mobile Number ya Email address darj karein.';
        setErrorNotice(msg);
        showToast(msg, 'error');
        return;
      }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawId)) {
      const msg = 'Kripya sahi Email address darj karein.';
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    if (password.length < 6) {
      const msg = 'Password kam se kam 6 characters ka hona chahiye.';
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmail(rawId, password);
      showToast('Swagat hai! Login successful.', 'success');
      routeByRole(res.role);
    } catch (err: any) {
      const parsed = getEmailAuthError(err, { isAdmin: false });
      setErrorNotice(parsed.notice || parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function triggerSendOtp() {
    setErrorNotice('');
    setResetSentMsg('');

    let digits = otpMobile.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length !== 10 && !otpMobile.trim().startsWith('+')) {
      const msg = 'Kripya sahi 10-digit Mobile Number darj karein.';
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      resetRecaptcha();
      const verifier = new RecaptchaVerifier(auth, 'zoc-otp-recaptcha', {
        size: 'invisible',
        'expired-callback': () => {
          resetRecaptcha();
        },
      });
      recaptchaRef.current = verifier;
      const confirmation = await sendPhoneOtp(otpMobile.trim(), verifier);
      setOtpConfirmation(confirmation);
      setOtpCode('');
      setOtpCooldown(30);
      showToast('Aapke Mobile Number par 6-digit OTP bhej diya gaya hai.', 'success');
    } catch (err: any) {
      resetRecaptcha();
      const parsed = getEmailAuthError(err, { isAdmin: false, isOtp: true });
      setErrorNotice(parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    await triggerSendOtp();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpConfirmation) return;
    setErrorNotice('');

    if (otpCode.trim().length < 6) {
      const msg = 'Kripya 6-digit OTP code darj karein.';
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await confirmPhoneOtp(otpConfirmation, otpCode, otpName, otpMobile);
      const idNote = res.studentId ? ` Aapka Student ID: ${res.studentId}` : '';
      showToast(`Mobile verification successful!${idNote}`, 'success');
      routeByRole(res.role);
    } catch (err: any) {
      const parsed = getEmailAuthError(err, { isAdmin: false, isOtp: true });
      setErrorNotice(parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorNotice('');
    setResetSentMsg('');
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.email && !res.studentId) {
        return;
      }
      const idNote = res.studentId && res.role === 'student' ? ` Student ID: ${res.studentId}` : '';
      showToast(`Gmail login successful!${idNote}`, 'success');
      routeByRole(res.role);
    } catch (err: any) {
      const parsed = getEmailAuthError(err, { isAdmin: false, isGoogle: true });
      setErrorNotice(parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] bg-slate-50 dark:bg-slate-950 flex flex-col">
      <BackBar title="Account Sign In" backLabel="Back" fallbackPath="/" />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div className="mb-5">
            <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 mb-1">Student &amp; Teacher Portal</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {authTab === 'otp'
                ? 'Login with Gmail or Mobile OTP'
                : mode === 'login'
                ? 'Sign In to Your Portal'
                : mode === 'register'
                ? 'Create Student Account'
                : 'Reset Password'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {authTab === 'otp'
                ? 'Direct Gmail se 1-click me login karein ya Mobile OTP use karein.'
                : mode === 'register'
                ? 'Apna Naam, Mobile Number ya Gmail daalkar turant Student Account banayein.'
                : mode === 'reset'
                ? 'Apna registered Email darj karein. Hum aapko password reset link bhejenge.'
                : 'Apne Gmail, Mobile Number ya Email Password se Sign In karein.'}
            </p>
          </div>

          {/* Direct Gmail (Google) Sign-In */}
          <button
            type="button"
            disabled={loading || googleLoading}
            onClick={handleGoogleLogin}
            className="w-full min-h-[48px] py-2.5 px-4 text-sm font-bold text-slate-900 dark:text-white bg-blue-50/70 dark:bg-slate-800 hover:bg-blue-100/80 dark:hover:bg-slate-700 border-2 border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            <span>{googleLoading ? 'Connecting to Gmail...' : 'Continue with Gmail (Google)'}</span>
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Or with Mobile / Email</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Auth Method Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-5">
            <button
              type="button"
              onClick={() => switchTab('otp')}
              className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                authTab === 'otp'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Mobile OTP Login
            </button>
            <button
              type="button"
              onClick={() => switchTab('password')}
              className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                authTab === 'password'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Mobile / Email Password
            </button>
          </div>

          {resetSentMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resetSentMsg}</span>
            </div>
          )}

          {errorNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {errorNotice}
            </div>
          )}

          {authTab === 'otp' ? (
            <div className="space-y-4">
              {!otpConfirmation ? (
                <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="otp-mobile-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Enter Mobile Number
                    </label>
                    <div className="relative flex items-center">
                      <span className="pl-3 pr-2 py-2.5 text-sm font-semibold text-slate-500 border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-l-xl">
                        +91
                      </span>
                      <input
                        id="otp-mobile-input"
                        type="tel"
                        inputMode="tel"
                        required
                        value={otpMobile}
                        onChange={(e) => setOtpMobile(e.target.value)}
                        placeholder="Enter 10-digit mobile number"
                        autoComplete="tel"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-r-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="otp-name-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Student Name <span className="font-normal text-slate-400">(New account ya name update ke liye)</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="otp-name-input"
                        type="text"
                        value={otpName}
                        onChange={(e) => setOtpName(e.target.value)}
                        placeholder="Apna poora naam likhein"
                        maxLength={120}
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
                  <div className="px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-sky-200 flex items-center justify-between gap-2">
                    <span>OTP sent to +91 {otpMobile.replace(/^\+?91/, '')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpConfirmation(null);
                        setOtpCode('');
                        setErrorNotice('');
                        resetRecaptcha();
                      }}
                      className="font-semibold text-blue-700 dark:text-sky-400 hover:underline shrink-0"
                    >
                      Change
                    </button>
                  </div>
                  <div>
                    <label htmlFor="otp-code-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Enter OTP
                    </label>
                    <div className="relative">
                      <MessageSquareCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="otp-code-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit OTP"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm tracking-widest font-mono border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? 'Verifying OTP...' : 'Verify OTP & Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={loading || otpCooldown > 0}
                      onClick={triggerSendOtp}
                      className="font-semibold text-blue-700 dark:text-sky-400 hover:underline disabled:text-slate-400 disabled:no-underline min-h-[36px]"
                    >
                      {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpConfirmation(null);
                        setOtpCode('');
                        setErrorNotice('');
                        resetRecaptcha();
                      }}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 min-h-[36px]"
                    >
                      Change Number
                    </button>
                  </div>
                </form>
              )}
              <div id="zoc-otp-recaptcha" />
            </div>
          ) : (
            <>
              <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Apna poora naam likhein"
                          autoComplete="name"
                          className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="10-digit mobile number"
                          autoComplete="tel"
                          className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address <span className="font-normal text-slate-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email nahi hai to khali chhod dein"
                          autoComplete="email"
                          className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                        />
                      </div>
                    </div>
                  </>
                )}

                {mode === 'login' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number or Email Address
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="10-digit mobile number ya email"
                        autoComplete="username"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {mode === 'reset' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@gmail.com"
                        autoComplete="email"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {mode !== 'reset' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        className="w-full pl-9 pr-11 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Password dobara likhein"
                        autoComplete="new-password"
                        className="w-full pl-9 pr-11 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading
                    ? 'Please wait...'
                    : mode === 'login'
                    ? 'Sign In'
                    : mode === 'register'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                {mode === 'login' ? (
                  <>
                    <button type="button" onClick={() => switchMode('reset')} className="hover:text-blue-700 dark:hover:text-sky-400 min-h-[36px]">
                      Forgot Password?
                    </button>
                    <button type="button" onClick={() => switchMode('register')} className="font-semibold text-blue-700 dark:text-sky-400 hover:underline min-h-[36px]">
                      New Student Signup
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => switchMode('login')} className="font-semibold text-blue-700 dark:text-sky-400 hover:underline min-h-[36px]">
                    Back to Sign In
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminLoginPage() {
  const {
    firebaseUser,
    role,
    signInWithGoogle,
    signInWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    refreshSession,
    logout,
    navigate,
    showToast,
  } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

  if (firebaseUser && firebaseUser.emailVerified && (role === 'super_admin' || role === 'admin')) {
    return (
      <div className="min-h-[82vh] bg-slate-950 flex flex-col">
        <BackBar title="Admin Authentication" backLabel="Back" fallbackPath="/" />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center">
            <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Admin Verified</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Signed in as {firebaseUser.email}</p>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
            >
              Open Admin Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasRealAdminEmail = Boolean(
    firebaseUser?.email && !firebaseUser.email.endsWith('@mobile.thezoneofchemistry.in')
  );
  const mobileFromSyntheticEmail =
    firebaseUser?.email && firebaseUser.email.endsWith('@mobile.thezoneofchemistry.in')
      ? `+91 ${firebaseUser.email.replace('@mobile.thezoneofchemistry.in', '')}`
      : '';
  const signedInAccountLabel =
    firebaseUser?.phoneNumber ||
    mobileFromSyntheticEmail ||
    (hasRealAdminEmail ? firebaseUser?.email : '') ||
    'Student Account';

  if (firebaseUser && role && role !== 'super_admin' && role !== 'admin') {
    return (
      <div className="min-h-[82vh] bg-slate-950 flex flex-col">
        <BackBar title="Restricted Access" backLabel="Back" fallbackPath="/" />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center">
            <Lock className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Admins Only</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              You are signed in as {signedInAccountLabel}. Student and Teacher accounts cannot access the Admin Dashboard.
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate(role === 'teacher' ? '/teacher' : '/student')}
                className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
              >
                Go to {role === 'teacher' ? 'Teacher' : 'Student'} Portal
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-full min-h-[44px] py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (firebaseUser && hasRealAdminEmail && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-[82vh] bg-slate-950 flex flex-col">
        <BackBar title="Admin Email Verification" backLabel="Back" fallbackPath="/" />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center">
            <Mail className="w-10 h-10 text-blue-700 dark:text-sky-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Verify Admin Email</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
              Admin security ke liye {firebaseUser.email} ka email verify hona zaroori hai. Apna inbox check karein aur verification link par click karne ke baad refresh karein.
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await refreshSession();
                    showToast('Session refreshed.', 'info');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                I&apos;ve Verified — Refresh
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await resendVerificationEmail();
                    showToast('Verification email dobara bhej diya gaya hai.', 'success');
                  } catch (err: any) {
                    const parsed = getEmailAuthError(err, { isAdmin: true });
                    showToast(parsed.message, 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full min-h-[44px] py-2.5 text-xs font-semibold text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 rounded-xl"
              >
                Resend Verification Email
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-full min-h-[44px] py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleEmailAdmin(e: React.FormEvent) {
    e.preventDefault();
    setInfoMsg('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = 'Kripya sahi Admin Email darj karein.';
      setInfoMsg(msg);
      showToast(msg, 'error');
      return;
    }
    if (password.length < 6) {
      const msg = 'Password kam se kam 6 characters ka hona chahiye.';
      setInfoMsg(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmail(cleanEmail, password);
      if (res.role === 'super_admin' || res.role === 'admin') {
        showToast('Admin verified. Opening Institute Dashboard.', 'success');
        navigate('/admin');
      } else {
        showToast('Unauthorized: Only verified Admin accounts can access Admin Dashboard.', 'error');
        setInfoMsg('Access restricted: Student and Teacher accounts cannot open the Admin Dashboard.');
      }
    } catch (err: any) {
      const parsed = getEmailAuthError(err, { isAdmin: true });
      setInfoMsg(parsed.notice || parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      const msg = 'Password reset link bhejne ke liye pehle Admin Email darj karein.';
      setInfoMsg(msg);
      showToast(msg, 'error');
      return;
    }
    try {
      await sendPasswordReset(cleanEmail);
      setInfoMsg(`${cleanEmail} par password reset email bhej diya gaya hai.`);
      showToast('Password reset email bhej diya gaya hai.', 'success');
    } catch (err: any) {
      const parsed = getEmailAuthError(err, { isAdmin: true });
      showToast(parsed.message, 'error');
    }
  }

  async function handleGoogleAdmin() {
    setInfoMsg('');
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.role === 'super_admin' || res.role === 'admin') {
        showToast('Admin verified via Gmail. Opening Institute Dashboard.', 'success');
        navigate('/admin');
      } else {
        showToast('Unauthorized: Only verified Admin accounts can access Admin Dashboard.', 'error');
        setInfoMsg('Access restricted: Student and Teacher accounts cannot open the Admin Dashboard.');
      }
    } catch (err: any) {
      const parsed = getEmailAuthError(err, { isAdmin: true, isGoogle: true });
      setInfoMsg(parsed.notice || parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[82vh] bg-slate-950 flex flex-col">
      <BackBar title="Admin Authentication" backLabel="Back" fallbackPath="/" />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-sky-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-sky-400">Protected Institute Control</p>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin &amp; Super Admin Login</h2>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
            Authorized Admin Gmail or Email &amp; Password required. Student and Teacher accounts cannot open the Admin Dashboard.
          </p>

          {infoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {infoMsg}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleAdmin}
            className="w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            <span>Sign in with Admin Gmail</span>
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Or Email &amp; Password</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <form onSubmit={handleEmailAdmin} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Authorized admin email"
                  autoComplete="email"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-11 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-xl disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In to Admin Panel'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <button type="button" onClick={handleReset} className="hover:text-blue-700 dark:hover:text-sky-400 min-h-[36px]">
              Forgot Password?
            </button>
            <button type="button" onClick={() => navigate('/student-login')} className="font-semibold text-blue-700 dark:text-sky-400 hover:underline min-h-[36px]">
              Student / Teacher Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

