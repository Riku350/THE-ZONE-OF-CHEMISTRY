import React from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileCheck,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Layers,
  LogIn,
  LogOut,
  Megaphone,
  MessageSquare,
  Moon,
  PlayCircle,
  Shield,
  Sun,
  User,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ResilientImage } from './ResilientImage.tsx';

export function SideDrawer() {
  const {
    drawerOpen,
    setDrawerOpen,
    firebaseUser,
    userProfile,
    studentProfile,
    role,
    darkMode,
    toggleDarkMode,
    triggerIntroReplay,
    navigate,
    logout,
  } = useApp();

  if (!drawerOpen) return null;

  const displayName = studentProfile?.name || userProfile?.name || firebaseUser?.displayName || 'Guest Learner';
  const displaySub =
    studentProfile?.admissionId ||
    firebaseUser?.email ||
    'THE ZONE OF CHEMISTRY · Motihari';
  const photoUrl = studentProfile?.photoUrl || userProfile?.photoUrl || firebaseUser?.photoURL || '';

  const openPortalTab = (tab: string) => {
    setDrawerOpen(false);
    if (!firebaseUser) {
      navigate('/student-login');
    } else {
      navigate(`/student?tab=${tab}`);
    }
  };

  const openRoute = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const menuItems = [
    { label: 'Student Profile', icon: User, action: () => openPortalTab('profile') },
    { label: 'My Courses', icon: Layers, action: () => openPortalTab('courses') },
    { label: 'Online Classes', icon: Video, action: () => openRoute('/online-classes') },
    { label: 'Study Materials', icon: BookOpen, action: () => openRoute('/study') },
    { label: 'My Tests', icon: FileCheck, action: () => openRoute('/tests') },
    { label: 'Results', icon: Award, action: () => openRoute('/results') },
    { label: 'Doubts (Q&A)', icon: MessageSquare, action: () => openPortalTab('doubts') },
    { label: 'Attendance', icon: CheckCircle2, action: () => openPortalTab('attendance') },
    { label: 'My Fees & Orders', icon: CreditCard, action: () => openPortalTab('fees') },
    { label: 'My Downloads', icon: Download, action: () => openPortalTab('downloads') },
    { label: 'Certificates', icon: Award, action: () => openPortalTab('certificates') },
    { label: 'Notices', icon: Megaphone, action: () => openRoute('/notices') },
    { label: 'Gallery', icon: ImageIcon, action: () => openRoute('/gallery') },
    { label: 'About Us', icon: Info, action: () => openRoute('/about') },
    { label: 'Help & Support', icon: HelpCircle, action: () => openRoute('/support') },
    { label: 'Refund Policy', icon: FileCheck, action: () => openRoute('/refund-policy') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex no-print" role="dialog" aria-modal="true" aria-label="Side Navigation Menu">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer Panel */}
      <aside className="relative z-10 w-[84%] max-w-[320px] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
        {/* Profile Header */}
        <div className="p-5 bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 text-white">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/60 bg-white/15 shrink-0">
              <ResilientImage
                src={photoUrl}
                alt={displayName}
                fallbackTitle={displayName.slice(0, 2).toUpperCase()}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close Menu"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="font-bold text-base truncate">{displayName}</p>
          <p className="text-xs text-sky-100 truncate mt-0.5">{displaySub}</p>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {firebaseUser?.emailVerified && (role === 'admin' || role === 'super_admin') && (
            <button
              type="button"
              onClick={() => openRoute('/admin')}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-sky-300 mb-2"
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Admin Dashboard</span>
            </button>
          )}
          {role === 'teacher' && (
            <button
              type="button"
              onClick={() => openRoute('/teacher')}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-sky-300 mb-2"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Teacher Portal</span>
            </button>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Icon className="w-4 h-4 text-blue-700 dark:text-sky-400 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={triggerIntroReplay}
            className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <PlayCircle className="w-4 h-4 text-blue-700 dark:text-sky-400 shrink-0" />
            <span className="truncate">Replay Intro Animation</span>
          </button>
        </div>

        {/* Bottom Controls: Dark Mode & Auth */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <span className="inline-flex items-center gap-2.5">
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
            </span>
            <span className="text-xs font-semibold text-blue-700 dark:text-sky-400">{darkMode ? 'ON' : 'OFF'}</span>
          </button>

          {firebaseUser ? (
            <button
              type="button"
              onClick={logout}
              className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openRoute('/student-login')}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Student / Admin Login</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
