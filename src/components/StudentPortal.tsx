import React, { useEffect, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  GraduationCap,
  ImagePlus,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlayCircle,
  Printer,
  Receipt,
  Trash2,
  Upload,
  User,
  Video,
  X,
} from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { useApp } from '../context/AppContext.tsx';
import { auth } from '../lib/firebase.ts';
import { ResilientImage } from './ResilientImage.tsx';
import { BackBar } from './BackBar.tsx';
import { ImageCropModal } from './ImageCropModal.tsx';
import { ChemistryVideoPlayer } from './ChemistryVideoPlayer.tsx';
import { uploadMediaFile } from '../lib/mediaUpload.ts';
import { exportHtmlToPrintPdf } from '../lib/exportUtils.ts';
import {
  fetchStudentPortalData,
  issueCourseCertificate,
  saveStudentDownload,
  saveStudentLectureProgress,
  submitDeletionRequest,
  submitStudentDoubt,
  submitStudentHomework,
  submitStudentMcqTest,
  updateStudentProfileFields,
} from '../lib/firestoreService.ts';
import type {
  AttendanceRecord,
  CertificateRecord,
  Course,
  DoubtItem,
  DownloadRecord,
  EnrollmentRecord,
  ExamTrack,
  FeeRecord,
  HomeworkItem,
  HomeworkSubmission,
  LectureProgress,
  LiveClass,
  Notice,
  NotificationItem,
  OrderRecord,
  PaymentRecord,
  RecordedLecture,
  StudentRecord,
  StudyMaterial,
  TestItem,
  TestResult,
  TimetableSlot,
} from '../types.ts';

type StudentTab =
  | 'overview'
  | 'courses'
  | 'profile'
  | 'live'
  | 'lectures'
  | 'materials'
  | 'downloads'
  | 'homework'
  | 'tests'
  | 'doubts'
  | 'attendance'
  | 'fees'
  | 'orders'
  | 'certificates'
  | 'timetable';

const VALID_TABS: StudentTab[] = [
  'overview',
  'courses',
  'profile',
  'live',
  'lectures',
  'materials',
  'downloads',
  'homework',
  'tests',
  'doubts',
  'attendance',
  'fees',
  'orders',
  'certificates',
  'timetable',
];

