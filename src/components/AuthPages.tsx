import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, Mail, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BackBar } from './BackBar.tsx';

function formatAuthError(err: any): { message: string; notice?: string } {
  const code = err?.code || '';
  if (code === 'auth/popup-blocked') {
    return {
      message: 'Google popup was blocked by your browser.',
      notice: 'Popup blocked by browser. Allow popups for this site and click Continue with Google again.',
    };
  }
  if (code === 'auth/popup-closed-by-user') {
    return { message: 'Google sign-in popup was closed before completing login.' };
  }
  if (code === 'auth/cancelled-popup-request') {
    return { message: 'Sign-in popup already open. Please complete or close the existing popup.' };
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return {
      message: `Domain "${host}" is not authorized in Firebase Auth.`,
      notice: `Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains to enable Google Sign-In on this URL.`,
    };
  }
  if (code === 'auth/operation-not-allowed') {
    return {
      message: 'Sign-in provider is not enabled in Firebase Console.',
      notice: 'Enable Google and Email/Password sign-in providers in Firebase Console → Authentication → Sign-in method.',
    };
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return { message: 'Invalid email or password. Try again or use Continue with Google.' };
  }
  if (code === 'auth/email-already-in-use') {
    return { message: 'An account with this email already exists. Please sign in instead.' };
  }
  if (code === 'auth/network-request-failed') {
    return { message: 'Network error during sign-in. Check your internet connection and retry.' };
  }
  return { message: err?.message || 'Authentication failed' };
}

export function StudentLoginPage() {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, sendPasswordReset, navigate, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerNotice, setProviderNotice] = useState('');

  function routeByRole(r: string) {
    if (r === 'super_admin' || r === 'admin') navigate('/admin');
    else if (r === 'teacher') navigate('/teacher');
    else navigate('/student');
  }

  async function handleGoogle() {
    setLoading(true);
    setProviderNotice('');
    try {
      const res = await signInWithGoogle();
      showToast('Signed in successfully.', 'success');
      routeByRole(res.role);
    } catch (err: any) {
      const parsed = formatAuthError(err);
      if (parsed.notice) setProviderNotice(parsed.notice);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setProviderNotice('');
    try {
      if (mode === 'reset') {
        await sendPasswordReset(email);
        showToast('Password reset link sent to your email.', 'success');
        setMode('login');
      } else if (mode === 'register') {
        const res = await registerWithEmail(email, password, name);
        showToast('Account created and synced.', 'success');
        routeByRole(res.role);
      } else {
        const res = await signInWithEmail(email, password);
        showToast('Welcome back!', 'success');
        routeByRole(res.role);
      }
    } catch (err: any) {
      const parsed = formatAuthError(err);
      if (parsed.notice) setProviderNotice(parsed.notice);
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

          {providerNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {providerNotice}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full min-h-[44px] py-2.5 px-4 mb-5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2.5"
          >
            <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center">G</span>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="flex-shrink mx-3 text-xs text-slate-400">or use email &amp; password</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
              />
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center justify-center gap-2"
            >
              {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            {mode === 'login' ? (
              <>
                <button type="button" onClick={() => setMode('reset')} className="hover:text-blue-700 dark:hover:text-sky-400 min-h-[36px]">
                  Forgot password?
                </button>
                <button type="button" onClick={() => setMode('register')} className="font-semibold text-blue-700 dark:text-sky-400 hover:underline min-h-[36px]">
                  New student signup
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setMode('login')} className="font-semibold text-blue-700 dark:text-sky-400 hover:underline min-h-[36px]">
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
  const { firebaseUser, role, signInWithGoogle, signInWithEmail, sendPasswordReset, logout, navigate, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const parsed = formatAuthError(err);
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
      const parsed = formatAuthError(err);
      if (parsed.notice) setInfoMsg(parsed.notice);
      showToast(parsed.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      showToast('Enter admin email first to send password reset link.', 'error');
      return;
    }
    try {
      await sendPasswordReset(email);
      showToast('Password reset email dispatched.', 'success');
    } catch (err: any) {
      const parsed = formatAuthError(err);
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
            Verified Firebase Authentication required. Admin and Super Admin access is strictly enforced in database security rules.
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
            className="w-full min-h-[44px] py-2.5 px-4 mb-5 bg-slate-900 dark:bg-blue-700 hover:bg-slate-800 dark:hover:bg-blue-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
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
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full min-h-[44px] py-2.5 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-xl">
              Sign In with Password
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
