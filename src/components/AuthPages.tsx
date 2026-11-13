import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BackBar } from './BackBar.tsx';

function getFriendlyAuthError(
  err: any,
  options?: { isAdmin?: boolean }
): { message: string; notice?: string } {
  const code = err?.code || '';
  const isAdmin = Boolean(options?.isAdmin);

  if (code === 'auth/popup-blocked') {
    return {
      message: 'Browser ne Google popup block kar diya hai. Kripya popup allow karein ya Email se login karein.',
      notice: 'Popup blocked hai — browser settings me popup allow karein ya neeche Email aur Password se login karein.',
    };
  }
  if (code === 'auth/popup-closed-by-user') {
    return {
      message: 'Google login window poora hone se pehle band ho gayi. Dobara try karein.',
    };
  }
  if (code === 'auth/cancelled-popup-request') {
    return {
      message: 'Google login window pehle se khuli hai. Kripya usi window ko complete karein.',
    };
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    console.warn(`Google Sign-In domain authorization pending for "${host}".`);
    if (isAdmin) {
      return {
        message: `Is domain (${host}) par Google Sign-In abhi authorized nahi hai.`,
        notice: `Firebase Console → Authentication → Settings → Authorized domains me "${host}" add karein, ya neeche verified Admin Email aur Password se sign in karein.`,
      };
    }
    return {
      message: 'Google Login abhi is website par temporary unavailable hai. Kripya Email aur Password se Sign In karein.',
      notice: 'Google Login abhi uplabdh nahi hai. Kripya neeche apna Email aur Password daalkar Sign In ya Naya Account banayein.',
    };
  }
  if (code === 'auth/operation-not-allowed') {
    if (isAdmin) {
      return {
        message: 'Sign-in provider Firebase Console me enabled nahi hai.',
        notice: 'Firebase Console → Authentication → Sign-in method me Google aur Email/Password enable karein.',
      };
    }
    return {
      message: 'Yeh login tarika abhi chalu nahi hai. Kripya Email aur Password use karein.',
      notice: 'Kripya neeche Email aur Password se Sign In karein.',
    };
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return {
      message: 'Galat email ya password. Kripya check karke dobara try karein ya password reset karein.',
    };
  }
  if (code === 'auth/email-already-in-use') {
    return {
      message: 'Is email se account pehle se bana hai. Kripya Sign In karein.',
    };
  }
  if (code === 'auth/weak-password') {
    return {
      message: 'Password kam se kam 6 characters ka hona chahiye.',
    };
  }
  if (code === 'auth/invalid-email') {
    return {
      message: 'Kripya sahi email address darj karein.',
    };
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return {
      message: 'Yeh email kisi aur login tarike se registered hai. Kripya usi tarike se Sign In karein.',
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      message: 'Bahut zyada galat prayas ho gaye hain. Thodi der baad dobara try karein.',
    };
  }
  if (code === 'auth/user-disabled') {
    return {
      message: 'Aapka account abhi band hai. Kripya coaching office se sampark karein.',
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      message: 'Internet connection kamzor hai. Apna network check karke dobara try karein.',
    };
  }

  return {
    message: isAdmin
      ? 'Admin login complete nahi ho paya. Kripya details check karke dobara try karein.'
      : 'Login nahi ho paya. Kripya apna email/password check karke dobara try karein.',
  };
}

