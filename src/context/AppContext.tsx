import React, { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  User,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, googleAuthProvider, testFirestoreConnection } from '../lib/firebase.ts';
import {
  INITIAL_BANNERS,
  INITIAL_BATCHES,
  INITIAL_COURSES,
  INITIAL_FACULTY,
  INITIAL_GALLERY,
  INITIAL_NOTICES,
  INITIAL_POSTERS,
  INITIAL_RESULTS,
  INITIAL_SETTINGS,
  INITIAL_TIMETABLE,
} from '../lib/seedData.ts';
import {
  MOBILE_AUTH_DOMAIN,
  getCleanEmailFromAuthUser,
  markStudentLoggedOut,
  pingStudentHeartbeat,
  recordStudentLoginActivity,
  syncUserSession,
} from '../lib/firestoreService.ts';
import type {
  BannerItem,
  Batch,
  Course,
  EnrollmentRecord,
  ExamTrack,
  FeeRecord,
  GalleryItem,
  InstituteResult,
  InstituteSettings,
  Notice,
  NotificationItem,
  PosterItem,
  PublicFacultyCard,
  StudentRecord,
  TimetableSlot,
  UserProfile,
  UserRole,
} from '../types.ts';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextValue {
  currentPath: string;
  navigate: (path: string) => void;
  goBack: (fallbackPath?: string) => void;
  canGoBack: boolean;
  firebaseUser: User | null;
  idToken: string | null;
  authReady: boolean;
  userProfile: UserProfile | null;
  role: UserRole | null;
  studentProfile: StudentRecord | null;
  isAccountBlocked: boolean;
  settings: InstituteSettings;
  courses: Course[];
  batches: Batch[];
  posters: PosterItem[];
  banners: BannerItem[];
  faculty: PublicFacultyCard[];
  notices: Notice[];
  notifications: NotificationItem[];
  unreadNotifCount: number;
  markAllNotificationsRead: () => void;
  results: InstituteResult[];
  gallery: GalleryItem[];
  timetable: TimetableSlot[];
  enrollments: EnrollmentRecord[];
  pendingFeesAmount: number;
  selectedExam: ExamTrack;
  setSelectedExam: (exam: ExamTrack) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
  examModalOpen: boolean;
  setExamModalOpen: (open: boolean) => void;
  introVisible: boolean;
  completeIntro: () => void;
  triggerIntroReplay: () => void;
  checkoutCourse: Course | null;
  openCheckout: (course: Course) => void;
  closeCheckout: () => void;
  catalogLoading: boolean;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  signInWithGoogle: () => Promise<{ role: UserRole; email: string; studentId?: string }>;
  signInWithEmail: (identifier: string, password: string) => Promise<{ role: UserRole; email: string; studentId?: string }>;
  registerWithEmail: (
    email: string,
    password: string,
    name: string,
    mobile: string
  ) => Promise<{ role: UserRole; email: string; studentId?: string }>;
  sendPhoneOtp: (mobile: string, verifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  confirmPhoneOtp: (
    confirmation: ConfirmationResult,
    otp: string,
    name?: string,
    mobile?: string
  ) => Promise<{ role: UserRole; email: string; studentId?: string }>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState<string>(
    () => (window.location.pathname + window.location.search) || '/'
  );
  const [historyStack, setHistoryStack] = useState<string[]>(() => [
    (window.location.pathname + window.location.search) || '/',
  ]);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentRecord | null>(null);
  const [pendingFeesAmount, setPendingFeesAmount] = useState<number>(0);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);

  const [settings, setSettings] = useState<InstituteSettings>(INITIAL_SETTINGS);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [posters, setPosters] = useState<PosterItem[]>(INITIAL_POSTERS);
  const [rawBanners, setRawBanners] = useState<BannerItem[]>(INITIAL_BANNERS);
  const [faculty, setFaculty] = useState<PublicFacultyCard[]>(INITIAL_FACULTY);
  const [notices, setNotices] = useState<Notice[]>(INITIAL_NOTICES);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [results, setResults] = useState<InstituteResult[]>(INITIAL_RESULTS);
  const [gallery, setGallery] = useState<GalleryItem[]>(INITIAL_GALLERY);
  const [timetable, setTimetable] = useState<TimetableSlot[]>(INITIAL_TIMETABLE);
  const [catalogLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [notifLastReadAt, setNotifLastReadAt] = useState<string>(
    () => localStorage.getItem('zoc_notif_last_read') || ''
  );
  const [introVisible, setIntroVisible] = useState<boolean>(true);
  const [checkoutCourse, setCheckoutCourse] = useState<Course | null>(null);

  const [selectedExam, setSelectedExamState] = useState<ExamTrack>(() => {
    const saved = localStorage.getItem('zoc_selected_exam') as ExamTrack | null;
    const valid: ExamTrack[] = [
      'Class 11 Chemistry',
      'Class 12 Chemistry',
      '12th IIT-JEE',
      '12th NEET',
      'Dropper Chemistry',
    ];
    return saved && valid.includes(saved) ? saved : 'Class 12 Chemistry';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('zoc_dark_mode') === 'true');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);

  const sessionDocIdRef = useRef<string | null>(null);
  const sessionLoggedUidRef = useRef<string | null>(null);
  const firestoreSeededRef = useRef<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('zoc_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const setSelectedExam = useCallback((exam: ExamTrack) => {
    setSelectedExamState(exam);
    localStorage.setItem('zoc_selected_exam', exam);
  }, []);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const completeIntro = useCallback(() => {
    setIntroVisible(false);
  }, []);

  const triggerIntroReplay = useCallback(() => {
    setDrawerOpen(false);
    setIntroVisible(true);
  }, []);

  const openCheckout = useCallback((course: Course) => {
    setCheckoutCourse(course);
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckoutCourse(null);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem('zoc_notif_last_read', now);
    setNotifLastReadAt(now);
  }, []);

  const navigate = useCallback((path: string) => {
    setDrawerOpen(false);
    setNotifOpen(false);
    if (path.startsWith('#')) {
      const targetId = path.slice(1);
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
        setHistoryStack((prev) => [...prev.slice(-24), '/']);
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      } else {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setHistoryStack((prev) => {
      if (prev[prev.length - 1] === path) return prev;
      return [...prev.slice(-24), path];
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(
    (fallbackPath = '/') => {
      setDrawerOpen(false);
      setNotifOpen(false);
      if (historyStack.length > 1) {
        const nextStack = historyStack.slice(0, -1);
        const target = nextStack[nextStack.length - 1] || fallbackPath;
        setHistoryStack(nextStack);
        setCurrentPath(target);
        window.history.back();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.history.pushState({}, '', fallbackPath);
        setCurrentPath(fallbackPath);
        setHistoryStack([fallbackPath]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [historyStack]
  );

  useEffect(() => {
    const onPopState = () => {
      const fullPath = (window.location.pathname + window.location.search) || '/';
      setCurrentPath(fullPath);
      setHistoryStack((prev) => {
        if (prev.length > 1 && prev[prev.length - 2] === fullPath) {
          return prev.slice(0, -1);
        }
        return prev[prev.length - 1] === fullPath ? prev : [...prev.slice(-24), fullPath];
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const inFlightSyncRef = useRef<{ uid: string; promise: Promise<{ role: UserRole; email: string; studentId?: string }> } | null>(null);
  const pendingSignupRef = useRef<{ name?: string; mobile?: string } | null>(null);

  const syncUser = useCallback(
    async (
      user: User,
      overrideSignupInfo?: { name?: string; mobile?: string }
    ): Promise<{ role: UserRole; email: string; studentId?: string }> => {
      if (!overrideSignupInfo && inFlightSyncRef.current && inFlightSyncRef.current.uid === user.uid) {
        return inFlightSyncRef.current.promise;
      }
      const run = (async () => {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          const signupInfo = overrideSignupInfo || pendingSignupRef.current || undefined;
          const result = await syncUserSession(user, signupInfo);
          setUserProfile(result.profile);
          setRole(result.role);
          setStudentProfile(result.studentProfile);

          if (!result.profile.isBlocked && result.role === 'student') {
            const isNewSession = sessionLoggedUidRef.current !== user.uid;
            sessionLoggedUidRef.current = user.uid;
            const sid = await recordStudentLoginActivity(user, result.studentProfile, isNewSession);
            if (sid) sessionDocIdRef.current = sid;
          }
          return {
            role: result.role,
            email: getCleanEmailFromAuthUser(user.email),
            studentId: result.studentProfile?.admissionId || result.profile.studentId,
          };
        } finally {
          if (inFlightSyncRef.current?.uid === user.uid) {
            inFlightSyncRef.current = null;
          }
        }
      })();
      if (!overrideSignupInfo) {
        inFlightSyncRef.current = { uid: user.uid, promise: run };
      }
      return run;
    },
    []
  );

  useEffect(() => {
    const connTimer = setTimeout(() => {
      testFirestoreConnection();
    }, 1500);

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          await syncUser(user);
        } catch (err) {
          console.error('Auth sync error:', err);
          setRole('student');
        }
      } else {
        setIdToken(null);
        setUserProfile(null);
        setRole(null);
        setStudentProfile(null);
        setPendingFeesAmount(0);
        setEnrollments([]);
        sessionLoggedUidRef.current = null;
        sessionDocIdRef.current = null;
      }
      setAuthReady(true);
    });
    return () => {
      clearTimeout(connTimer);
      unsub();
    };
  }, [syncUser]);

  // Student presence heartbeat every 45 seconds
  useEffect(() => {
    if (!firebaseUser || role !== 'student' || userProfile?.isBlocked) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pingStudentHeartbeat(firebaseUser.uid, sessionDocIdRef.current, 1);
      }
    }, 45_000);
    return () => clearInterval(interval);
  }, [firebaseUser?.uid, role, userProfile?.isBlocked]);

  // Listen to user's block status, fees, and active enrollments in real time
  useEffect(() => {
    if (!firebaseUser) return;
    const unsubUser = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setUserProfile((prev) => ({ ...(prev || {}), ...(snap.data() as UserProfile) }));
        }
      },
      () => {}
    );

    const unsubFees = onSnapshot(
      query(collection(db, 'fee_records'), where('studentUid', '==', firebaseUser.uid)),
      (snap) => {
        const total = snap.docs.reduce((sum, d) => {
          const f = d.data() as FeeRecord;
          const net = Math.max(
            0,
            Number(f.totalFees || 0) - Number(f.discount || 0) - Number(f.scholarship || 0) + Number(f.lateFee || 0)
          );
          return sum + Math.max(0, net - Number(f.paidAmount || 0));
        }, 0);
        setPendingFeesAmount(total);
      },
      () => {}
    );

    const unsubEnroll = onSnapshot(
      query(collection(db, 'enrollments'), where('studentUid', '==', firebaseUser.uid)),
      (snap) => {
        setEnrollments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EnrollmentRecord, 'id'>) })));
      },
      () => {}
    );

    const unsubNotifs = onSnapshot(
      collection(db, 'notifications'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) }))
          .filter(
            (n) =>
              n.targetType === 'all' ||
              n.targetUid === firebaseUser.uid ||
              (studentProfile?.batchId && n.targetType === 'batch' && n.targetId === studentProfile.batchId) ||
              (studentProfile?.courseId && n.targetType === 'course' && n.targetId === studentProfile.courseId)
          )
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setNotifications(items);
      },
      () => {}
    );

    return () => {
      unsubUser();
      unsubFees();
      unsubEnroll();
      unsubNotifs();
    };
  }, [firebaseUser?.uid, studentProfile?.batchId, studentProfile?.courseId]);

  // Real-time Firestore catalog listeners (hydrated via startTransition so reload/welcome animation never lags)
  useEffect(() => {
    const applyIfSeededOrNonEmpty = <T,>(
      snapEmpty: boolean,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      mapped: T[]
    ) => {
      if (!snapEmpty || firestoreSeededRef.current) {
        startTransition(() => {
          setter(mapped);
        });
      }
    };

    let unsubs: Array<() => void> = [];
    const delayTimer = setTimeout(() => {
      unsubs = [
        onSnapshot(doc(db, 'institute_settings', 'main'), (snap) => {
          if (snap.exists()) {
            firestoreSeededRef.current = true;
            startTransition(() => {
              setSettings((prev) => ({ ...prev, ...(snap.data() as InstituteSettings) }));
            });
          }
        }, () => {}),
        onSnapshot(query(collection(db, 'courses'), where('published', '==', true)), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setCourses,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) }))
          );
        }, () => {}),
        onSnapshot(collection(db, 'batches'), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setBatches,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Batch, 'id'>) }))
          );
        }, () => {}),
        onSnapshot(query(collection(db, 'posters'), where('published', '==', true)), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setPosters,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PosterItem, 'id'>) }))
          );
        }, () => {}),
        onSnapshot(query(collection(db, 'banners'), where('published', '==', true)), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setRawBanners,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BannerItem, 'id'>) }))
          );
        }, () => {}),
        onSnapshot(query(collection(db, 'public_faculty'), where('active', '==', true)), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setFaculty,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PublicFacultyCard, 'id'>) }))
          );
        }, () => {}),
        onSnapshot(query(collection(db, 'notices'), where('published', '==', true)), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setNotices,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notice, 'id'>) }))
          );
        }, () => {}),
        onSnapshot(collection(db, 'results'), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setResults,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InstituteResult, 'id'>) }))
          );
        }, () => {}),
        onSnapshot(query(collection(db, 'gallery'), where('published', '==', true)), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setGallery,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryItem, 'id'>) }))
          );
        }, () => {}),
        onSnapshot(collection(db, 'timetable'), (snap) => {
          applyIfSeededOrNonEmpty(
            snap.empty,
            setTimetable,
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TimetableSlot, 'id'>) }))
          );
        }, () => {}),
      ];
    }, 150);

    return () => {
      clearTimeout(delayTimer);
      unsubs.forEach((u) => u());
    };
  }, []);

  // Filter active banners by date window & sortOrder
  const todayStr = new Date().toISOString().slice(0, 10);
  const banners = React.useMemo(() => {
    return rawBanners
      .filter((b) => b.published !== false)
      .filter((b) => (!b.startDate || todayStr >= b.startDate) && (!b.endDate || todayStr <= b.endDate))
      .sort((a, b) => Number(a.sortOrder || 99) - Number(b.sortOrder || 99));
  }, [rawBanners, todayStr]);

  const unreadNotifCount = React.useMemo(() => {
    if (!notifLastReadAt) return notifications.length;
    return notifications.filter((n) => (n.createdAt || '') > notifLastReadAt).length;
  }, [notifications, notifLastReadAt]);

  const isAccountBlocked = Boolean(
    userProfile?.isBlocked && role !== 'super_admin' && role !== 'admin'
  );

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    return await syncUser(cred.user);
  };

  const signInWithEmail = async (identifier: string, password: string) => {
    const raw = identifier.trim();
    let authEmail = raw.toLowerCase();
    if (!raw.includes('@')) {
      let digits = raw.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
      if (digits.length !== 10) {
        throw Object.assign(new Error('Invalid mobile or email'), { code: 'auth/invalid-email' });
      }
      authEmail = `${digits}${MOBILE_AUTH_DOMAIN}`;
    }
    const cred = await signInWithEmailAndPassword(auth, authEmail, password);
    return await syncUser(cred.user);
  };

  const registerWithEmail = async (email: string, password: string, name: string, mobile: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) cleanMobile = cleanMobile.slice(2);
    const authEmail = cleanEmail || `${cleanMobile}${MOBILE_AUTH_DOMAIN}`;
    const signupPayload = { name: cleanName, mobile: cleanMobile };

    pendingSignupRef.current = signupPayload;
    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
      }
      if (cleanEmail) {
        sendEmailVerification(cred.user).catch(() => {});
      }
      return await syncUser(cred.user, signupPayload);
    } finally {
      pendingSignupRef.current = null;
    }
  };

  const sendPhoneOtp = async (mobile: string, verifier: RecaptchaVerifier) => {
    const trimmed = mobile.trim();
    let e164 = trimmed;
    if (!trimmed.startsWith('+')) {
      let digits = trimmed.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
      if (digits.length !== 10) {
        throw Object.assign(new Error('Invalid phone number'), { code: 'auth/invalid-phone-number' });
      }
      e164 = `+91${digits}`;
    }
    return await signInWithPhoneNumber(auth, e164, verifier);
  };

  const confirmPhoneOtp = async (
    confirmation: ConfirmationResult,
    otp: string,
    name?: string,
    mobile?: string
  ) => {
    const cleanName = name?.trim() || '';
    let cleanMobile = (mobile || '').replace(/\D/g, '');
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) cleanMobile = cleanMobile.slice(2);
    const signupPayload = {
      ...(cleanName ? { name: cleanName } : {}),
      ...(cleanMobile ? { mobile: cleanMobile } : {}),
    };
    pendingSignupRef.current = signupPayload;
    try {
      const cred = await confirmation.confirm(otp.trim());
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
      }
      return await syncUser(cred.user, signupPayload);
    } finally {
      pendingSignupRef.current = null;
    }
  };

  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw Object.assign(new Error('Email required'), { code: 'auth/invalid-email' });
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    if (firebaseUser) {
      await markStudentLoggedOut(firebaseUser.uid, sessionDocIdRef.current);
    }
    await signOut(auth);
    setIdToken(null);
    setUserProfile(null);
    setRole(null);
    setStudentProfile(null);
    setEnrollments([]);
    setNotifications([]);
    setDrawerOpen(false);
    navigate('/');
    showToast('Aap safely logout ho gaye hain.', 'info');
  };

  const refreshSession = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      await syncUser(auth.currentUser);
    }
  };

  const contextValue = useMemo<AppContextValue>(
    () => ({
      currentPath,
      navigate,
      goBack,
      canGoBack: historyStack.length > 1,
      firebaseUser,
      idToken,
      authReady,
      userProfile,
      role,
      studentProfile,
      isAccountBlocked,
      settings,
      courses,
      batches,
      posters,
      banners,
      faculty,
      notices,
      notifications,
      unreadNotifCount,
      markAllNotificationsRead,
      results,
      gallery,
      timetable,
      enrollments,
      pendingFeesAmount,
      selectedExam,
      setSelectedExam,
      searchQuery,
      setSearchQuery,
      darkMode,
      toggleDarkMode,
      drawerOpen,
      setDrawerOpen,
      notifOpen,
      setNotifOpen,
      examModalOpen,
      setExamModalOpen,
      introVisible,
      completeIntro,
      triggerIntroReplay,
      checkoutCourse,
      openCheckout,
      closeCheckout,
      catalogLoading,
      toasts,
      showToast,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      sendPhoneOtp,
      confirmPhoneOtp,
      sendPasswordReset,
      resendVerificationEmail,
      logout,
      refreshSession,
    }),
    [
      currentPath,
      navigate,
      goBack,
      historyStack.length,
      firebaseUser,
      idToken,
      authReady,
      userProfile,
      role,
      studentProfile,
      isAccountBlocked,
      settings,
      courses,
      batches,
      posters,
      banners,
      faculty,
      notices,
      notifications,
      unreadNotifCount,
      markAllNotificationsRead,
      results,
      gallery,
      timetable,
      enrollments,
      pendingFeesAmount,
      selectedExam,
      setSelectedExam,
      searchQuery,
      darkMode,
      toggleDarkMode,
      drawerOpen,
      notifOpen,
      examModalOpen,
      introVisible,
      completeIntro,
      triggerIntroReplay,
      checkoutCourse,
      openCheckout,
      closeCheckout,
      catalogLoading,
      toasts,
      showToast,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}