export function StudentPortal() {
  const {
    currentPath,
    firebaseUser,
    idToken,
    userProfile,
    courses,
    settings,
    showToast,
    openCheckout,
    triggerIntroReplay,
    setSelectedExam,
    logout,
    navigate,
    refreshSession,
  } = useApp();
  const [tab, setTab] = useState<StudentTab>('overview');
  const [loading, setLoading] = useState(true);

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [lectureProgress, setLectureProgress] = useState<LectureProgress[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [lectures, setLectures] = useState<RecordedLecture[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);

  // Interactive states
  const [activeLecture, setActiveLecture] = useState<RecordedLecture | null>(null);
  const [activeTest, setActiveTest] = useState<TestItem | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [matCategory, setMatCategory] = useState<string>('All');
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);
  const [verifyBanner, setVerifyBanner] = useState<{ status: string; message: string } | null>(null);
  const [verifyingOrder, setVerifyingOrder] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '',
    mobile: '',
    address: '',
    dob: '',
    studentClass: 'Class 12',
    board: 'CBSE',
    examGoal: 'Class 12 Chemistry' as ExamTrack,
    photoUrl: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [doubtForm, setDoubtForm] = useState({ courseId: '', chapter: '', question: '' });
  const [deletionReason, setDeletionReason] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  // Sync URL ?tab=... and ?order_id=...
  useEffect(() => {
    const qIndex = currentPath.indexOf('?');
    if (qIndex === -1) return;
    const params = new URLSearchParams(currentPath.slice(qIndex + 1));
    const requested = params.get('tab') as StudentTab | null;
    if (requested && VALID_TABS.includes(requested)) {
      setTab(requested);
    }
    const orderId = params.get('order_id');
    if (orderId && firebaseUser && !verifyingOrder) {
      verifyCashfreeOrder(orderId);
    }
  }, [currentPath, firebaseUser?.uid]);

  async function verifyCashfreeOrder(orderId: string) {
    if (!firebaseUser) return;
    setVerifyingOrder(true);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await fetch('/api/payments/cashfree/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'PAID') {
        setVerifyBanner({
          status: 'PAID',
          message: `Payment Successful! Order ${orderId} verified. Your course is now unlocked.`,
        });
        showToast('Course payment verified & unlocked!', 'success');
      } else {
        setVerifyBanner({
          status: data.status || 'PENDING',
          message: `Order ${orderId} status: ${data.status || 'Pending verification'}.`,
        });
      }
      await loadPortal();
    } catch {
      setVerifyBanner({ status: 'ERROR', message: `Could not verify order ${orderId} right now.` });
    } finally {
      setVerifyingOrder(false);
    }
  }

  async function loadPortal() {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const cleanEmail = firebaseUser.email?.endsWith('@mobile.thezoneofchemistry.in') ? '' : (firebaseUser.email || '');
      const d = await fetchStudentPortalData(firebaseUser.uid, cleanEmail);
      setStudent(d.student || null);
      setAttendance(d.attendance || []);
      setFees(d.fees || []);
      setPayments(d.payments || []);
      setOrders(d.orders || []);
      setTestResults(d.testResults || []);
      setSubmissions(d.homeworkSubmissions || []);
      setLectureProgress(d.lectureProgress || []);
      setEnrollments(d.enrollments || []);
      setDownloads(d.downloads || []);
      setDoubts(d.doubts || []);
      setCertificates(d.certificates || []);
      setLiveClasses(d.liveClasses || []);
      setLectures((d.recordedLectures || []).filter((l) => l.published !== false));
      setMaterials((d.studyMaterials || []).filter((m) => m.published !== false));
      setHomework(d.homework || []);
      setTests(d.tests || []);
      setNotices(d.notices || []);
      setNotifications(d.notifications || []);
      setTimetable(d.timetable || []);

      if (d.student) {
        setProfileForm({
          name: d.student.name || userProfile?.name || '',
          mobile: d.student.mobile || '',
          address: d.student.address || '',
          dob: d.student.dob || '',
          studentClass: d.student.studentClass || 'Class 12',
          board: d.student.board || 'CBSE',
          examGoal: d.student.examGoal || userProfile?.examGoal || 'Class 12 Chemistry',
          photoUrl: d.student.photoUrl || userProfile?.photoUrl || '',
        });
      } else {
        setProfileForm({
          name: userProfile?.name || firebaseUser.displayName || '',
          mobile: userProfile?.phone || '',
          address: userProfile?.address || '',
          dob: userProfile?.dob || '',
          studentClass: userProfile?.studentClass || 'Class 12',
          board: userProfile?.board || 'CBSE',
          examGoal: userProfile?.examGoal || 'Class 12 Chemistry',
          photoUrl: userProfile?.photoUrl || '',
        });
      }
      if (!doubtForm.courseId && (d.enrollments?.[0]?.courseId || courses[0]?.id)) {
        setDoubtForm((p) => ({ ...p, courseId: d.enrollments?.[0]?.courseId || courses[0]?.id || '' }));
      }
    } catch (err: any) {
      showToast(err.message || 'Could not load portal', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (firebaseUser) loadPortal();
    else setLoading(false);
  }, [firebaseUser?.uid]);

  if (!firebaseUser) {
    return (
      <div className="min-h-[75vh] bg-slate-50 dark:bg-slate-950 flex flex-col">
        <BackBar title="Student Portal" backLabel="Back" fallbackPath="/" />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Student Login Required</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Please sign in to access your classes, notes, attendance, fees, and test results.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student-login')}
            className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
          >
            Go to Student Login
          </button>
        </div>
      </div>
    );
  }

  const totalAtt = attendance.length;
  const presentAtt = attendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
  const attendancePct = totalAtt ? Math.round((presentAtt / totalAtt) * 100) : 100;

  const totalNetFees = fees.reduce(
    (s, f) => s + Math.max(0, Number(f.totalFees || 0) - Number(f.discount || 0) - Number(f.scholarship || 0) + Number(f.lateFee || 0)),
    0
  );
  const totalPaid = fees.reduce((s, f) => s + Number(f.paidAmount || 0), 0);
  const pendingFees = Math.max(0, totalNetFees - totalPaid);

  const avgScore = testResults.length
    ? Math.round(testResults.reduce((s, r) => s + Number(r.percentage || 0), 0) / testResults.length)
    : 0;

  const isCourseUnlocked = (courseId: string) => {
    if (!courseId) return true;
    const c = courses.find((x) => x.id === courseId);
    if (c && Number(c.fees) <= 0) return true;
    if (student?.courseId === courseId) return true;
    return enrollments.some((e) => e.courseId === courseId && e.status === 'Active');
  };

  async function handleConfirmPhoto(dataUrl: string) {
    if (!firebaseUser) return;
    setCropFile(null);
    setUploading(true);
    try {
      setProfileForm((p) => ({ ...p, photoUrl: dataUrl }));
      await updateStudentProfileFields(firebaseUser.uid, student?.id, { photoUrl: dataUrl });
      await refreshSession();
      showToast('Profile photo updated from gallery.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not update profile photo', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    try {
      await updateStudentProfileFields(firebaseUser.uid, student?.id, profileForm);
      setSelectedExam(profileForm.examGoal);
      if (newPassword.trim().length >= 6 && auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword.trim());
        setNewPassword('');
      }
      await refreshSession();
      await loadPortal();
      showToast('Profile updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not update profile', 'error');
    }
  }

  async function handleDownloadMaterial(m: StudyMaterial) {
    if (!isCourseUnlocked(m.courseId)) {
      const targetCourse = courses.find((c) => c.id === m.courseId);
      if (targetCourse) openCheckout(targetCourse);
      else showToast('Enroll in this course to unlock PDF notes.', 'info');
      return;
    }
    if (!firebaseUser) return;
    try {
      await saveStudentDownload(firebaseUser, m);
      setPreviewMaterial(m);
      showToast('Opened & saved to My Downloads.', 'success');
    } catch {
      setPreviewMaterial(m);
    }
  }

  async function handleHomeworkUpload(hw: HomeworkItem, file: File) {
    if (!firebaseUser) return;
    setUploading(true);
    try {
      const fileUrl = await uploadMediaFile(file, idToken, { folder: 'homework' });
      await submitStudentHomework(
        firebaseUser.uid,
        student?.id || firebaseUser.uid,
        student?.name || userProfile?.name || firebaseUser.email || 'Student',
        hw.id,
        hw.title,
        fileUrl
      );
      showToast('Homework submitted successfully!', 'success');
      await loadPortal();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveLectureProgress(
    lec: RecordedLecture,
    completed: boolean,
    progressPercent: number,
    pos = 0,
    dur = 0
  ) {
    if (!firebaseUser) return;
    try {
      await saveStudentLectureProgress(firebaseUser.uid, lec, completed, progressPercent, pos, dur);
      setLectureProgress((prev) => {
        const idx = prev.findIndex((p) => p.lectureId === lec.id);
        const updated: LectureProgress = {
          id: `${firebaseUser.uid}_${lec.id}`,
          studentUid: firebaseUser.uid,
          lectureId: lec.id,
          completed,
          progressPercent,
          lastPositionSeconds: pos,
          durationSeconds: dur,
          lastWatchedAt: new Date().toISOString(),
        };
        if (idx === -1) return [...prev, updated];
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      });
      if (completed) {
        showToast('Lecture marked as completed!', 'success');
      }
    } catch {
      showToast('Could not save progress', 'error');
    }
  }

  async function handleSubmitMcq() {
    if (!activeTest || !firebaseUser) return;
    try {
      const data = await submitStudentMcqTest(firebaseUser.uid, student, activeTest, mcqAnswers);
      showToast(`Test submitted! Score: ${data.marksObtained}/${data.maxMarks} (${data.percentage}%)`, 'success');
      setActiveTest(null);
      setMcqAnswers({});
      await loadPortal();
    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
    }
  }

  async function handleSubmitDoubt(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !doubtForm.question.trim()) return;
    try {
      const c = courses.find((x) => x.id === doubtForm.courseId);
      await submitStudentDoubt({
        studentUid: firebaseUser.uid,
        studentName: student?.name || userProfile?.name || firebaseUser.displayName || 'Student',
        admissionId: student?.admissionId || '',
        courseId: c?.id || doubtForm.courseId || 'general',
        courseTitle: c?.title || 'Chemistry General',
        batchId: student?.batchId || '',
        chapter: doubtForm.chapter.trim() || 'General Chemistry',
        question: doubtForm.question.trim(),
      });
      setDoubtForm((p) => ({ ...p, chapter: '', question: '' }));
      showToast('Doubt sent to faculty! You will receive a reply shortly.', 'success');
      await loadPortal();
    } catch (err: any) {
      showToast(err.message || 'Could not submit doubt', 'error');
    }
  }

  async function handleIssueCertificate(course: Course, pct: number) {
    if (!firebaseUser) return;
    try {
      await issueCourseCertificate(
        firebaseUser.uid,
        student?.name || userProfile?.name || firebaseUser.displayName || 'Student',
        student?.admissionId || 'ONLINE',
        course.id,
        course.title,
        pct,
        settings.directorName
      );
      showToast(`Certificate issued for ${course.title}!`, 'success');
      await loadPortal();
    } catch (err: any) {
      showToast(err.message || 'Could not generate certificate', 'error');
    }
  }

  async function handleAccountDeletionRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !deletionReason.trim()) return;
    try {
      const contactInfo =
        firebaseUser.email && !firebaseUser.email.endsWith('@mobile.thezoneofchemistry.in')
          ? firebaseUser.email
          : student?.mobile || userProfile?.phone || firebaseUser.phoneNumber || '';
      await submitDeletionRequest(
        firebaseUser.uid,
        student?.name || userProfile?.name || 'Student',
        contactInfo,
        deletionReason
      );
      setDeletionReason('');
      showToast('Account deletion request submitted to Admin for review.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit request', 'error');
    }
  }

  function handleOnlineFeePay(fee: FeeRecord) {
    const net = Math.max(0, Number(fee.totalFees || 0) - Number(fee.discount || 0) - Number(fee.scholarship || 0) + Number(fee.lateFee || 0));
    const due = Math.max(0, net - Number(fee.paidAmount || 0));
    if (due <= 0) return;

    const matchedCourse: Course = courses.find((c) => c.title === fee.courseName) || {
      id: fee.id,
      title: fee.courseName || 'Institute Fee Installment',
      category: 'Class 12',
      description: `Pending fee installment (${fee.courseName})`,
      duration: 'Active Batch',
      fees: due,
      subjects: 'Chemistry',
      batchAvailability: 'Active',
      teacherName: settings.directorName,
      syllabus: [],
      imageUrl: '',
      published: true,
      createdAt: new Date().toISOString(),
    };
    openCheckout({ ...matchedCourse, fees: due });
  }

  const navItems: { id: StudentTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'courses', label: 'My Courses', icon: <Layers className="w-4 h-4" /> },
    { id: 'lectures', label: 'Lectures', icon: <PlayCircle className="w-4 h-4" /> },
    { id: 'materials', label: 'Study PDFs', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'live', label: 'Live Classes', icon: <Video className="w-4 h-4" /> },
    { id: 'tests', label: 'Tests & Results', icon: <Award className="w-4 h-4" /> },
    { id: 'doubts', label: 'Doubts (Q&A)', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'homework', label: 'Homework', icon: <FileText className="w-4 h-4" /> },
    { id: 'downloads', label: 'Downloads', icon: <Download className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'fees', label: 'Fees & Wallet', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <Receipt className="w-4 h-4" /> },
    { id: 'certificates', label: 'Certificates', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Calendar className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  const activeTabLabel = navItems.find((i) => i.id === tab)?.label || 'Student Portal';

  const matCategories = [
    'All',
    'PDF Notes',
    'NCERT Notes',
    'Important Questions',
    'PYQ',
    'Assignment',
    'Worksheet',
    'Test Paper',
    'Answer Key',
    'DPP',
  ];
  const filteredMaterials = materials.filter(
    (m) => matCategory === 'All' || m.category.toLowerCase().includes(matCategory.toLowerCase())
  );

  // Ordered lectures list for prev/next inside player
  const activeLecIndex = activeLecture ? lectures.findIndex((l) => l.id === activeLecture.id) : -1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          defaultAspect="1:1"
          onCancel={() => setCropFile(null)}
          onConfirm={handleConfirmPhoto}
        />
      )}

      <BackBar
        title={tab === 'overview' ? 'Student Dashboard' : activeTabLabel}
        backLabel={tab === 'overview' ? 'Home' : 'Back'}
        fallbackPath="/"
        onBack={tab === 'overview' ? undefined : () => setTab('overview')}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0">
              <ResilientImage
                src={profileForm.photoUrl}
                alt="Student"
                fallbackTitle={(student?.name || userProfile?.name || 'S').slice(0, 2).toUpperCase()}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {student?.name || userProfile?.name || student?.mobile || userProfile?.phone || firebaseUser.phoneNumber || 'Student'}
              </p>
              <p className="text-xs font-mono text-blue-700 dark:text-sky-400 truncate">
                {student?.admissionId || userProfile?.studentId || 'Active Learner'}
              </p>
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  tab === item.id
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-4 min-h-[44px] flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 max-w-[1180px] w-full mx-auto">
          {/* Mobile Tab Strip */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-3 mb-5 no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  tab === item.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          {verifyBanner && (
            <div
              className={`mb-5 p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 ${
                verifyBanner.status === 'PAID'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}
            >
              <span>{verifyBanner.message}</span>
              <button type="button" onClick={() => setVerifyBanner(null)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
              <div className="h-52 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : (
            <>
              {!student && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <strong className="block">Offline Admission Application Pending / Optional</strong>
                    <span className="text-xs">You can purchase or enroll in any online course immediately, or apply for Motihari classroom batches.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/admissions')}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-amber-900 text-white rounded-xl shrink-0"
                  >
                    Apply Offline Admission
                  </button>
                </div>
              )}

              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/50 bg-white/10 shrink-0">
                        <ResilientImage
                          src={profileForm.photoUrl}
                          alt="Profile"
                          fallbackTitle={(student?.name || userProfile?.name || 'S').slice(0, 2).toUpperCase()}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{student?.name || userProfile?.name || 'Student'}</h2>
                        <p className="text-xs text-sky-100 mt-0.5">
                          {(student?.admissionId || userProfile?.studentId) ? `ID: ${student?.admissionId || userProfile?.studentId} · ` : ''}
                          {student ? `${student.courseName} · ${student.batchName}` : `${profileForm.examGoal} · Motihari`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab('profile')}
                      className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-white text-blue-800 rounded-xl self-start sm:self-center whitespace-nowrap"
                    >
                      Edit Profile &amp; Photo
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <button
                      type="button"
                      onClick={() => setTab('attendance')}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-blue-300"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">Attendance</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">{attendancePct}%</p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">{presentAtt} / {totalAtt || 0} classes</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('fees')}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-blue-300"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">Wallet / Fees Due</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">₹{pendingFees.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">Paid: ₹{totalPaid.toLocaleString('en-IN')}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('tests')}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-blue-300"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">Average Test Score</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-blue-700 dark:text-sky-400 mt-1">{avgScore}%</p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">{testResults.length} evaluated</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('courses')}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-blue-300"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">My Courses</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                        {enrollments.filter((e) => e.status === 'Active').length + (student ? 1 : 0)}
                      </p>
                      <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 mt-1">Open Courses →</p>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-700 dark:text-sky-400" /> Recent Notices &amp; Alerts
                      </h3>
                      <div className="space-y-3">
                        {notices.slice(0, 4).map((n) => (
                          <div key={n.id} className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{n.category} · {n.date}</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Quick Study Tools</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setTab('lectures')} className="p-3.5 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Recorded Lectures</p>
                          <p className="text-xs text-slate-500">{lectures.length} videos</p>
                        </button>
                        <button type="button" onClick={() => setTab('materials')} className="p-3.5 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notes &amp; DPPs</p>
                          <p className="text-xs text-slate-500">{materials.length} files</p>
                        </button>
                        <button type="button" onClick={() => setTab('doubts')} className="p-3.5 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Ask Doubt</p>
                          <p className="text-xs text-slate-500">{doubts.length} questions</p>
                        </button>
                        <button type="button" onClick={() => setTab('orders')} className="p-3.5 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Orders &amp; Receipts</p>
                          <p className="text-xs text-slate-500">{orders.length} orders</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MY COURSES */}
              {tab === 'courses' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Enrolled Batches &amp; Courses</h2>
                    <button
                      type="button"
                      onClick={() => navigate('/courses')}
                      className="min-h-[40px] px-4 py-2 text-xs font-semibold text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 rounded-xl"
                    >
                      Explore All Courses →
                    </button>
                  </div>

                  {student && (
                    <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-blue-700 dark:text-sky-400">Primary Institute Admission · {student.admissionId}</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{student.courseName}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          Batch: {student.batchName} · Faculty: {settings.directorName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab('lectures')}
                        className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-xl shrink-0"
                      >
                        Open Lectures &amp; Notes
                      </button>
                    </div>
                  )}

                  {enrollments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {enrollments.map((enr) => {
                        const cLectures = lectures.filter((l) => l.courseId === enr.courseId);
                        const completedCount = cLectures.filter(
                          (l) => lectureProgress.find((p) => p.lectureId === l.id)?.completed
                        ).length;
                        const courseObj = courses.find((c) => c.id === enr.courseId);
                        const pct = cLectures.length ? Math.round((completedCount / cLectures.length) * 100) : 0;

                        return (
                          <div key={enr.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">{enr.status} · Enrolled {enr.enrolledAt.slice(0, 10)}</p>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{enr.courseTitle}</h3>
                                <p className="text-xs text-slate-500 mt-1 tabular-nums">Paid: ₹{Number(enr.amountPaid).toLocaleString('en-IN')}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/courses/${enr.courseId}`)}
                                className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-slate-800 rounded-xl shrink-0"
                              >
                                Classroom
                              </button>
                            </div>
                            {cLectures.length > 0 && (
                              <div>
                                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                                  <span>Progress: {completedCount}/{cLectures.length} lectures</span>
                                  <span className="font-mono font-bold tabular-nums">{pct}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-700 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                {pct === 100 && courseObj && (
                                  <button
                                    type="button"
                                    onClick={() => handleIssueCertificate(courseObj, 100)}
                                    className="mt-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                                  >
                                    Claim Completion Certificate →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Available Chemistry Batches</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter((c) => c.published).map((c) => {
                        const already = isCourseUnlocked(c.id);
                        return (
                          <div key={c.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 flex items-center justify-center">
                              <ResilientImage src={c.imageUrl} alt={c.title} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{c.category}</p>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{c.title}</h4>
                              <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                                {Number(c.fees) <= 0 ? 'FREE' : `₹${Number(c.fees).toLocaleString('en-IN')}`} · {c.duration}
                              </p>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => (already ? navigate(`/courses/${c.id}`) : openCheckout(c))}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                                    already
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-blue-700 text-white hover:bg-blue-800'
                                  }`}
                                >
                                  {already ? 'Unlocked · Open' : Number(c.fees) <= 0 ? 'Enroll Free' : 'Buy Now'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/courses/${c.id}`)}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE CLASSES */}
              {tab === 'live' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Online Live Classes</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveClasses.map((lc) => (
                      <div key={lc.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <p className="text-xs text-blue-700 dark:text-sky-400 font-semibold mb-1">
                            {lc.platform} · {lc.batchName} · {lc.status}
                          </p>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{lc.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {lc.subject} ({lc.chapter}) · {lc.scheduledAt} · {lc.durationMinutes} mins
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={lc.joinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl inline-flex items-center"
                          >
                            Join Live Class
                          </a>
                          {lc.recordedUrl && (
                            <a
                              href={lc.recordedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl inline-flex items-center"
                            >
                              Watch Recording
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RECORDED LECTURES */}
              {tab === 'lectures' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recorded Chemistry Lectures</h2>
                  {activeLecture && (
                    <ChemistryVideoPlayer
                      lecture={activeLecture}
                      idToken={idToken}
                      isUnlocked={isCourseUnlocked(activeLecture.courseId)}
                      initialPositionSeconds={
                        lectureProgress.find((p) => p.lectureId === activeLecture.id)?.lastPositionSeconds || 0
                      }
                      isCompleted={Boolean(
                        lectureProgress.find((p) => p.lectureId === activeLecture.id)?.completed
                      )}
                      hasPrev={activeLecIndex > 0}
                      hasNext={activeLecIndex >= 0 && activeLecIndex < lectures.length - 1}
                      onPrev={() => activeLecIndex > 0 && setActiveLecture(lectures[activeLecIndex - 1])}
                      onNext={() =>
                        activeLecIndex >= 0 &&
                        activeLecIndex < lectures.length - 1 &&
                        setActiveLecture(lectures[activeLecIndex + 1])
                      }
                      onUnlockClick={() => {
                        const c = courses.find((x) => x.id === activeLecture.courseId);
                        if (c) openCheckout(c);
                      }}
                      onProgressSave={(completed, pct, pos, dur) =>
                        handleSaveLectureProgress(activeLecture, completed, pct, pos, dur)
                      }
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lectures.map((lec) => {
                      const prog = lectureProgress.find((p) => p.lectureId === lec.id);
                      const unlocked = isCourseUnlocked(lec.courseId) || Boolean(lec.isFreePreview);
                      return (
                        <div key={lec.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            {lec.chapter} · Lec {lec.lectureNumber || 1} · {lec.duration}
                          </p>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{lec.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{lec.description}</p>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveLecture(lec)}
                              className={`min-h-[42px] px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 ${
                                unlocked ? 'text-white bg-blue-700' : 'text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800'
                              }`}
                            >
                              <PlayCircle className="w-4 h-4" />
                              {!unlocked ? 'Locked · Preview' : prog ? 'Resume Lecture' : 'Watch Lecture'}
                            </button>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                              {prog?.completed ? 'Completed (100%)' : prog ? `${prog.progressPercent}%` : lec.isFreePreview ? 'Free Preview' : 'New'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STUDY MATERIALS */}
              {tab === 'materials' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Study Materials, PYQs &amp; PDFs</h2>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {matCategories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setMatCategory(c)}
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                          matCategory === c
                            ? 'bg-blue-700 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMaterials.map((m) => (
                      <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {m.coverUrl && (
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 flex items-center justify-center">
                              <ResilientImage src={m.coverUrl} alt={m.title} className="w-full h-full object-contain" />
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{m.category} · {m.chapter} · {m.createdAt}</p>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h3>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadMaterial(m)}
                          className="min-h-[42px] px-4 py-2 text-xs font-semibold text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 rounded-xl inline-flex items-center gap-1.5 self-start sm:self-center"
                        >
                          <Eye className="w-4 h-4" /> Preview / Save PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MY DOWNLOADS */}
              {tab === 'downloads' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Saved Downloads ({downloads.length})</h2>
                  {downloads.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        No downloaded notes saved yet. Open Study PDFs &amp; DPPs to save them here for instant access.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTab('materials')}
                        className="min-h-[44px] px-5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-xl"
                      >
                        Browse Study Materials
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                      {downloads.map((d) => (
                        <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{d.category} · {d.chapter} · Saved {d.downloadedAt.slice(0, 10)}</p>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{d.title}</h3>
                          </div>
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-slate-800 rounded-xl shrink-0 inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Open
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* HOMEWORK */}
              {tab === 'homework' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Homework &amp; Assignments</h2>
                  <div className="space-y-4">
                    {homework.map((hw) => {
                      const sub = submissions.find((s) => s.homeworkId === hw.id);
                      return (
                        <div key={hw.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{hw.chapter} · Due: {hw.dueDate}</p>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{hw.title}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{hw.description}</p>
                            {sub && (
                              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-2">
                                Status: {sub.status} ({sub.submittedAt.slice(0, 10)}) {sub.remarks ? `· Remarks: ${sub.remarks}` : ''}
                              </p>
                            )}
                          </div>
                          <label className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : sub ? 'Re-submit Answer' : 'Upload Solution'}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleHomeworkUpload(hw, f);
                              }}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TESTS & RESULTS */}
              {tab === 'tests' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tests, Online MCQ &amp; Performance Report</h2>

                  {activeTest && (
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeTest.title}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{activeTest.instructions}</p>
                        </div>
                        <button type="button" onClick={() => setActiveTest(null)} className="text-xs text-slate-500">
                          Cancel
                        </button>
                      </div>
                      {(activeTest.questions || []).map((q, qIdx) => (
                        <div key={q.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                            Q{qIdx + 1}. {q.question}
                          </p>
                          <div className="space-y-2">
                            {q.options.map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer min-h-[36px]">
                                <input
                                  type="radio"
                                  name={`q_${qIdx}`}
                                  checked={mcqAnswers[qIdx] === oIdx}
                                  onChange={() => setMcqAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleSubmitMcq}
                        className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl"
                      >
                        Submit MCQ Test
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tests.map((t) => (
                      <div key={t.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{t.testType} · {t.date} · {t.maxMarks} Marks</p>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.title}</h3>
                        </div>
                        {t.questions && t.questions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveTest(t)}
                            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-xl shrink-0"
                          >
                            Start Test
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Your Test Results &amp; Chapter Analysis</h3>
                    {testResults.length === 0 ? (
                      <p className="text-sm text-slate-500">No test results recorded yet. Attempt an Online MCQ test above to generate your performance report.</p>
                    ) : (
                      <div className="space-y-3">
                        {testResults.map((r) => (
                          <div key={r.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{r.testTitle}</span>
                              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                {r.marksObtained}/{r.maxMarks} ({r.percentage}%) · Rank #{r.rank}
                              </span>
                            </div>
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-700 rounded-full" style={{ width: `${Math.min(100, r.percentage)}%` }} />
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              Weak Chapters: {r.weakChapters || 'None'} · {r.remarks}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DOUBTS Q&A */}
              {tab === 'doubts' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ask a Chemistry Doubt</h2>
                  <form onSubmit={handleSubmitDoubt} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Course</label>
                        <select
                          value={doubtForm.courseId}
                          onChange={(e) => setDoubtForm({ ...doubtForm, courseId: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                        >
                          <option value="">General Chemistry</option>
                          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Chapter / Topic</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Aldol Condensation / Electrochemistry"
                          value={doubtForm.chapter}
                          onChange={(e) => setDoubtForm({ ...doubtForm, chapter: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      required
                      placeholder="Write your Chemistry question clearly for Prof. S. K. Srivastav / Faculty..."
                      value={doubtForm.question}
                      onChange={(e) => setDoubtForm({ ...doubtForm, question: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                    />
                    <button type="submit" className="min-h-[44px] px-5 py-2.5 text-xs font-bold text-white bg-blue-700 rounded-xl">
                      Submit Doubt to Faculty
                    </button>
                  </form>

                  <div className="space-y-3">
                    {doubts.length === 0 ? (
                      <p className="text-sm text-slate-500">No doubts asked yet.</p>
                    ) : (
                      doubts.map((d) => (
                        <div key={d.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-blue-700 dark:text-sky-400">{d.courseTitle} · {d.chapter}</span>
                            <span className={`font-bold ${d.status === 'Answered' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}`}>
                              {d.status}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{d.question}</p>
                          {d.reply && (
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-slate-800 dark:text-emerald-100">
                              <p className="font-bold mb-0.5">Faculty Reply ({d.repliedBy || settings.directorName}):</p>
                              <p>{d.reply}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ATTENDANCE */}
              {tab === 'attendance' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Attendance History ({attendancePct}%)</h2>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Batch</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Marked By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {attendance.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 px-4 text-slate-500 text-center">No attendance entries marked yet.</td>
                          </tr>
                        ) : (
                          attendance.map((a) => (
                            <tr key={a.id}>
                              <td className="py-3 px-4 font-mono tabular-nums">{a.date}</td>
                              <td className="py-3 px-4">{a.batchName}</td>
                              <td className="py-3 px-4 font-semibold">{a.status}</td>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{a.markedBy}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* FEES & RECEIPTS */}
              {tab === 'fees' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fee Wallet &amp; Payment Receipts</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fees.map((f) => {
                      const net = Math.max(
                        0,
                        Number(f.totalFees || 0) - Number(f.discount || 0) - Number(f.scholarship || 0) + Number(f.lateFee || 0)
                      );
                      const due = Math.max(0, net - Number(f.paidAmount || 0));
                      return (
                        <div key={f.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{f.courseName} · Due: {f.dueDate}</p>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">Status: {f.status}</h3>
                            </div>
                            {due > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOnlineFeePay(f)}
                                className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-xl"
                              >
                                Pay Online (Cashfree)
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div><span className="text-slate-500 block">Net Fee</span><span className="font-mono font-bold tabular-nums">₹{net.toLocaleString('en-IN')}</span></div>
                            <div><span className="text-slate-500 block">Paid</span><span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">₹{Number(f.paidAmount).toLocaleString('en-IN')}</span></div>
                            <div><span className="text-slate-500 block">Pending</span><span className="font-mono font-bold text-red-700 dark:text-red-400 tabular-nums">₹{due.toLocaleString('en-IN')}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
                      Payment History &amp; Receipts
                    </div>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-2.5 px-4">Receipt No</th>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Mode</th>
                          <th className="py-2.5 px-4">Amount</th>
                          <th className="py-2.5 px-4">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 px-4 text-center text-slate-500">No payments recorded yet.</td>
                          </tr>
                        ) : (
                          payments.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2.5 px-4 font-mono">{p.receiptNo}</td>
                              <td className="py-2.5 px-4 tabular-nums">{p.paidAt.slice(0, 10)}</td>
                              <td className="py-2.5 px-4">{p.mode}</td>
                              <td className="py-2.5 px-4 font-mono font-bold tabular-nums">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    exportHtmlToPrintPdf(
                                      `Fee Receipt — ${p.receiptNo}`,
                                      `<p><strong>Receipt No:</strong> ${p.receiptNo}</p>
                                       <p><strong>Student:</strong> ${p.studentName} (${p.admissionId})</p>
                                       <p><strong>Amount Paid:</strong> ₹${p.amount}</p>
                                       <p><strong>Payment Mode:</strong> ${p.mode}</p>
                                       <p><strong>Date:</strong> ${p.paidAt.slice(0, 10)}</p>`
                                    )
                                  }
                                  className="text-xs font-semibold text-blue-700 dark:text-sky-400 inline-flex items-center gap-1"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Print
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CASHFREE ORDERS */}
              {tab === 'orders' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Course Orders &amp; Payment History</h2>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Course</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 px-4 text-center text-slate-500">No online orders placed yet.</td>
                          </tr>
                        ) : (
                          orders.map((o) => (
                            <tr key={o.id}>
                              <td className="py-3 px-4 font-mono text-xs">{o.orderId}</td>
                              <td className="py-3 px-4 font-semibold">{o.courseTitle}</td>
                              <td className="py-3 px-4 font-mono tabular-nums">₹{Number(o.amount).toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-xs font-bold">{o.status}</td>
                              <td className="py-3 px-4">
                                {o.status !== 'PAID' ? (
                                  <button
                                    type="button"
                                    disabled={verifyingOrder}
                                    onClick={() => verifyCashfreeOrder(o.orderId)}
                                    className="px-3 py-1 rounded-lg bg-blue-700 text-white text-xs font-bold"
                                  >
                                    Verify Status
                                  </button>
                                ) : (
                                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                    {o.receiptNo || 'Verified'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CERTIFICATES */}
              {tab === 'certificates' && (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Course Completion Certificates</h2>
                  {certificates.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                      Complete 100% of recorded lectures in an enrolled course to unlock &amp; print your official certificate signed by Prof. {settings.directorName}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {certificates.map((cert) => (
                        <div key={cert.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 space-y-3">
                          <p className="text-xs font-mono text-blue-700 dark:text-sky-400">{cert.certificateNo}</p>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cert.courseTitle}</h3>
                          <p className="text-xs text-slate-500">Issued on {cert.issuedAt} · {cert.completionPercent}% Completed</p>
                          <button
                            type="button"
                            onClick={() =>
                              exportHtmlToPrintPdf(
                                `Certificate — ${cert.certificateNo}`,
                                `<div style="border:4px solid #1d4ed8;padding:32px;text-align:center;">
                                   <h1>THE ZONE OF CHEMISTRY</h1>
                                   <p>Station Road / Chandmari, Motihari, Bihar</p>
                                   <h2>Certificate of Completion</h2>
                                   <p>This certifies that <strong>${cert.studentName}</strong> (${cert.admissionId || 'Student'}) has successfully completed</p>
                                   <h3>${cert.courseTitle}</h3>
                                   <p>Issued: ${cert.issuedAt} · Certificate No: ${cert.certificateNo}</p>
                                   <p style="margin-top:32px;"><strong>Prof. ${cert.directorName}</strong><br/>Director &amp; Chief Chemistry Mentor</p>
                                 </div>`
                              )
                            }
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Printer className="w-4 h-4" /> Print Certificate
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TIMETABLE & NOTIFICATIONS */}
              {tab === 'timetable' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Class Timetable &amp; Notifications</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Batch Schedule</h3>
                      <div className="space-y-3">
                        {timetable.map((t) => (
                          <div key={t.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm">
                            <p className="text-xs text-blue-700 dark:text-sky-400 font-semibold">
                              {t.eventType} · {t.date || t.dayOfWeek} · {t.startTime} – {t.endTime}
                            </p>
                            <p className="font-bold text-slate-900 dark:text-white">{t.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{t.batchName} · {t.room}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Live Notifications</h3>
                      <div className="space-y-3">
                        {notifications.map((n) => (
                          <div key={n.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{n.type} · {n.createdAt.slice(0, 10)}</p>
                            <p className="font-semibold text-slate-900 dark:text-white">{n.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PROFILE */}
              {tab === 'profile' && (
                <div className="max-w-xl space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Student Profile</h2>
                      {(student?.admissionId || userProfile?.studentId) && (
                        <span className="text-xs font-mono font-bold text-blue-700 dark:text-sky-400">
                          {student?.admissionId || userProfile?.studentId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-200 dark:border-slate-700 bg-slate-100 shrink-0">
                        <ResilientImage
                          src={profileForm.photoUrl}
                          alt="Profile"
                          fallbackTitle={(profileForm.name || 'S').slice(0, 2).toUpperCase()}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <label className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl cursor-pointer">
                          <ImagePlus className="w-4 h-4" />
                          {uploading ? 'Updating...' : 'Choose Photo from Gallery'}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setCropFile(f);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Original ratio preserved · optional crop available</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                          <input
                            type="tel"
                            value={profileForm.mobile}
                            onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={profileForm.dob}
                            onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Exam Goal</label>
                          <select
                            value={profileForm.examGoal}
                            onChange={(e) => setProfileForm({ ...profileForm, examGoal: e.target.value as ExamTrack })}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                          >
                            <option value="Class 11 Chemistry">Class 11 Chemistry</option>
                            <option value="Class 12 Chemistry">Class 12 Chemistry</option>
                            <option value="12th IIT-JEE">12th IIT-JEE</option>
                            <option value="12th NEET">12th NEET</option>
                            <option value="Dropper Chemistry">Dropper Chemistry</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Class</label>
                          <select
                            value={profileForm.studentClass}
                            onChange={(e) => setProfileForm({ ...profileForm, studentClass: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                          >
                            <option value="Class 11">Class 11</option>
                            <option value="Class 12">Class 12</option>
                            <option value="Dropper">Dropper</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Board</label>
                          <select
                            value={profileForm.board}
                            onChange={(e) => setProfileForm({ ...profileForm, board: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                          >
                            <option value="CBSE">CBSE</option>
                            <option value="Bihar Board (BSEB)">Bihar Board (BSEB)</option>
                            <option value="ICSE / ISC">ICSE / ISC</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                        <input
                          type="text"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Change Password (Optional, min 6 chars)</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Leave blank to keep current password"
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1">
                        <button type="submit" className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl">
                          Save Profile Changes
                        </button>
                        <button
                          type="button"
                          onClick={triggerIntroReplay}
                          className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-slate-800 rounded-xl"
                        >
                          Replay Intro Animation
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Account Deletion Request */}
                  <form onSubmit={handleAccountDeletionRequest} className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" /> Request Account Deletion
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Need your student account removed from the portal? Submit a deletion request to Institute Admin.
                    </p>
                    <input
                      type="text"
                      required
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      placeholder="Reason for deletion request..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                    />
                    <button type="submit" className="min-h-[40px] px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-bold">
                      Submit Deletion Request
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* In-App PDF / Material Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-3 sm:p-6" onClick={() => setPreviewMaterial(null)}>
          <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-700 dark:text-sky-400">{previewMaterial.category}</p>
                <h3 className="text-sm font-bold truncate">{previewMaterial.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewMaterial.fileUrl}
                  download={previewMaterial.title}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button type="button" onClick={() => setPreviewMaterial(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              title={previewMaterial.title}
              src={previewMaterial.fileUrl}
              className="flex-1 w-full border-0 bg-slate-100 dark:bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  );
}