export function StudentLoginPage() {
  const {
    authReady,
    firebaseUser,
    role,
    isAccountBlocked,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    navigate,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [resetSentMsg, setResetSentMsg] = useState('');

  const routeByRole = useCallback(
    (r: string) => {
      if (r === 'super_admin' || r === 'admin') navigate('/admin');
      else if (r === 'teacher') navigate('/teacher');
      else navigate('/student');
    },
    [navigate]
  );

  // Redirect automatically if student/teacher/admin is already signed in
  useEffect(() => {
    if (authReady && firebaseUser && role && !isAccountBlocked) {
      routeByRole(role);
    }
  }, [authReady, firebaseUser, role, isAccountBlocked, routeByRole]);

  function switchMode(next: 'login' | 'register' | 'reset') {
    setMode(next);
    setErrorNotice('');
    setResetSentMsg('');
  }

  async function handleGoogle() {
    setLoading(true);
    setErrorNotice('');
    setResetSentMsg('');
    try {
      const res = await signInWithGoogle();
      showToast('Login successful! Aapka dashboard khul raha hai.', 'success');
      routeByRole(res.role);
    } catch (err: any) {
      const parsed = getFriendlyAuthError(err, { isAdmin: false });
      setErrorNotice(parsed.notice || parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorNotice('');
    setResetSentMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = 'Kripya sahi email address darj karein.';
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    if (mode === 'register' && name.trim().length < 2) {
      const msg = 'Kripya apna poora naam darj karein.';
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    if (mode !== 'reset' && password.length < 6) {
      const msg = 'Password kam se kam 6 characters ka hona chahiye.';
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'reset') {
        await sendPasswordReset(cleanEmail);
        const msg = `${cleanEmail} par password reset link bhej diya gaya hai. Email na mile to Spam folder bhi check karein.`;
        setResetSentMsg(msg);
        showToast('Password reset link aapke email par bhej diya gaya hai.', 'success');
        setMode('login');
      } else if (mode === 'register') {
        const res = await registerWithEmail(cleanEmail, password, name);
        showToast('Account ban gaya hai! Aapka dashboard khul raha hai.', 'success');
        routeByRole(res.role);
      } else {
        const res = await signInWithEmail(cleanEmail, password);
        showToast('Swagat hai! Login successful.', 'success');
        routeByRole(res.role);
      }
    } catch (err: any) {
      const parsed = getFriendlyAuthError(err, { isAdmin: false });
      setErrorNotice(parsed.notice || parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] bg-slate-50 dark:bg-slate-950 flex flex-col">
      <BackBar title="Account Sign In" backLabel="Back" fallbackPath="/" />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 mb-1">Student &amp; Teacher Portal</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {mode === 'login' ? 'Sign In to Your Portal' : mode === 'register' ? 'Create Student Account' : 'Reset Password'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Access live classes, recorded lectures, study PDFs, attendance, tests, and fee receipts.
            </p>
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

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full min-h-[44px] py-2.5 px-4 mb-5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2.5 disabled:opacity-60"
          >
            <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center">G</span>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="flex-shrink mx-3 text-xs text-slate-400">or use email &amp; password</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Apna poora naam likhein"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@gmail.com"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
              />
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    className="w-full pl-3.5 pr-11 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
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
                  Forgot password?
                </button>
                <button type="button" onClick={() => switchMode('register')} className="font-semibold text-blue-700 dark:text-sky-400 hover:underline min-h-[36px]">
                  New student signup
                </button>
              </>
            ) : (
              <button type="button" onClick={() => switchMode('login')} className="font-semibold text-blue-700 dark:text-sky-400 hover:underline min-h-[36px]">
                Back to Sign In
              </button>
            )}
          </div>
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

  // Handle unverified Email/Password account trying to verify as Admin
  if (firebaseUser && !firebaseUser.emailVerified) {
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
                    const parsed = getFriendlyAuthError(err, { isAdmin: true });
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

  if (firebaseUser && role && role !== 'super_admin' && role !== 'admin') {
    return (
      <div className="min-h-[82vh] bg-slate-950 flex flex-col">
        <BackBar title="Restricted Access" backLabel="Back" fallbackPath="/" />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center">
            <Lock className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Admins Only</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              You are signed in as {firebaseUser.email}. Regular user accounts cannot access the Admin Panel.
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate(role === 'teacher' ? '/teacher' : '/student')}
                className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
              >
                Go to My Portal
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

  async function handleGoogleAdmin() {
    setLoading(true);
    setInfoMsg('');
    try {
      const res = await signInWithGoogle();
      if (res.role === 'super_admin' || res.role === 'admin') {
        showToast('Admin verified. Opening Institute Dashboard.', 'success');
        navigate('/admin');
      } else {
        showToast('Access Denied: Only authorized Institute Admins can open the Admin Panel.', 'error');
        setInfoMsg(`Signed in as ${res.email}. Regular user accounts cannot access the Admin Panel.`);
      }
    } catch (err: any) {
      const parsed = getFriendlyAuthError(err, { isAdmin: true });
      if (parsed.notice) setInfoMsg(parsed.notice);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailAdmin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInfoMsg('');
    try {
      const res = await signInWithEmail(email, password);
      if (res.role === 'super_admin' || res.role === 'admin') {
        showToast('Admin verified.', 'success');
        navigate('/admin');
      } else {
        showToast('Unauthorized: Only verified Admin accounts can access this panel.', 'error');
        setInfoMsg('Access restricted to authorized institute administrators only.');
      }
    } catch (err: any) {
      const parsed = getFriendlyAuthError(err, { isAdmin: true });
      setInfoMsg(parsed.notice || parsed.message);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      const msg = 'Password reset link bhejne ke liye pehle Admin Email darj karein.';
      setInfoMsg(msg);
      showToast(msg, 'error');
      return;
    }
    try {
      await sendPasswordReset(email);
      setInfoMsg(`${email.trim()} par password reset email bhej diya gaya hai.`);
      showToast('Password reset email bhej diya gaya hai.', 'success');
    } catch (err: any) {
      const parsed = getFriendlyAuthError(err, { isAdmin: true });
      showToast(parsed.message, 'error');
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Super Admin &amp; Admin Login</h2>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
            Verified Authentication required. Admin and Super Admin access is strictly enforced for authorized institute accounts.
          </p>

          {infoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {infoMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleAdmin}
            disabled={loading}
            className="w-full min-h-[44px] py-2.5 px-4 mb-5 bg-slate-900 dark:bg-blue-700 hover:bg-slate-800 dark:hover:bg-blue-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Lock className="w-4 h-4 text-sky-400" />
            {loading ? 'Verifying with Google...' : 'Verify & Sign in with Google'}
          </button>

          <form onSubmit={handleEmailAdmin} className="space-y-3.5">
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
              {loading ? 'Signing in...' : 'Sign In with Password'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <button type="button" onClick={handleReset} className="hover:text-blue-700 dark:hover:text-sky-400 min-h-[36px]">
              Reset Password
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

