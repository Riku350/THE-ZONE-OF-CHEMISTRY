import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { enrollStudentInCourse } from '../lib/firestoreService.ts';
import type { Course } from '../types.ts';

interface CourseCheckoutModalProps {
  course: Course | null;
  feeRecordId?: string;
  overrideAmount?: number;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

declare global {
  interface Window {
    Cashfree?: (opts: { mode: 'sandbox' | 'production' }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<{
        error?: { message?: string };
        paymentDetails?: unknown;
      }>;
    };
  }
}

async function loadCashfreeSdk(): Promise<void> {
  if (window.Cashfree) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-cashfree-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Cashfree SDK')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.setAttribute('data-cashfree-sdk', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree Checkout SDK'));
    document.head.appendChild(script);
  });
}

export function CourseCheckoutModal({
  course,
  feeRecordId,
  overrideAmount,
  onClose,
  onSuccess,
}: CourseCheckoutModalProps) {
  const { firebaseUser, studentProfile, idToken, navigate, showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [gatewayConfigured, setGatewayConfigured] = useState<boolean | null>(null);
  const [gatewayMode, setGatewayMode] = useState<'sandbox' | 'production'>('sandbox');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!course) return;
    setStatusMessage('');
    fetch('/api/payments/cashfree/config')
      .then((r) => r.json())
      .then((data) => {
        setGatewayConfigured(Boolean(data?.configured));
        if (data?.mode === 'production') setGatewayMode('production');
      })
      .catch(() => setGatewayConfigured(false));
  }, [course]);

  if (!course) return null;

  const payableAmount = Number(overrideAmount ?? course.fees ?? 0);

  async function handlePayWithCashfree() {
    if (!course) return;
    if (!firebaseUser) {
      onClose();
      navigate(`/student-login?redirect=${encodeURIComponent(`/courses/${course.id}`)}`);
      return;
    }

    setLoading(true);
    setStatusMessage('');

    try {
      // Free course direct instant enrollment
      if (payableAmount <= 0) {
        await enrollStudentInCourse(firebaseUser, course, '', 'Active');
        showToast(`Enrolled in ${course.title}!`, 'success');
        onSuccess?.(`FREE_${course.id}`);
        onClose();
        navigate('/student?tab=courses');
        return;
      }

      const token = idToken || (await firebaseUser.getIdToken());
      const res = await fetch('/api/payments/cashfree/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          feeRecordId: feeRecordId || '',
          amount: overrideAmount,
          customerPhone: studentProfile?.mobile || '9999999999',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.gatewayConfigured === false) {
          setGatewayConfigured(false);
          setStatusMessage(
            data?.error || 'Online Cashfree gateway keys are not configured on the server yet.'
          );
          return;
        }
        throw new Error(data?.error || 'Could not initiate Cashfree order');
      }

      if (data.freeEnrollment) {
        showToast(`Enrolled in ${course.title}!`, 'success');
        onSuccess?.(data.orderId);
        onClose();
        navigate('/student?tab=courses');
        return;
      }

      await loadCashfreeSdk();
      if (!window.Cashfree) {
        throw new Error('Cashfree SDK unavailable');
      }

      const cf = window.Cashfree({ mode: data.mode === 'production' ? 'production' : gatewayMode });
      const checkoutRes = await cf.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_self',
      });

      if (checkoutRes?.error?.message) {
        setStatusMessage(checkoutRes.error.message);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCampusAdmission() {
    if (!course) return;
    if (!firebaseUser) {
      onClose();
      navigate('/admissions');
      return;
    }
    setLoading(true);
    try {
      await enrollStudentInCourse(firebaseUser, course, '', 'Pending');
      showToast('Course seat reserved! Complete fee verification at the Coaching Office or Online once active.', 'info');
      onClose();
      navigate('/student?tab=courses');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reserve course', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Secure Course Checkout
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] font-semibold text-blue-700 dark:text-sky-400 uppercase tracking-wider">
              {course.examTrack || course.category}
            </p>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{course.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Teacher: {course.teacherName} · {course.duration}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Total Payable</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {payableAmount <= 0 ? 'FREE' : `₹${payableAmount.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          {!firebaseUser && (
            <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              Sign in with your student account first so your course unlocks automatically after payment.
            </p>
          )}

          {gatewayConfigured === false && payableAmount > 0 && (
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-slate-700 dark:text-slate-200 space-y-1">
              <p className="font-bold text-blue-800 dark:text-sky-300">
                Online Cashfree Gateway Keys Pending
              </p>
              <p>
                Cashfree keys (`CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`) are not configured yet on the server. You can reserve this batch seat right now and verify your fee at the Motihari Campus Desk.
              </p>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {statusMessage}
            </div>
          )}

          <div className="space-y-2.5">
            {payableAmount <= 0 || gatewayConfigured !== false ? (
              <button
                type="button"
                disabled={loading}
                onClick={handlePayWithCashfree}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {payableAmount <= 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {loading ? 'Activating...' : 'Enroll Free Now'}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    {loading ? 'Connecting Cashfree...' : `Pay ₹${payableAmount.toLocaleString('en-IN')} via Cashfree`}
                  </>
                )}
              </button>
            ) : null}

            {payableAmount > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleRequestCampusAdmission}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Reserve Seat &amp; Pay at Motihari Office / UPI Desk
              </button>
            )}
          </div>

          <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> 256-bit Encrypted Server-Verified Enrollment
          </p>
        </div>
      </div>
    </div>
  );
}
