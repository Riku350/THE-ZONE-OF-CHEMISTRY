import React from 'react';
import { BookOpen, ClipboardCheck, Home, Layers, User } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function BottomNav() {
  const { currentPath, navigate, firebaseUser, role } = useApp();
  const path = currentPath.split('?')[0].replace(/\/+$/, '') || '/';

  const profileTarget = !firebaseUser
    ? '/student-login'
    : firebaseUser.emailVerified && (role === 'super_admin' || role === 'admin')
    ? '/admin'
    : role === 'teacher'
    ? '/teacher'
    : '/student';

  const tabs = [
    { label: 'Home', path: '/', icon: Home, active: path === '/' },
    { label: 'Study', path: '/study', icon: BookOpen, active: path === '/study' || path === '/online-classes' },
    { label: 'Batches', path: '/batches', icon: Layers, active: path === '/batches' || path.startsWith('/courses') },
    { label: 'Tests', path: '/tests', icon: ClipboardCheck, active: path === '/tests' },
    {
      label: 'Profile',
      path: profileTarget,
      icon: User,
      active:
        path.startsWith('/student') ||
        path.startsWith('/teacher') ||
        path.startsWith('/admin'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 no-print"
    >
      <div className="grid grid-cols-5 h-14 max-w-xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center min-h-[44px] transition-colors relative ${
                tab.active
                  ? 'text-blue-700 dark:text-sky-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.active && (
                <span className="absolute top-0 w-7 h-0.5 rounded-full bg-blue-700 dark:bg-sky-400" />
              )}
              <Icon className="w-5 h-5" strokeWidth={tab.active ? 2.4 : 1.9} />
              <span className="text-[11px] leading-none mt-1 tracking-tight whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
