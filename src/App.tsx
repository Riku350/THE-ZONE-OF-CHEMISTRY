import React from 'react';
import { Ban, LogOut, Phone, ShieldAlert } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { OpeningAnimation } from './components/OpeningAnimation.tsx';
import { Header } from './components/Header.tsx';
import { SideDrawer } from './components/SideDrawer.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { Footer } from './components/Footer.tsx';
import { BackBar } from './components/BackBar.tsx';
import { CourseCheckoutModal } from './components/CourseCheckoutModal.tsx';
import { PublicHome } from './components/PublicHome.tsx';
import {
  AboutPage,
  AdmissionStatusPage,
  AdmissionsPage,
  BatchesPage,
  ContactPage,
  CoursesPage,
  GalleryPage,
  LegalPage,
  NoticesPage,
  OnlineClassesPage,
  ResultsPage,
  StudyHubPage,
  TestSeriesPage,
} from './components/PublicPages.tsx';
import { AdminLoginPage, StudentLoginPage } from './components/AuthPages.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { TeacherPortal } from './components/TeacherPortal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';

function BlockedAccountScreen() {
  const { userProfile, settings, logout } = useApp();
  return (
    <div className="min-h-[75vh] bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-3xl p-6 text-center shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Account Restricted</h2>
        <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mt-1">
          {userProfile?.blockType === 'temporary' ? 'Temporary Suspension' : 'Account Blocked by Administration'}
        </p>
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 text-left space-y-1.5 text-xs">
          <p className="text-slate-700 dark:text-slate-200">
            <span className="font-bold">Reason:</span>{' '}
            {userProfile?.blockReason || 'Please contact the institute office for clarification.'}
          </p>
          {userProfile?.blockType === 'temporary' && userProfile?.blockedUntil && (
            <p className="text-slate-600 dark:text-slate-300">
              <span className="font-bold">Restricted Until:</span> {userProfile.blockedUntil}
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-col gap-2.5">
          <a
            href={`tel:${settings.phone}`}
            className="min-h-[44px] w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" /> Call Institute Desk ({settings.phone})
          </a>
          <button
            type="button"
            onClick={logout}
            className="min-h-[44px] w-full rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminRouteGuard() {
  const { authReady, firebaseUser, role, navigate } = useApp();

  if (!authReady) {
    return (
      <div className="min-h-[75vh] bg-slate-50 dark:bg-slate-950 flex flex-col">
        <BackBar title="Admin Access Check" backLabel="Home" fallbackPath="/" />
        <div className="max-w-md mx-auto px-4 py-20 text-center text-sm text-slate-600 dark:text-slate-400">
          Verifying administrator permissions...
        </div>
      </div>
    );
  }

  const isAuthorizedAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      (role === 'super_admin' || role === 'admin')
  );

  const needsEmailVerification = Boolean(
    firebaseUser &&
      firebaseUser.email &&
      !firebaseUser.email.endsWith('@mobile.thezoneofchemistry.in') &&
      !firebaseUser.emailVerified
  );

  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-[75vh] bg-slate-50 dark:bg-slate-950 flex flex-col">
        <BackBar title="Restricted Access" backLabel="Back" fallbackPath="/" />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Admin Panel — Admins Only
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            {needsEmailVerification
              ? `Signed in as ${firebaseUser?.email}. Email verification complete karne ke baad hi Admin Panel open hoga.`
              : firebaseUser
              ? `Signed in as ${
                  firebaseUser.phoneNumber ||
                  (firebaseUser.email && !firebaseUser.email.endsWith('@mobile.thezoneofchemistry.in')
                    ? firebaseUser.email
                    : 'Student Account')
                }. Student and Teacher accounts cannot open the Institute Admin Panel.`
              : 'Administrator Gmail or Email & Password sign-in is required to open the Institute Admin Panel.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
            >
              Back to Home
            </button>
            {needsEmailVerification ? (
              <button
                type="button"
                onClick={() => navigate('/admin-login')}
                className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                Verify Admin Email
              </button>
            ) : firebaseUser ? (
              <button
                type="button"
                onClick={() => navigate(role === 'teacher' ? '/teacher' : '/student')}
                className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                Go to {role === 'teacher' ? 'Teacher' : 'Student'} Portal
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/admin-login')}
                className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                Admin Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AppShell() {
  const {
    currentPath,
    settings,
    toasts,
    introVisible,
    completeIntro,
    isAccountBlocked,
    checkoutCourse,
    closeCheckout,
  } = useApp();

  const path = currentPath.split('?')[0].replace(/\/+$/, '') || '/';
  const isPortalRoute =
    (path.startsWith('/student') && path !== '/student-login') ||
    path.startsWith('/teacher') ||
    (path.startsWith('/admin') && path !== '/admin-login');

  const isRestrictedWhenBlocked =
    isAccountBlocked &&
    (path.startsWith('/student') || path.startsWith('/study') || path.startsWith('/tests') || path.startsWith('/online-classes')) &&
    path !== '/student-login';

  function renderRoute() {
    if (isRestrictedWhenBlocked) return <BlockedAccountScreen />;
    if (path === '/') return <PublicHome />;
    if (path === '/about') return <AboutPage />;
    if (path === '/courses') return <CoursesPage />;
    if (path.startsWith('/courses/')) return <CoursesPage courseId={path.slice('/courses/'.length)} />;
    if (path === '/batches') return <BatchesPage />;
    if (path === '/study') return <StudyHubPage />;
    if (path === '/online-classes') return <OnlineClassesPage />;
    if (path === '/tests') return <TestSeriesPage />;
    if (path === '/admissions') return <AdmissionsPage />;
    if (path === '/admission-status') return <AdmissionStatusPage />;
    if (path === '/results') return <ResultsPage />;
    if (path === '/gallery') return <GalleryPage />;
    if (path === '/notices') return <NoticesPage />;
    if (path === '/contact' || path === '/support') return <ContactPage />;
    if (path === '/privacy-policy') return <LegalPage type="privacy" />;
    if (path === '/terms') return <LegalPage type="terms" />;
    if (path === '/refund-policy') return <LegalPage type="refund" />;
    if (path === '/student-login') return <StudentLoginPage />;
    if (path === '/admin-login') return <AdminLoginPage />;
    if (path === '/student' || path.startsWith('/student/')) return <StudentPortal />;
    if (path === '/teacher' || path.startsWith('/teacher/')) return <TeacherPortal />;
    if (path === '/admin' || path.startsWith('/admin/')) return <AdminRouteGuard />;
    return <PublicHome />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {introVisible && <OpeningAnimation logoUrl={settings.logoUrl} onComplete={completeIntro} />}

      <Header />
      <SideDrawer />
      <main className="flex-1 pb-16 lg:pb-0">{renderRoute()}</main>
      {!isPortalRoute && <Footer />}
      <BottomNav />

      {/* Global Course Checkout Modal */}
      <CourseCheckoutModal course={checkoutCourse} onClose={closeCheckout} />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-18 lg:bottom-4 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none no-print">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl text-sm font-medium border shadow-lg ${
                t.type === 'error'
                  ? 'bg-red-950 text-red-100 border-red-800'
                  : t.type === 'success'
                  ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
                  : 'bg-slate-900 text-white border-slate-700'
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
