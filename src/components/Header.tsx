import React from 'react';
import { Bell, Menu, Search, User, Wallet, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BrandMark } from './BrandMark.tsx';
import { ResilientImage } from './ResilientImage.tsx';

export function Header() {
  const {
    currentPath,
    navigate,
    settings,
    firebaseUser,
    userProfile,
    studentProfile,
    role,
    notices,
    notifications,
    unreadNotifCount,
    markAllNotificationsRead,
    pendingFeesAmount,
    searchQuery,
    setSearchQuery,
    setDrawerOpen,
    notifOpen,
    setNotifOpen,
  } = useApp();

  const path = currentPath.split('?')[0].replace(/\/+$/, '') || '/';

  const portalPath =
    firebaseUser?.emailVerified && (role === 'super_admin' || role === 'admin')
      ? '/admin'
      : role === 'teacher'
      ? '/teacher'
      : firebaseUser
      ? '/student'
      : '/student-login';

  const avatarUrl = studentProfile?.photoUrl || userProfile?.photoUrl || firebaseUser?.photoURL || '';

  const desktopLinks = [
    { label: 'Home', path: '/' },
    { label: 'Study', path: '/study' },
    { label: 'Batches', path: '/batches' },
    { label: 'Tests', path: '/tests' },
    { label: 'Results', path: '/results' },
    { label: 'Gallery', path: '/gallery' },
  ];

  const handleWalletClick = () => {
    if (!firebaseUser) navigate('/admissions');
    else navigate('/student?tab=fees');
  };

  const handleToggleNotifs = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) markAllNotificationsRead();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 no-print">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Hamburger Drawer + Brand Mark */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Side Menu"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-left whitespace-nowrap shrink-0 rounded-lg"
            >
              <BrandMark size={30} logoUrl={settings.logoUrl} />
              <span className="hidden md:inline font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                {settings.instituteName}
              </span>
            </button>
          </div>

          {/* Center-Left Desktop Links */}
          <nav className="hidden xl:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300 shrink-0">
            {desktopLinks.map((item) => {
              const active = path === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'text-blue-700 dark:text-sky-400 border-blue-700 dark:border-sky-400 font-semibold'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Center Search Bar */}
          <div className="flex-1 max-w-md min-w-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (path !== '/' && path !== '/courses' && path !== '/study') {
                    navigate('/courses');
                  }
                }}
                placeholder="Search batches, courses..."
                className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 rounded-xl border border-transparent focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons: Wallet/Fees, Notifications, Profile */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleWalletClick}
              title={firebaseUser ? 'My Fees & Receipts' : 'Course Fees & Admission'}
              className="min-h-[44px] px-2.5 sm:px-3 rounded-xl bg-sky-50 dark:bg-slate-800 text-blue-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-700 flex items-center gap-1.5 text-xs font-bold tabular-nums transition-colors whitespace-nowrap shrink-0"
            >
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">
                {firebaseUser ? `₹${pendingFeesAmount.toLocaleString('en-IN')}` : 'Fees'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleNotifs}
              aria-label="Open Notifications"
              className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {(unreadNotifCount > 0 || notices.length > 0) && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-700 dark:bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadNotifCount > 0 ? Math.min(9, unreadNotifCount) : notices.length > 0 ? '!' : ''}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(portalPath)}
              aria-label={firebaseUser ? 'Student Profile' : 'Student Login'}
              className="min-h-[44px] px-1.5 sm:px-2 flex items-center justify-center gap-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {avatarUrl ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-700/40 shrink-0">
                  <ResilientImage src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              {!firebaseUser && (
                <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-100 pr-1 whitespace-nowrap">
                  Login
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-down Live Notifications Modal/Sheet */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end no-print"
          onClick={() => setNotifOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Notices &amp; Alerts</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live updates from Prof. {settings.directorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30"
                >
                  <p className="text-[11px] font-semibold text-blue-700 dark:text-sky-400 uppercase tabular-nums">
                    {n.type} · {n.createdAt?.slice(0, 10)}
                  </p>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{n.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                </div>
              ))}
              {notices.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                >
                  <p className="text-[11px] font-semibold text-blue-700 dark:text-sky-400 tabular-nums">
                    {n.category} · {n.date}
                  </p>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{n.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.content}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  navigate('/notices');
                }}
                className="w-full h-11 rounded-xl bg-blue-700 text-white text-xs font-bold"
              >
                Open Full Notice Board
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
