import React, { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  Ban,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ResilientImage } from './ResilientImage.tsx';
import { BackBar } from './BackBar.tsx';
import { ImageCropModal } from './ImageCropModal.tsx';
import { uploadDirectMediaToServer, uploadMediaFile } from '../lib/mediaUpload.ts';
import { downloadCsv, downloadExcel, downloadJsonBackup, exportHtmlToPrintPdf } from '../lib/exportUtils.ts';
import {
  addDocument,
  createAdminStudent,
  createAdminTeacher,
  decideAdmission,
  deleteAdminTeacher,
  exportFullBackupFromFirestore,
  fetchAdminOverviewData,
  logAdminActivity,
  publishPosterTarget,
  recordFeePaymentInFirestore,
  removeDocument,
  replyToStudentDoubt,
  saveBatchAttendance,
  sendTargetedNotification,
  setDocument,
  setStudentBlockStatus,
  updateAdminTeacher,
  updateUserRoleBySuperAdmin,
} from '../lib/firestoreService.ts';
import type {
  AdminActivityLog,
  AdmissionApplication,
  AttendanceRecord,
  BannerItem,
  Batch,
  Course,
  DeletionRequest,
  DoubtItem,
  Enquiry,
  ExamTrack,
  FeeRecord,
  GalleryItem,
  InstituteResult,
  InstituteSettings,
  LiveClass,
  LoginSessionRecord,
  Notice,
  NotificationItem,
  OrderRecord,
  PaymentRecord,
  PosterItem,
  PosterTargetType,
  RecordedLecture,
  StudentActivityRecord,
  StudentRecord,
  StudyMaterial,
  StudyMaterialCategory,
  TeacherRecord,
  TestItem,
  TimetableSlot,
  UserProfile,
} from '../types.ts';

type AdminTab =
  | 'overview'
  | 'admissions'
  | 'students'
  | 'analytics'
  | 'teachers'
  | 'courses'
  | 'posters'
  | 'attendance'
  | 'fees'
  | 'learning'
  | 'notices'
  | 'gallery'
  | 'cms';

const POSTER_TARGETS: PosterTargetType[] = [
  'Course Poster',
  'Teacher Poster',
  'Teacher Profile Photo',
  'Homepage Banner',
  'Batch Poster',
  'Test Series Poster',
  'Study Material Cover',
  'Student Profile Photo',
  'Gallery Image',
  'Notice Image',
  'Institute Logo',
];

const EXAM_TRACKS: ExamTrack[] = [
  'Class 11 Chemistry',
  'Class 12 Chemistry',
  '12th IIT-JEE',
  '12th NEET',
  'Dropper Chemistry',
];

const MATERIAL_CATEGORIES: StudyMaterialCategory[] = [
  'Chemistry Notes',
  'PDF Notes',
  'NCERT Notes',
  'Important Questions',
  'PYQ',
  'Previous Year Questions',
  'Assignment',
  'Worksheet',
  'Test Paper',
  'Answer Key',
  'DPP',
  'Practice Questions',
  'Mock Test',
  'Revision Material',
];

export function AdminDashboard() {
  const { firebaseUser, authReady, role, idToken, settings: liveSettings, showToast, logout, navigate } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Image modal state (defaults to Full Original Ratio / No Crop)
  const [cropState, setCropState] = useState<{
    file: File;
    aspect: '16:9' | '4:3' | '1:1';
    onDone: (dataUrl: string) => void | Promise<void>;
  } | null>(null);

  // Admin overview state
  const [admissions, setAdmissions] = useState<AdmissionApplication[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [posters, setPosters] = useState<PosterItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [lectures, setLectures] = useState<RecordedLecture[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [results, setResults] = useState<InstituteResult[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [studentActivity, setStudentActivity] = useState<StudentActivityRecord[]>([]);
  const [loginSessions, setLoginSessions] = useState<LoginSessionRecord[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cmsForm, setCmsForm] = useState<InstituteSettings>(liveSettings);

  // Filters & Action states
  const [searchQ, setSearchQ] = useState('');
  const [admFilter, setAdmFilter] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected'>('all');
  const [admRemarkMap, setAdmRemarkMap] = useState<Record<string, string>>({});

  // Block / Unblock modal state
  const [blockingStudent, setBlockingStudent] = useState<StudentRecord | null>(null);
  const [blockType, setBlockType] = useState<'temporary' | 'permanent'>('temporary');
  const [blockedUntil, setBlockedUntil] = useState(() => new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10));
  const [blockReason, setBlockReason] = useState('');

  // Quick Add Student
  const [newStudent, setNewStudent] = useState({
    name: '',
    fatherName: '',
    email: '',
    mobile: '',
    studentClass: 'Class 12',
    board: 'CBSE',
    courseId: '',
    batchId: '',
    totalFees: '12000',
  });

  // Teacher Create/Edit
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    phone: '',
    qualification: '',
    subjects: 'Organic Chemistry',
    experience: '',
    description: '',
    photoUrl: '',
    posterUrl: '',
    assignedBatches: [] as string[],
    assignedCourses: [] as string[],
  });

  // Course Create/Edit
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    category: 'NEET',
    examTrack: '12th NEET' as ExamTrack,
    description: '',
    duration: '12 Months',
    fees: '4500',
    mrpPrice: '6000',
    discountPercent: '25',
    statusLabel: 'New Batch',
    subjects: 'Physical, Organic & Inorganic Chemistry',
    batchAvailability: 'Morning & Online Batch',
    liveSchedule: 'Mon - Sat · 07:00 AM',
    teacherName: 'S. K. Srivastav',
    syllabusText: '',
    chaptersText: '',
    imageUrl: '',
  });

  // Batch Create/Edit
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [batchForm, setBatchForm] = useState({
    name: '',
    timing: '',
    mode: 'Offline' as 'Offline' | 'Online' | 'Hybrid',
    category: 'Class 12',
    courseId: '',
    teacherName: 'S. K. Srivastav',
    capacity: '60',
    fees: '12000',
    days: 'Mon - Sat',
    posterUrl: '',
  });

  // Lecture & Material CRUD inside Courses & LMS tab
  const [courseSubTab, setCourseSubTab] = useState<'courses' | 'batches' | 'lectures' | 'materials'>('courses');
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [lectureForm, setLectureForm] = useState({
    title: '',
    description: '',
    courseId: '',
    batchId: '',
    chapter: '',
    lectureNumber: '1',
    duration: '45 mins',
    videoSource: 'youtube' as 'youtube' | 'direct',
    videoUrl: '',
    protectedMediaId: '',
    thumbnailUrl: '',
    isFreePreview: false,
    published: true,
  });

  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({
    title: '',
    category: 'Chemistry Notes' as StudyMaterialCategory,
    courseId: '',
    batchId: '',
    chapter: '',
    description: '',
    fileUrl: '',
    coverUrl: '',
    published: true,
  });

  // Posters & Banners
  const [posterForm, setPosterForm] = useState({
    id: '',
    title: '',
    category: 'Chemistry Batches',
    targetType: 'Course Poster' as PosterTargetType,
    targetId: '',
    imageUrl: '',
    published: true,
  });

  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    ctaLabel: 'Explore Courses',
    ctaPath: '/courses',
    imageUrl: '',
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    sortOrder: '1',
    published: true,
  });

  // Attendance, Fees, Learning, Notices, Results, Gallery
  const [attBatchId, setAttBatchId] = useState('');
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attMap, setAttMap] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Leave'>>({});
  const [payForm, setPayForm] = useState({ feeRecordId: '', amount: '', mode: 'Cash', referenceId: '' });

  const [newNotice, setNewNotice] = useState({ title: '', category: 'Important Announcement', content: '', important: true, imageUrl: '' });
  const [targetNotif, setTargetNotif] = useState({
    title: '',
    message: '',
    type: 'notice' as NotificationItem['type'],
    targetType: 'all' as NotificationItem['targetType'],
    targetId: '',
    targetUid: '',
  });
  const [newTopper, setNewTopper] = useState({ studentName: '', examName: '', achievement: '', marksOrRank: '', year: '2026', photoUrl: '' });
  const [newGalleryMeta, setNewGalleryMeta] = useState({ title: '', category: 'Classroom', album: 'Motihari Campus', featured: false });

  const [newSlot, setNewSlot] = useState({
    title: '',
    eventType: 'Daily Class',
    dayOfWeek: 'Monday',
    date: '',
    startTime: '07:00 AM',
    endTime: '08:30 AM',
    batchName: 'Morning Batch',
    room: 'Hall A',
  });

  const [newLiveClass, setNewLiveClass] = useState({
    title: '',
    subject: 'Organic Chemistry',
    chapter: '',
    courseId: '',
    batchId: '',
    teacherName: 'S. K. Srivastav',
    platform: 'Google Meet' as LiveClass['platform'],
    joinUrl: '',
    scheduledAt: '',
    durationMinutes: '60',
    status: 'Upcoming' as LiveClass['status'],
  });

  const [newTest, setNewTest] = useState({
    title: '',
    testType: 'Online MCQ',
    subject: 'Organic Chemistry',
    courseId: '',
    batchId: '',
    date: '',
    durationMinutes: '30',
    maxMarks: '40',
    instructions: 'Attempt all questions carefully.',
    posterUrl: '',
  });

  const [doubtReplyMap, setDoubtReplyMap] = useState<Record<string, string>>({});

  async function loadAdminOverview() {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const d = await fetchAdminOverviewData();
      setAdmissions(d.admissions || []);
      setStudents(d.students || []);
      setTeachers(d.teachers || []);
      setCourses(d.courses || []);
      setBatches(d.batches || []);
      setPosters(d.posters || []);
      setBanners(d.banners || []);
      setOrders(d.orders || []);
      setAttendance(d.attendance || []);
      setFeeRecords(d.fee_records || []);
      setPayments(d.payments || []);
      setLiveClasses(d.live_classes || []);
      setLectures(d.recorded_lectures || []);
      setMaterials(d.study_materials || []);
      setTests(d.tests || []);
      setNotices(d.notices || []);
      setNotifications(d.notifications || []);
      setGallery(d.gallery || []);
      setResults(d.results || []);
      setTimetable(d.timetable || []);
      setEnquiries(d.enquiries || []);
      setDoubts(d.doubts || []);
      setStudentActivity(d.student_activity || []);
      setLoginSessions(d.login_sessions || []);
      setDeletionRequests(d.deletion_requests || []);
      setLogs(d.admin_activity_logs || []);
      setUsers(d.users || []);
      if (d.settings) setCmsForm(d.settings);
      if (d.batches?.[0]?.id && !attBatchId) setAttBatchId(d.batches[0].id);
    } catch (err: any) {
      showToast(err.message || 'Failed to load admin overview', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authReady && firebaseUser && firebaseUser.emailVerified && (role === 'super_admin' || role === 'admin')) {
      loadAdminOverview();
    } else {
      setLoading(false);
    }
  }, [authReady, firebaseUser?.uid, firebaseUser?.emailVerified, role]);

  if (!authReady || !firebaseUser || !firebaseUser.emailVerified || (role !== 'super_admin' && role !== 'admin')) {
    return (
      <div className="min-h-[75vh] bg-slate-50 dark:bg-slate-950 flex flex-col">
        <BackBar title="Restricted Access" backLabel="Back" fallbackPath="/" />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <Shield className="w-10 h-10 text-red-700 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Admin Panel — Admins Only</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            {firebaseUser
              ? 'Your account does not hold verified administrator permissions.'
              : 'This dashboard is restricted to verified institute administrators only.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(firebaseUser ? '/' : '/admin-login')}
            className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl"
          >
            {firebaseUser ? 'Back to Home' : 'Admin Login'}
          </button>
        </div>
      </div>
    );
  }

  const actorEmail = firebaseUser.email || 'admin';
  const actorRole = role || 'admin';

  // KPI Metrics
  const nowMs = Date.now();
  const onlineNowCount = studentActivity.filter(
    (s) => s.isOnline && s.lastActive && nowMs - new Date(s.lastActive).getTime() < 10 * 60_000
  ).length;
  const pendingAdmissionsCount = admissions.filter((a) => a.status === 'pending' || a.status === 'under_review').length;
  const openDoubtsCount = doubts.filter((d) => d.status === 'Open').length;
  const totalRevenueCollected = payments
    .filter((p) => p.paymentStatus !== 'REFUNDED' && p.refundStatus !== 'Refunded')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPendingFees = feeRecords.reduce((sum, f) => {
    const net = Math.max(0, Number(f.totalFees || 0) - Number(f.discount || 0) - Number(f.scholarship || 0) + Number(f.lateFee || 0));
    return sum + Math.max(0, net - Number(f.paidAmount || 0));
  }, 0);

  function openCropPicker(
    e: React.ChangeEvent<HTMLInputElement>,
    aspect: '16:9' | '4:3' | '1:1',
    onDone: (dataUrl: string) => void | Promise<void>
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCropState({ file, aspect, onDone });
  }

  // Admissions Actions
  async function handleAdmissionDecision(adm: AdmissionApplication, decision: 'approved' | 'rejected' | 'pending' | 'under_review') {
    try {
      const customMsg = admRemarkMap[adm.id]?.trim();
      await decideAdmission(adm, decision, actorEmail, actorRole, customMsg);
      showToast(`Application marked ${decision.replace('_', ' ')}.`, 'success');
      setAdmRemarkMap((prev) => ({ ...prev, [adm.id]: '' }));
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to process admission', 'error');
    }
  }

  // Student Actions
  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    try {
      const c = courses.find((x) => x.id === newStudent.courseId) || courses[0];
      const b = batches.find((x) => x.id === newStudent.batchId) || batches[0];
      await createAdminStudent(
        {
          ...newStudent,
          courseId: c?.id || '',
          courseName: c?.title || 'Chemistry',
          batchId: b?.id || '',
          batchName: b?.name || 'Morning Batch',
        },
        actorEmail,
        actorRole
      );
      showToast('Student added successfully.', 'success');
      setNewStudent({ name: '', fatherName: '', email: '', mobile: '', studentClass: 'Class 12', board: 'CBSE', courseId: '', batchId: '', totalFees: '12000' });
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to add student', 'error');
    }
  }

  async function toggleStudentStatus(s: StudentRecord) {
    const next = s.status === 'active' ? 'inactive' : 'active';
    await setDocument('students', s.id, { status: next });
    showToast(`Student marked ${next}.`, 'info');
    loadAdminOverview();
  }

  async function handleConfirmBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockingStudent) return;
    try {
      await setStudentBlockStatus(
        blockingStudent,
        {
          block: true,
          blockType,
          blockReason: blockReason.trim() || 'Restricted by Institute Office',
          blockedUntil: blockType === 'temporary' ? blockedUntil : '',
        },
        actorEmail,
        actorRole
      );
      showToast(`${blockingStudent.name} blocked (${blockType}).`, 'success');
      setBlockingStudent(null);
      setBlockReason('');
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Block update failed', 'error');
    }
  }

  async function handleUnblockStudent(s: StudentRecord) {
    try {
      await setStudentBlockStatus(s, { block: false }, actorEmail, actorRole);
      showToast(`${s.name} unblocked and restored.`, 'success');
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to unblock student', 'error');
    }
  }

  async function deleteStudent(id: string) {
    await removeDocument('students', id);
    await logAdminActivity(actorEmail, actorRole, 'Deleted Student', id);
    showToast('Student deleted.', 'info');
    loadAdminOverview();
  }

  // Teacher Actions
  function startEditTeacher(t: TeacherRecord) {
    setEditingTeacherId(t.id);
    setTeacherForm({
      name: t.name || '',
      email: t.email || '',
      phone: t.phone || '',
      qualification: t.qualification || '',
      subjects: t.subjects || '',
      experience: t.experience || '',
      description: t.description || '',
      photoUrl: t.photoUrl || '',
      posterUrl: t.posterUrl || '',
      assignedBatches: t.assignedBatches || [],
      assignedCourses: t.assignedCourses || [],
    });
  }

  function resetTeacherForm() {
    setEditingTeacherId(null);
    setTeacherForm({
      name: '',
      email: '',
      phone: '',
      qualification: '',
      subjects: 'Organic Chemistry',
      experience: '',
      description: '',
      photoUrl: '',
      posterUrl: '',
      assignedBatches: [],
      assignedCourses: [],
    });
  }

  function toggleTeacherBatch(batchId: string) {
    setTeacherForm((prev) => ({
      ...prev,
      assignedBatches: prev.assignedBatches.includes(batchId)
        ? prev.assignedBatches.filter((x) => x !== batchId)
        : [...prev.assignedBatches, batchId],
    }));
  }

  function toggleTeacherCourse(courseId: string) {
    setTeacherForm((prev) => ({
      ...prev,
      assignedCourses: prev.assignedCourses.includes(courseId)
        ? prev.assignedCourses.filter((x) => x !== courseId)
        : [...prev.assignedCourses, courseId],
    }));
  }

  async function handleSaveTeacher(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingTeacherId) {
        await updateAdminTeacher(
          editingTeacherId,
          {
            name: teacherForm.name,
            email: teacherForm.email,
            phone: teacherForm.phone,
            qualification: teacherForm.qualification,
            subjects: teacherForm.subjects,
            experience: teacherForm.experience,
            description: teacherForm.description,
            photoUrl: teacherForm.photoUrl,
            posterUrl: teacherForm.posterUrl,
            assignedBatches: teacherForm.assignedBatches,
            assignedCourses: teacherForm.assignedCourses,
            active: true,
          },
          actorEmail,
          actorRole
        );
        showToast('Teacher profile & assigned batches updated!', 'success');
      } else {
        await createAdminTeacher(
          {
            name: teacherForm.name,
            email: teacherForm.email,
            phone: teacherForm.phone,
            qualification: teacherForm.qualification,
            subjects: teacherForm.subjects,
            experience: teacherForm.experience,
            description: teacherForm.description,
            photoUrl: teacherForm.photoUrl,
            posterUrl: teacherForm.posterUrl,
            assignedBatches: teacherForm.assignedBatches,
            assignedCourses: teacherForm.assignedCourses,
          },
          actorEmail,
          actorRole
        );
        showToast('Teacher account created and published.', 'success');
      }
      resetTeacherForm();
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save teacher', 'error');
    }
  }

  // Course CRUD
  function startEditCourse(c: Course) {
    setEditingCourseId(c.id);
    setCourseForm({
      title: c.title || '',
      category: c.category || 'NEET',
      examTrack: (c.examTrack || '12th NEET') as ExamTrack,
      description: c.description || '',
      duration: c.duration || '12 Months',
      fees: String(c.fees ?? 4500),
      mrpPrice: String(c.mrpPrice ?? c.fees ?? 6000),
      discountPercent: String(c.discountPercent ?? 0),
      statusLabel: c.statusLabel || 'Active Batch',
      subjects: c.subjects || '',
      batchAvailability: c.batchAvailability || '',
      liveSchedule: c.liveSchedule || '',
      teacherName: c.teacherName || 'S. K. Srivastav',
      syllabusText: (c.syllabus || []).join('\n'),
      chaptersText: (c.chapters || []).join('\n'),
      imageUrl: c.imageUrl || '',
    });
  }

  function resetCourseForm() {
    setEditingCourseId(null);
    setCourseForm({
      title: '',
      category: 'NEET',
      examTrack: '12th NEET',
      description: '',
      duration: '12 Months',
      fees: '4500',
      mrpPrice: '6000',
      discountPercent: '25',
      statusLabel: 'New Batch',
      subjects: 'Physical, Organic & Inorganic Chemistry',
      batchAvailability: 'Morning & Online Batch',
      liveSchedule: 'Mon - Sat · 07:00 AM',
      teacherName: 'S. K. Srivastav',
      syllabusText: '',
      chaptersText: '',
      imageUrl: '',
    });
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    try {
      const syllabus = courseForm.syllabusText.split('\n').map((s) => s.trim()).filter(Boolean);
      const chapters = courseForm.chaptersText.split('\n').map((s) => s.trim()).filter(Boolean);
      const payload = {
        title: courseForm.title.trim(),
        category: courseForm.category.trim(),
        examTrack: courseForm.examTrack,
        description: courseForm.description.trim(),
        duration: courseForm.duration.trim(),
        fees: Number(courseForm.fees || 0),
        mrpPrice: Number(courseForm.mrpPrice || courseForm.fees || 0),
        discountPercent: Number(courseForm.discountPercent || 0),
        statusLabel: courseForm.statusLabel.trim(),
        subjects: courseForm.subjects.trim(),
        batchAvailability: courseForm.batchAvailability.trim(),
        liveSchedule: courseForm.liveSchedule.trim(),
        teacherName: courseForm.teacherName.trim(),
        syllabus,
        chapters,
        imageUrl: courseForm.imageUrl,
        published: true,
      };

      if (editingCourseId) {
        await setDocument('courses', editingCourseId, payload);
        await logAdminActivity(actorEmail, actorRole, 'Updated Course', courseForm.title);
        showToast('Course updated live!', 'success');
      } else {
        const courseId = await addDocument('courses', {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        if (courseForm.imageUrl && courseId) {
          await publishPosterTarget({
            title: courseForm.title,
            category: courseForm.category,
            targetType: 'Course Poster',
            targetId: courseId,
            imageUrl: courseForm.imageUrl,
            published: true,
            createdAt: new Date().toISOString(),
          });
        }
        await logAdminActivity(actorEmail, actorRole, 'Created Course', courseForm.title);
        showToast('Course published!', 'success');
      }
      resetCourseForm();
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save course', 'error');
    }
  }

  // Batch CRUD
  function startEditBatch(b: Batch) {
    setEditingBatchId(b.id);
    setBatchForm({
      name: b.name || '',
      timing: b.timing || '',
      mode: b.mode || 'Offline',
      category: b.category || 'Class 12',
      courseId: b.courseId || '',
      teacherName: b.teacherName || 'S. K. Srivastav',
      capacity: String(b.capacity || 60),
      fees: String(b.fees || 12000),
      days: b.days || 'Mon - Sat',
      posterUrl: b.posterUrl || '',
    });
  }

  function resetBatchForm() {
    setEditingBatchId(null);
    setBatchForm({
      name: '',
      timing: '',
      mode: 'Offline',
      category: 'Class 12',
      courseId: '',
      teacherName: 'S. K. Srivastav',
      capacity: '60',
      fees: '12000',
      days: 'Mon - Sat',
      posterUrl: '',
    });
  }

  async function handleSaveBatch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const c = courses.find((x) => x.id === batchForm.courseId) || courses[0];
      const payload = {
        ...batchForm,
        capacity: Number(batchForm.capacity || 60),
        fees: Number(batchForm.fees || 12000),
        courseId: c?.id || '',
        courseName: c?.title || 'Chemistry',
      };
      if (editingBatchId) {
        await setDocument('batches', editingBatchId, payload);
        await logAdminActivity(actorEmail, actorRole, 'Updated Batch', batchForm.name);
        showToast('Batch updated.', 'success');
      } else {
        await addDocument('batches', { ...payload, enrolledCount: 0 });
        await logAdminActivity(actorEmail, actorRole, 'Created Batch', batchForm.name);
        showToast('Batch created.', 'success');
      }
      resetBatchForm();
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save batch', 'error');
    }
  }

  // Recorded Lecture CRUD
  function startEditLecture(l: RecordedLecture) {
    setEditingLectureId(l.id);
    setLectureForm({
      title: l.title || '',
      description: l.description || '',
      courseId: l.courseId || '',
      batchId: l.batchId || '',
      chapter: l.chapter || '',
      lectureNumber: String(l.lectureNumber || 1),
      duration: l.duration || '45 mins',
      videoSource: l.videoSource || (l.platform === 'Direct' ? 'direct' : 'youtube'),
      videoUrl: l.videoUrl || '',
      protectedMediaId: l.protectedMediaId || '',
      thumbnailUrl: l.thumbnailUrl || '',
      isFreePreview: Boolean(l.isFreePreview),
      published: l.published !== false,
    });
  }

  function resetLectureForm() {
    setEditingLectureId(null);
    setLectureForm({
      title: '',
      description: '',
      courseId: '',
      batchId: '',
      chapter: '',
      lectureNumber: '1',
      duration: '45 mins',
      videoSource: 'youtube',
      videoUrl: '',
      protectedMediaId: '',
      thumbnailUrl: '',
      isFreePreview: false,
      published: true,
    });
  }

  async function handleUploadDirectVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!idToken) {
      showToast('Admin session token missing. Please re-login.', 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadDirectMediaToServer(file, idToken, lectureForm.courseId || '');
      setLectureForm((prev) => ({
        ...prev,
        videoSource: 'direct',
        videoUrl: res.streamUrl,
        protectedMediaId: res.mediaId,
      }));
      showToast('Lecture video uploaded to protected storage!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Video upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveLecture(e: React.FormEvent) {
    e.preventDefault();
    try {
      const c = courses.find((x) => x.id === lectureForm.courseId) || courses[0];
      const payload = {
        title: lectureForm.title.trim(),
        description: lectureForm.description.trim(),
        courseId: c?.id || '',
        courseName: c?.title || 'Chemistry',
        batchId: lectureForm.batchId || batches[0]?.id || '',
        chapter: lectureForm.chapter.trim() || 'Organic Chemistry',
        lectureNumber: Number(lectureForm.lectureNumber || 1),
        duration: lectureForm.duration.trim(),
        videoSource: lectureForm.videoSource,
        videoUrl: lectureForm.videoUrl.trim(),
        protectedMediaId: lectureForm.protectedMediaId,
        thumbnailUrl: lectureForm.thumbnailUrl,
        isFreePreview: lectureForm.isFreePreview,
        published: lectureForm.published,
        platform: lectureForm.videoSource === 'direct' ? 'Direct' : 'YouTube',
        publishDate: new Date().toISOString().slice(0, 10),
      };
      if (editingLectureId) {
        await setDocument('recorded_lectures', editingLectureId, payload);
        showToast('Lecture updated!', 'success');
      } else {
        await addDocument('recorded_lectures', payload);
        showToast('Lecture added to course!', 'success');
      }
      resetLectureForm();
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save lecture', 'error');
    }
  }

  // Study Material CRUD
  function startEditMaterial(m: StudyMaterial) {
    setEditingMaterialId(m.id);
    setMaterialForm({
      title: m.title || '',
      category: m.category || 'Chemistry Notes',
      courseId: m.courseId || '',
      batchId: m.batchId || '',
      chapter: m.chapter || '',
      description: m.description || '',
      fileUrl: m.fileUrl || '',
      coverUrl: m.coverUrl || '',
      published: m.published !== false,
    });
  }

  function resetMaterialForm() {
    setEditingMaterialId(null);
    setMaterialForm({
      title: '',
      category: 'Chemistry Notes',
      courseId: '',
      batchId: '',
      chapter: '',
      description: '',
      fileUrl: '',
      coverUrl: '',
      published: true,
    });
  }

  async function handleUploadMaterialPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!idToken) {
      showToast('Admin session token missing. Please re-login.', 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadDirectMediaToServer(file, idToken, materialForm.courseId || '');
      setMaterialForm((prev) => ({ ...prev, fileUrl: res.streamUrl }));
      showToast('PDF / Document uploaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Document upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveMaterial(e: React.FormEvent) {
    e.preventDefault();
    try {
      const c = courses.find((x) => x.id === materialForm.courseId) || courses[0];
      const payload = {
        title: materialForm.title.trim(),
        category: materialForm.category,
        courseId: c?.id || '',
        courseName: c?.title || 'Chemistry',
        batchId: materialForm.batchId || batches[0]?.id || '',
        chapter: materialForm.chapter.trim() || 'General',
        description: materialForm.description.trim(),
        fileUrl: materialForm.fileUrl.trim(),
        coverUrl: materialForm.coverUrl,
        published: materialForm.published,
        uploadedBy: actorEmail,
        createdAt: new Date().toISOString(),
      };
      if (editingMaterialId) {
        await setDocument('study_materials', editingMaterialId, payload);
        showToast('Study material updated!', 'success');
      } else {
        await addDocument('study_materials', payload);
        showToast('Study material published!', 'success');
      }
      resetMaterialForm();
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save material', 'error');
    }
  }

  // Banner CRUD
  async function handleSaveBanner(e: React.FormEvent) {
    e.preventDefault();
    if (!bannerForm.imageUrl) {
      showToast('Please select a banner image first.', 'error');
      return;
    }
    try {
      const payload = {
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim(),
        ctaLabel: bannerForm.ctaLabel.trim() || 'Explore Courses',
        ctaPath: bannerForm.ctaPath.trim() || '/courses',
        imageUrl: bannerForm.imageUrl,
        startDate: bannerForm.startDate || '2026-01-01',
        endDate: bannerForm.endDate || '2027-12-31',
        sortOrder: Number(bannerForm.sortOrder || 1),
        published: bannerForm.published,
      };
      if (editingBannerId) {
        await setDocument('banners', editingBannerId, payload);
        showToast('Homepage banner updated!', 'success');
      } else {
        await addDocument('banners', { ...payload, createdAt: new Date().toISOString() });
        showToast('Homepage banner published!', 'success');
      }
      setEditingBannerId(null);
      setBannerForm({
        title: '',
        subtitle: '',
        ctaLabel: 'Explore Courses',
        ctaPath: '/courses',
        imageUrl: '',
        startDate: '2026-01-01',
        endDate: '2027-12-31',
        sortOrder: '1',
        published: true,
      });
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save banner', 'error');
    }
  }

  // Poster Studio Save
  async function handleSavePoster(e: React.FormEvent) {
    e.preventDefault();
    if (!posterForm.imageUrl) {
      showToast('Select an image from gallery first.', 'error');
      return;
    }
    try {
      await publishPosterTarget(
        {
          title: posterForm.title,
          category: posterForm.category,
          targetType: posterForm.targetType,
          targetId: posterForm.targetId,
          imageUrl: posterForm.imageUrl,
          published: posterForm.published,
          createdAt: new Date().toISOString(),
        },
        posterForm.id || undefined
      );

      if (posterForm.targetType === 'Gallery Image') {
        await addDocument('gallery', {
          title: posterForm.title,
          category: 'Events',
          album: posterForm.category || 'Motihari Campus',
          imageUrl: posterForm.imageUrl,
          published: posterForm.published,
          featured: true,
          createdAt: new Date().toISOString(),
        });
      }

      if (posterForm.targetType === 'Student Profile Photo' && posterForm.targetId) {
        await setDocument('students', posterForm.targetId, { photoUrl: posterForm.imageUrl });
      }

      await logAdminActivity(actorEmail, actorRole, 'Published Poster / Banner', `${posterForm.targetType}: ${posterForm.title}`);
      showToast(`Saved & applied to ${posterForm.targetType}!`, 'success');
      setPosterForm({
        id: '',
        title: '',
        category: 'Chemistry Batches',
        targetType: 'Course Poster',
        targetId: '',
        imageUrl: '',
        published: true,
      });
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save poster', 'error');
    }
  }

  // Attendance
  async function handleSaveAttendance() {
    try {
      const b = batches.find((x) => x.id === attBatchId);
      const batchStudents = students.filter((s) => !attBatchId || s.batchId === attBatchId);
      const records = batchStudents.map((s) => ({
        studentId: s.id,
        studentUid: s.uid || '',
        studentName: s.name,
        admissionId: s.admissionId,
        status: attMap[s.id] || 'Present',
      }));
      await saveBatchAttendance(attBatchId, b?.name || '', attDate, records, actorEmail, actorRole);
      showToast(`Attendance recorded for ${records.length} students.`, 'success');
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save attendance', 'error');
    }
  }

  // Fees & Refunds
  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const fee = feeRecords.find((f) => f.id === payForm.feeRecordId);
      if (!fee) throw new Error('Select a valid student fee account');
      const receiptNo = await recordFeePaymentInFirestore(
        fee,
        Number(payForm.amount),
        payForm.mode as PaymentRecord['mode'],
        payForm.referenceId,
        actorEmail,
        actorRole
      );
      showToast(`Payment recorded! Receipt: ${receiptNo}`, 'success');
      setPayForm({ feeRecordId: '', amount: '', mode: 'Cash', referenceId: '' });
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
    }
  }

  async function handleUpdateOrderRefund(order: OrderRecord, refundStatus: 'None' | 'Requested' | 'Refunded') {
    try {
      await setDocument('orders', order.id, {
        refundStatus,
        updatedAt: new Date().toISOString(),
      });
      const linkedPayment = payments.find((p) => p.orderId === order.orderId || p.cashfreeOrderId === order.orderId);
      if (linkedPayment) {
        await setDocument('payments', linkedPayment.id, {
          refundStatus,
          paymentStatus: refundStatus === 'Refunded' ? 'REFUNDED' : 'PAID',
        });
      }
      await logAdminActivity(actorEmail, actorRole, 'Updated Order Refund', `${order.orderId} -> ${refundStatus}`);
      showToast(`Order ${order.orderId} refund status updated to ${refundStatus}.`, 'success');
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to update refund status', 'error');
    }
  }

  // Notices & Targeted Notifications & Toppers
  async function handlePublishNotice(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addDocument('notices', {
        ...newNotice,
        date: new Date().toISOString().slice(0, 10),
        published: true,
      });
      await logAdminActivity(actorEmail, actorRole, 'Published Notice', newNotice.title);
      showToast('Notice published live on website.', 'success');
      setNewNotice({ title: '', category: 'Important Announcement', content: '', important: true, imageUrl: '' });
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish notice', 'error');
    }
  }

  async function handleSendTargetedNotif(e: React.FormEvent) {
    e.preventDefault();
    try {
      await sendTargetedNotification(
        {
          title: targetNotif.title.trim(),
          message: targetNotif.message.trim(),
          type: targetNotif.type,
          targetType: targetNotif.targetType,
          targetId: targetNotif.targetType === 'batch' || targetNotif.targetType === 'course' ? targetNotif.targetId : '',
          targetUid: targetNotif.targetType === 'student' ? targetNotif.targetUid : '',
        },
        actorEmail
      );
      await logAdminActivity(actorEmail, actorRole, 'Sent Push Notification', `${targetNotif.targetType}: ${targetNotif.title}`);
      showToast('Notification dispatched live!', 'success');
      setTargetNotif({ title: '', message: '', type: 'notice', targetType: 'all', targetId: '', targetUid: '' });
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to send notification', 'error');
    }
  }

  async function handleAddTopper(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addDocument('results', newTopper);
      await logAdminActivity(actorEmail, actorRole, 'Added Topper Result', newTopper.studentName);
      showToast('Topper result published.', 'success');
      setNewTopper({ studentName: '', examName: '', achievement: '', marksOrRank: '', year: '2026', photoUrl: '' });
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to add topper', 'error');
    }
  }

  // Gallery upload
  async function handleMultiGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadMediaFile(file, idToken, { maxDimension: 1440, folder: 'gallery' });
        await addDocument('gallery', {
          title: newGalleryMeta.title || file.name.replace(/\.[^.]+$/, ''),
          category: newGalleryMeta.category,
          album: newGalleryMeta.album,
          featured: newGalleryMeta.featured,
          published: true,
          imageUrl: url,
          createdAt: new Date().toISOString(),
        });
      }
      await logAdminActivity(actorEmail, actorRole, 'Uploaded Gallery Photos', `${files.length} photo(s)`);
      showToast(`${files.length} photo(s) saved to cloud gallery!`, 'success');
      setNewGalleryMeta({ title: '', category: 'Classroom', album: 'Motihari Campus', featured: false });
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Gallery upload error', 'error');
    } finally {
      setUploading(false);
    }
  }

  // CMS & Backup
  async function handleSaveCms(e: React.FormEvent) {
    e.preventDefault();
    try {
      await setDocument('institute_settings', 'main', cmsForm);
      await logAdminActivity(actorEmail, actorRole, 'Updated Website CMS Settings', 'institute_settings/main');
      showToast('Website content & settings saved live!', 'success');
      loadAdminOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save website settings', 'error');
    }
  }

  async function handleDownloadBackup() {
    try {
      const data = await exportFullBackupFromFirestore(actorEmail);
      downloadJsonBackup(`zoc-backup-${new Date().toISOString().slice(0, 10)}.json`, data);
      showToast('Full database JSON backup downloaded.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Backup failed', 'error');
    }
  }

  function exportStudents(type: 'csv' | 'excel' | 'pdf') {
    const headers = ['Admission ID', 'Name', 'Father Name', 'Class', 'Board', 'Course', 'Batch', 'Mobile', 'Email', 'Status', 'Blocked'];
    const rows = students.map((s) => [
      s.admissionId,
      s.name,
      s.fatherName,
      s.studentClass,
      s.board,
      s.courseName,
      s.batchName,
      s.mobile,
      s.email,
      s.status,
      s.isBlocked ? `${s.blockType} (${s.blockReason || ''})` : 'No',
    ]);
    if (type === 'csv') downloadCsv('zoc-students', headers, rows);
    else if (type === 'excel') downloadExcel('zoc-students', 'Students', headers, rows);
    else {
      const tableRows = rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${c}</td>`).join('')}</tr>`).join('');
      exportHtmlToPrintPdf(
        'Student Directory Export',
        `<table style="width:100%;border-collapse:collapse;"><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:6px;font-size:11px;text-align:left;background:#f8fafc;">${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>`
      );
    }
  }

  const adminTabs: { id: AdminTab; label: string; desc: string; icon: React.ReactNode; count?: string }[] = [
    { id: 'overview', label: 'Dashboard', desc: 'Overview & KPIs', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'admissions', label: 'Admissions', desc: 'Review & enroll', icon: <UserPlus className="w-4 h-4" />, count: `${pendingAdmissionsCount} open` },
    { id: 'students', label: 'Students', desc: 'Block, IDs & deletions', icon: <Users className="w-4 h-4" />, count: `${students.length} total` },
    { id: 'analytics', label: 'Live Logins & Activity', desc: 'Online & study time', icon: <Activity className="w-4 h-4" />, count: `${onlineNowCount} online` },
    { id: 'teachers', label: 'Teachers', desc: 'Faculty & batches', icon: <GraduationCap className="w-4 h-4" />, count: `${teachers.length} faculty` },
    { id: 'courses', label: 'Courses, Lectures & PDFs', desc: 'Full LMS catalog', icon: <BookOpen className="w-4 h-4" />, count: `${courses.length} courses` },
    { id: 'posters', label: 'Posters & Banners', desc: 'Hero slider & posters', icon: <Sparkles className="w-4 h-4" />, count: `${banners.length} banners` },
    { id: 'attendance', label: 'Attendance', desc: 'Daily batch roll', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'fees', label: 'Fees, Orders & Refunds', desc: 'Cashfree & receipts', icon: <CreditCard className="w-4 h-4" />, count: `${orders.length} orders` },
    { id: 'learning', label: 'Tests, Live & Doubts', desc: 'Schedule & Q&A', icon: <Video className="w-4 h-4" />, count: `${openDoubtsCount} open` },
    { id: 'notices', label: 'Notices & Notifications', desc: 'Push alerts & toppers', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'gallery', label: 'Gallery Upload', desc: 'Multi-photo upload', icon: <ImagePlus className="w-4 h-4" />, count: `${gallery.length} photos` },
    { id: 'cms', label: 'Website CMS', desc: 'Logo, roles & JSON', icon: <Settings className="w-4 h-4" /> },
  ];

  const activeTabInfo = adminTabs.find((t) => t.id === tab);

  const filteredStudents = students.filter(
    (s) =>
      !searchQ.trim() ||
      s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      s.admissionId.toLowerCase().includes(searchQ.toLowerCase()) ||
      s.mobile.includes(searchQ) ||
      s.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  const filteredAdmissions = admissions.filter((a) => {
    const mStatus = admFilter === 'all' || a.status === admFilter;
    const mSearch =
      !searchQ.trim() ||
      a.fullName.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.admissionId.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.mobile.includes(searchQ);
    return mStatus && mSearch;
  });

  function renderTargetEntitySelect() {
    const t = posterForm.targetType;
    if (t === 'Course Poster') {
      return (
        <select value={posterForm.targetId} onChange={(e) => setPosterForm({ ...posterForm, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
          <option value="">Link to Course (Optional)</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      );
    }
    if (t === 'Batch Poster') {
      return (
        <select value={posterForm.targetId} onChange={(e) => setPosterForm({ ...posterForm, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
          <option value="">Link to Batch (Optional)</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      );
    }
    if (t === 'Teacher Poster' || t === 'Teacher Profile Photo') {
      return (
        <select value={posterForm.targetId} onChange={(e) => setPosterForm({ ...posterForm, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
          <option value="">Link to Teacher</option>
          {teachers.map((tr) => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
        </select>
      );
    }
    if (t === 'Test Series Poster') {
      return (
        <select value={posterForm.targetId} onChange={(e) => setPosterForm({ ...posterForm, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
          <option value="">Link to Test</option>
          {tests.map((ts) => <option key={ts.id} value={ts.id}>{ts.title}</option>)}
        </select>
      );
    }
    if (t === 'Study Material Cover') {
      return (
        <select value={posterForm.targetId} onChange={(e) => setPosterForm({ ...posterForm, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
          <option value="">Link to Study Material</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      );
    }
    if (t === 'Notice Image') {
      return (
        <select value={posterForm.targetId} onChange={(e) => setPosterForm({ ...posterForm, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
          <option value="">Link to Notice</option>
          {notices.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select>
      );
    }
    if (t === 'Student Profile Photo') {
      return (
        <select value={posterForm.targetId} onChange={(e) => setPosterForm({ ...posterForm, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
          <option value="">Link to Student</option>
          {students.map((st) => <option key={st.id} value={st.id}>{st.name} ({st.admissionId})</option>)}
        </select>
      );
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {cropState && (
        <ImageCropModal
          file={cropState.file}
          defaultAspect={cropState.aspect}
          onCancel={() => setCropState(null)}
          onConfirm={async (dataUrl) => {
            const cb = cropState.onDone;
            setCropState(null);
            await cb(dataUrl);
          }}
        />
      )}

      {/* Block Student Modal */}
      {blockingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleConfirmBlock} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" /> Block Student Access
              </h3>
              <button type="button" onClick={() => setBlockingStudent(null)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Blocking <strong>{blockingStudent.name}</strong> ({blockingStudent.admissionId}) immediately restricts portal, lecture, and test access.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['temporary', 'permanent'] as const).map((bt) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setBlockType(bt)}
                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold border capitalize ${
                    blockType === bt
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {bt} Block
                </button>
              ))}
            </div>
            {blockType === 'temporary' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Auto-Unblock Date</label>
                <input
                  type="date"
                  required
                  value={blockedUntil}
                  onChange={(e) => setBlockedUntil(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason Shown to Student</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Pending fee verification / disciplinary hold"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setBlockingStudent(null)} className="min-h-[42px] px-4 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl">
                Cancel
              </button>
              <button type="submit" className="min-h-[42px] px-5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl">
                Confirm Block
              </button>
            </div>
          </form>
        </div>
      )}

      <BackBar
        title={tab === 'overview' ? 'Admin Control Hub' : activeTabInfo?.label || 'Admin'}
        backLabel={tab === 'overview' ? 'Home' : 'Dashboard'}
        fallbackPath="/"
        onBack={tab === 'overview' ? undefined : () => setTab('overview')}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop Admin Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-950 text-slate-200 p-4 shrink-0 border-r border-slate-800">
          <div className="pb-4 mb-4 border-b border-slate-800">
            <p className="text-xs font-semibold text-sky-400">{role === 'super_admin' ? 'Super Admin Console' : 'Admin Console'}</p>
            <p className="text-sm font-bold text-white truncate mt-0.5">{firebaseUser.email}</p>
          </div>
          <nav className="space-y-1 flex-1 overflow-y-auto">
            {adminTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`w-full min-h-[42px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  tab === t.id ? 'bg-blue-700 text-white' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {t.icon}
                  <span className="truncate">{t.label}</span>
                </span>
                {t.count && (
                  <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${tab === t.id ? 'bg-blue-800 text-white' : 'bg-slate-900 text-slate-400'}`}>
                    {t.count.split(' ')[0]}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <button type="button" onClick={logout} className="mt-4 min-h-[44px] flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-slate-900">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </aside>

        {/* Main Viewport */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 max-w-[1280px] w-full mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : (
            <>
              {/* 1. OVERVIEW */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Institute Control Hub</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Live academic operations, Cashfree orders, student activity, and website publishing.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={loadAdminOverview}
                        className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('posters')}
                        className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-blue-700 text-white rounded-xl inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Posters &amp; Banners
                      </button>
                      {role === 'super_admin' && (
                        <button
                          type="button"
                          onClick={handleDownloadBackup}
                          className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-xl inline-flex items-center gap-1.5"
                        >
                          <Database className="w-3.5 h-3.5" /> Backup JSON
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'Total Students', val: students.length, sub: `${students.filter((s) => !s.isBlocked).length} active` },
                      { label: 'Online Right Now', val: onlineNowCount, sub: 'Live heartbeat' },
                      { label: 'Open Admissions', val: pendingAdmissionsCount, sub: 'Pending / Review' },
                      { label: 'Open Doubts', val: openDoubtsCount, sub: `${doubts.length} total Q&A` },
                      { label: 'Fee Collected', val: `₹${totalRevenueCollected.toLocaleString('en-IN')}`, sub: `${orders.filter((o) => o.status === 'PAID').length} paid orders` },
                      { label: 'Pending Dues', val: `₹${totalPendingFees.toLocaleString('en-IN')}`, sub: `${deletionRequests.filter((d) => d.status === 'Pending').length} del reqs` },
                    ].map((k) => (
                      <div key={k.label} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
                        <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">{k.val}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{k.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* App Card Grid */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Quick Modules</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {adminTabs
                        .filter((t) => t.id !== 'overview')
                        .map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id)}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-left flex flex-col justify-between gap-3 active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-400 flex items-center justify-center">
                                {item.icon}
                              </div>
                              {item.count && (
                                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">
                                  {item.count}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Live Activity, Orders & Enquiries */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Students Snapshot</h3>
                        <button type="button" onClick={() => setTab('analytics')} className="text-xs font-semibold text-blue-700 dark:text-sky-400">
                          View All →
                        </button>
                      </div>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto">
                        {studentActivity.slice(0, 6).map((act) => {
                          const online = act.isOnline && act.lastActive && nowMs - new Date(act.lastActive).getTime() < 10 * 60_000;
                          return (
                            <div key={act.id} className="text-xs pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white truncate">{act.studentName}</p>
                                <p className="text-slate-500 truncate">{act.deviceType} · {act.studyTimeMinutes || 0}m</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md font-semibold shrink-0 ${online ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {online ? 'Online Now' : 'Offline'}
                              </span>
                            </div>
                          );
                        })}
                        {studentActivity.length === 0 && <p className="text-xs text-slate-500">No student login activity recorded yet.</p>}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recent Admin Activity</h3>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto">
                        {logs.slice(0, 8).map((l) => (
                          <div key={l.id} className="text-xs pb-2 border-b border-slate-100 dark:border-slate-800 flex justify-between gap-2">
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-white">{l.action}</span> ·{' '}
                              <span className="text-slate-600 dark:text-slate-400">{l.target}</span>
                            </div>
                            <span className="font-mono text-slate-400 shrink-0 tabular-nums">{l.timestamp.slice(0, 10)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recent Enquiries</h3>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {enquiries.slice(0, 6).map((eq) => (
                          <div key={eq.id} className="text-xs pb-2.5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
                              <span>{eq.name} ({eq.phone})</span>
                              <span className="text-blue-700 dark:text-sky-400">{eq.source}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 mt-0.5">{eq.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. POSTERS & HOMEPAGE BANNERS */}
              {tab === 'posters' && (
                <div className="space-y-8">
                  {/* Scheduled Homepage Banners Section */}
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Homepage Hero Banner Slider ({banners.length})</h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Full-ratio banners with CTA links and active schedule dates. Original aspect ratios are preserved without forced cropping.
                      </p>
                    </div>

                    <form onSubmit={handleSaveBanner} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input type="text" required placeholder="Banner Heading" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="Subtitle / Batch Highlight" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="Button Label (e.g. Explore Courses)" value={bannerForm.ctaLabel} onChange={(e) => setBannerForm({ ...bannerForm, ctaLabel: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="CTA Route (e.g. /courses or /admission)" value={bannerForm.ctaPath} onChange={(e) => setBannerForm({ ...bannerForm, ctaPath: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Start Date</label>
                            <input type="date" value={bannerForm.startDate} onChange={(e) => setBannerForm({ ...bannerForm, startDate: e.target.value })} className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">End Date</label>
                            <input type="date" value={bannerForm.endDate} onChange={(e) => setBannerForm({ ...bannerForm, endDate: e.target.value })} className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-xs" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} placeholder="Order" value={bannerForm.sortOrder} onChange={(e) => setBannerForm({ ...bannerForm, sortOrder: e.target.value })} className="w-20 px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                          <label className="flex-1 min-h-[44px] px-3 py-2 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-sky-300">
                            <ImagePlus className="w-4 h-4" />
                            {bannerForm.imageUrl ? 'Replace Banner Image' : 'Pick Banner Image'}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '16:9', (u) => setBannerForm((p) => ({ ...p, imageUrl: u })))} />
                          </label>
                        </div>
                      </div>

                      {bannerForm.imageUrl && (
                        <div className="p-3 rounded-xl bg-slate-950 flex items-center gap-4 border border-slate-800">
                          <img src={bannerForm.imageUrl} alt="Banner Preview" className="max-h-24 w-auto object-contain rounded-lg" />
                          <div className="text-xs text-slate-300">
                            <p className="font-bold text-white">Full Aspect Ratio Ready</p>
                            <p>Active: {bannerForm.startDate} → {bannerForm.endDate}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold">
                          <input type="checkbox" checked={bannerForm.published} onChange={(e) => setBannerForm({ ...bannerForm, published: e.target.checked })} />
                          Published Live
                        </label>
                        <button type="submit" className="min-h-[42px] px-5 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl">
                          {editingBannerId ? 'Update Banner' : 'Add Homepage Banner'}
                        </button>
                        {editingBannerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBannerId(null);
                              setBannerForm({ title: '', subtitle: '', ctaLabel: 'Explore Courses', ctaPath: '/courses', imageUrl: '', startDate: '2026-01-01', endDate: '2027-12-31', sortOrder: '1', published: true });
                            }}
                            className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {banners.map((bn) => (
                        <div key={bn.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                          <div className="h-44 bg-slate-950 flex items-center justify-center">
                            <ResilientImage src={bn.imageUrl} alt={bn.title} className="w-full h-full object-contain" />
                          </div>
                          <div className="p-4 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-bold text-sm text-slate-900 dark:text-white">{bn.title}</p>
                              <p className="text-slate-500">Order #{bn.sortOrder || 1} · {bn.published ? 'Published' : 'Hidden'} · {bn.startDate || 'Always'} to {bn.endDate || 'Always'}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBannerId(bn.id);
                                  setBannerForm({
                                    title: bn.title || '',
                                    subtitle: bn.subtitle || '',
                                    ctaLabel: bn.ctaLabel || 'Explore Courses',
                                    ctaPath: bn.ctaPath || '/courses',
                                    imageUrl: bn.imageUrl || '',
                                    startDate: bn.startDate || '2026-01-01',
                                    endDate: bn.endDate || '2027-12-31',
                                    sortOrder: String(bn.sortOrder || 1),
                                    published: bn.published !== false,
                                  });
                                }}
                                className="font-semibold text-blue-700 dark:text-sky-400"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await removeDocument('banners', bn.id);
                                  loadAdminOverview();
                                }}
                                className="font-semibold text-red-700 dark:text-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Poster Studio */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Universal Poster &amp; Asset Studio ({posters.length})</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Upload JPG, PNG, or WEBP with full original aspect ratio preservation.</p>
                    </div>

                    <form onSubmit={handleSavePoster} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input type="text" required placeholder="Poster Title" value={posterForm.title} onChange={(e) => setPosterForm({ ...posterForm, title: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" required placeholder="Category / Subtitle" value={posterForm.category} onChange={(e) => setPosterForm({ ...posterForm, category: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <select value={posterForm.targetType} onChange={(e) => setPosterForm({ ...posterForm, targetType: e.target.value as PosterTargetType, targetId: '' })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl font-medium">
                          {POSTER_TARGETS.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                        </select>
                        {renderTargetEntitySelect()}
                        <label className="min-h-[44px] px-4 py-2.5 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-sky-300">
                          <ImagePlus className="w-4 h-4" />
                          {posterForm.imageUrl ? 'Replace Image' : 'Pick Image from Gallery'}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) =>
                              openCropPicker(
                                e,
                                posterForm.targetType.includes('Photo') || posterForm.targetType === 'Institute Logo' ? '1:1' : '16:9',
                                (dataUrl) => setPosterForm((p) => ({ ...p, imageUrl: dataUrl }))
                              )
                            }
                          />
                        </label>
                        <label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <input type="checkbox" checked={posterForm.published} onChange={(e) => setPosterForm({ ...posterForm, published: e.target.checked })} />
                          Publish Live Immediately
                        </label>
                      </div>

                      {posterForm.imageUrl && (
                        <div className="p-3 rounded-xl bg-slate-950 flex items-center gap-4">
                          <img src={posterForm.imageUrl} alt="Poster Preview" className="max-h-24 w-auto object-contain rounded-lg" />
                          <div className="text-xs text-slate-300">
                            <p className="font-bold text-white">Original Aspect Ratio Ready</p>
                            <p>Target: {posterForm.targetType}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="min-h-[44px] px-6 py-2.5 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl">
                          {posterForm.id ? 'Update Poster Live' : 'Publish Poster Live'}
                        </button>
                        {posterForm.id && (
                          <button
                            type="button"
                            onClick={() => setPosterForm({ id: '', title: '', category: 'Chemistry Batches', targetType: 'Course Poster', targetId: '', imageUrl: '', published: true })}
                            className="min-h-[44px] px-4 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {posters.map((p) => (
                        <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                          <div className="h-44 bg-slate-950 relative flex items-center justify-center">
                            <ResilientImage src={p.imageUrl} alt={p.title} className="w-full h-full object-contain" />
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-950/85 text-white">
                              {p.targetType}
                            </span>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{p.category} · {p.published ? 'Published' : 'Hidden'}</p>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{p.title}</h4>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                              <button
                                type="button"
                                onClick={() => setPosterForm({ id: p.id, title: p.title, category: p.category, targetType: p.targetType, targetId: p.targetId || '', imageUrl: p.imageUrl, published: p.published })}
                                className="font-semibold text-blue-700 dark:text-sky-400 inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await setDocument('posters', p.id, { published: !p.published });
                                  loadAdminOverview();
                                }}
                                className="font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"
                              >
                                {p.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {p.published ? 'Hide' : 'Show'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await removeDocument('posters', p.id);
                                  loadAdminOverview();
                                }}
                                className="font-semibold text-red-700 dark:text-red-400 inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ADMISSIONS (UNDER REVIEW + REQUEST INFO + APPROVE/REJECT) */}
              {tab === 'admissions' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admission Applications ({admissions.length})</h2>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Search ID, name, mobile..."
                        className="px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                      {(['all', 'pending', 'under_review', 'approved', 'rejected'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setAdmFilter(st)}
                          className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl capitalize ${
                            admFilter === st ? 'bg-blue-700 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredAdmissions.map((a) => (
                      <div key={a.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 shrink-0 flex items-center justify-center">
                              <ResilientImage src={a.photoUrl} alt={a.fullName} fallbackTitle={a.fullName} className="w-full h-full object-contain" />
                            </div>
                            <div className="text-sm">
                              <p className="font-mono text-xs text-blue-700 dark:text-sky-400 font-semibold">
                                {a.admissionId} · {a.status.replace('_', ' ').toUpperCase()} · {a.submittedAt.slice(0, 10)}
                              </p>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">{a.fullName} (S/D of {a.fatherName})</h3>
                              <p className="text-xs text-slate-600 dark:text-slate-300">{a.courseName} · {a.batchName} · {a.studentClass} ({a.board})</p>
                              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">Mob: {a.mobile} · Email: {a.email}</p>
                              {a.requestedInfoMessage && (
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Office Remark: {a.requestedInfoMessage}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 shrink-0">
                            {a.status !== 'approved' && (
                              <button type="button" onClick={() => handleAdmissionDecision(a, 'approved')} className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl">
                                Approve &amp; Enroll
                              </button>
                            )}
                            {a.status !== 'under_review' && a.status !== 'approved' && (
                              <button type="button" onClick={() => handleAdmissionDecision(a, 'under_review')} className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl">
                                Mark Under Review
                              </button>
                            )}
                            {a.status !== 'rejected' && (
                              <button type="button" onClick={() => handleAdmissionDecision(a, 'rejected')} className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl">
                                Reject
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                exportHtmlToPrintPdf(
                                  `Admission Receipt — ${a.admissionId}`,
                                  `<p><strong>Admission ID:</strong> ${a.admissionId}</p><p><strong>Student:</strong> ${a.fullName}</p><p><strong>Course:</strong> ${a.courseName}</p><p><strong>Batch:</strong> ${a.batchName}</p><p><strong>Status:</strong> ${a.status.toUpperCase()}</p>`
                                )
                              }
                              className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl inline-flex items-center gap-1"
                            >
                              <Printer className="w-3.5 h-3.5" /> Receipt
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <input
                            type="text"
                            placeholder="Optional remark or request more documents/info from applicant..."
                            value={admRemarkMap[a.id] || ''}
                            onChange={(e) => setAdmRemarkMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdmissionDecision(a, 'under_review')}
                            className="min-h-[38px] px-4 py-2 text-xs font-semibold text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-blue-950/50 rounded-xl shrink-0"
                          >
                            Send Info Request
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. STUDENTS (BLOCKING + DELETION REQUESTS) */}
              {tab === 'students' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Student Management ({students.length})</h2>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => exportStudents('excel')} className="min-h-[38px] px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl inline-flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> Excel</button>
                      <button type="button" onClick={() => exportStudents('csv')} className="min-h-[38px] px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> CSV</button>
                      <button type="button" onClick={() => exportStudents('pdf')} className="min-h-[38px] px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl inline-flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> PDF</button>
                    </div>
                  </div>

                  <form onSubmit={handleAddStudent} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <input type="text" required placeholder="Student Name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="text" required placeholder="Father Name" value={newStudent.fatherName} onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="email" required placeholder="Student Email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="tel" required placeholder="Mobile Number" value={newStudent.mobile} onChange={(e) => setNewStudent({ ...newStudent, mobile: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <select value={newStudent.courseId} onChange={(e) => setNewStudent({ ...newStudent, courseId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Select Course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <select value={newStudent.batchId} onChange={(e) => setNewStudent({ ...newStudent, batchId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Select Batch</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <button type="submit" className="sm:col-span-3 min-h-[44px] py-2.5 font-semibold text-white bg-blue-700 rounded-xl">
                      Add Student &amp; Generate Admission ID
                    </button>
                  </form>

                  <div className="relative max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="Search by name, ID, phone, email..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4">ID</th>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Course &amp; Batch</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4">Access Status</th>
                          <th className="py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredStudents.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2.5 px-4 font-mono text-xs">{s.admissionId}</td>
                            <td className="py-2.5 px-4 font-semibold">{s.name}</td>
                            <td className="py-2.5 px-4 text-xs">{s.courseName} · {s.batchName}</td>
                            <td className="py-2.5 px-4 text-xs tabular-nums">{s.mobile}<br />{s.email}</td>
                            <td className="py-2.5 px-4 text-xs">
                              {s.isBlocked ? (
                                <span className="inline-flex flex-col">
                                  <span className="font-bold text-red-700 dark:text-red-400">
                                    Blocked ({s.blockType === 'temporary' ? 'Temporary' : 'Permanent'})
                                  </span>
                                  {s.blockedUntil && <span className="text-[11px] text-slate-500">Until {s.blockedUntil}</span>}
                                </span>
                              ) : (
                                <span className={`font-semibold capitalize ${s.status === 'active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                                  {s.status}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex flex-wrap gap-2">
                                {s.isBlocked ? (
                                  <button type="button" onClick={() => handleUnblockStudent(s)} className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                                    <Unlock className="w-3.5 h-3.5" /> Unblock
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => { setBlockingStudent(s); setBlockType('temporary'); setBlockReason(''); }} className="text-xs font-semibold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                                    <Ban className="w-3.5 h-3.5" /> Block
                                  </button>
                                )}
                                <button type="button" onClick={() => toggleStudentStatus(s)} className="text-xs font-semibold text-blue-700 dark:text-sky-400">
                                  {s.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button type="button" onClick={() => deleteStudent(s.id)} className="text-xs font-semibold text-red-700 dark:text-red-400">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Account Deletion Requests Queue */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Account Deletion Requests ({deletionRequests.length})</h3>
                    {deletionRequests.length === 0 ? (
                      <p className="text-xs text-slate-500">No deletion requests pending.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {deletionRequests.map((req) => (
                          <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{req.studentName} ({req.email}) · <span className="text-blue-700 dark:text-sky-400">{req.status}</span></p>
                              <p className="text-slate-600 dark:text-slate-400 mt-0.5">Reason: {req.reason} · {req.createdAt.slice(0, 10)}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  await setDocument('deletion_requests', req.id, { status: 'Completed' });
                                  await logAdminActivity(actorEmail, actorRole, 'Completed Deletion Request', req.email);
                                  loadAdminOverview();
                                }}
                                className="px-3 py-1.5 font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-lg"
                              >
                                Mark Completed
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await removeDocument('deletion_requests', req.id);
                                  loadAdminOverview();
                                }}
                                className="px-3 py-1.5 font-semibold text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-300 rounded-lg"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. STUDENT ANALYTICS & LIVE LOGINS */}
              {tab === 'analytics' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Student Activity &amp; Login Sessions</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Real-time online presence, login counts, study minutes, device type, and last watched lecture.</p>
                    </div>
                    <button type="button" onClick={loadAdminOverview} className="min-h-[40px] px-4 py-2 text-xs font-semibold bg-blue-700 text-white rounded-xl inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh Presence
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Presence Status</th>
                          <th className="py-3 px-4">Device</th>
                          <th className="py-3 px-4">Logins</th>
                          <th className="py-3 px-4">Study Time</th>
                          <th className="py-3 px-4">Last Watched</th>
                          <th className="py-3 px-4">Last Active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {studentActivity.map((act) => {
                          const online = act.isOnline && act.lastActive && nowMs - new Date(act.lastActive).getTime() < 10 * 60_000;
                          return (
                            <tr key={act.id}>
                              <td className="py-2.5 px-4">
                                <p className="font-bold text-slate-900 dark:text-white">{act.studentName}</p>
                                <p className="text-slate-500">{act.email}</p>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-md font-bold ${online ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                  {online ? 'Online Now' : 'Offline'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">{act.deviceType}</td>
                              <td className="py-2.5 px-4 font-mono tabular-nums">{act.totalLoginCount || 1}</td>
                              <td className="py-2.5 px-4 font-mono tabular-nums">{act.studyTimeMinutes || 0} mins</td>
                              <td className="py-2.5 px-4 max-w-[200px] truncate">{act.lastWatchedLectureTitle || '—'}</td>
                              <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">
                                {act.lastActive ? new Date(act.lastActive).toLocaleString('en-IN') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                        {studentActivity.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-6 px-4 text-center text-slate-500">No student activity recorded yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recent Login Sessions ({loginSessions.length})</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="py-2.5 px-3">Student</th>
                            <th className="py-2.5 px-3">Device</th>
                            <th className="py-2.5 px-3">Login Time</th>
                            <th className="py-2.5 px-3">Logout / Last Active</th>
                            <th className="py-2.5 px-3">Session State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {loginSessions.slice(0, 20).map((ls) => (
                            <tr key={ls.id}>
                              <td className="py-2 px-3 font-semibold">{ls.studentName} ({ls.email})</td>
                              <td className="py-2 px-3">{ls.deviceType}</td>
                              <td className="py-2 px-3 font-mono tabular-nums">{new Date(ls.loginTime).toLocaleString('en-IN')}</td>
                              <td className="py-2 px-3 font-mono tabular-nums">
                                {ls.logoutTime ? new Date(ls.logoutTime).toLocaleString('en-IN') : new Date(ls.lastActive).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 font-semibold">{ls.isOnline ? 'Active Session' : 'Ended'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. TEACHERS (VISUAL ASSIGNED BATCH & COURSE CHECKBOXES) */}
              {tab === 'teachers' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingTeacherId ? 'Edit Teacher Profile & Assigned Batches' : `Teacher & Faculty Management (${teachers.length})`}
                  </h2>
                  <form onSubmit={handleSaveTeacher} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" required placeholder="Teacher Name" value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="email" required placeholder="Teacher Email (Portal Login)" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="tel" required placeholder="Phone" value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="text" placeholder="Qualification (e.g. M.Sc. Chemistry)" value={teacherForm.qualification} onChange={(e) => setTeacherForm({ ...teacherForm, qualification: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="text" placeholder="Subjects (e.g. Organic Chemistry)" value={teacherForm.subjects} onChange={(e) => setTeacherForm({ ...teacherForm, subjects: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="text" placeholder="Experience (e.g. 14+ Years)" value={teacherForm.experience} onChange={(e) => setTeacherForm({ ...teacherForm, experience: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    </div>

                    {/* Visual Batch & Course Checkboxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Assign Batches (Portal Scope)</p>
                        <div className="flex flex-wrap gap-2">
                          {batches.map((b) => {
                            const checked = teacherForm.assignedBatches.includes(b.id) || teacherForm.assignedBatches.includes(b.name);
                            return (
                              <label key={b.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
                                <input type="checkbox" checked={checked} onChange={() => toggleTeacherBatch(b.id)} />
                                <span>{b.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Assign Courses (Portal Scope)</p>
                        <div className="flex flex-wrap gap-2">
                          {courses.map((c) => {
                            const checked = teacherForm.assignedCourses.includes(c.id) || teacherForm.assignedCourses.includes(c.title);
                            return (
                              <label key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
                                <input type="checkbox" checked={checked} onChange={() => toggleTeacherCourse(c.id)} />
                                <span>{c.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <label className="min-h-[44px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800">
                        <ImagePlus className="w-4 h-4 text-blue-700 dark:text-sky-400" />
                        {teacherForm.photoUrl ? 'Profile Photo Ready' : 'Upload Profile Photo'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '1:1', (u) => setTeacherForm((p) => ({ ...p, photoUrl: u })))} />
                      </label>
                      <label className="min-h-[44px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800">
                        <ImageIcon className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                        {teacherForm.posterUrl ? 'Teacher Poster Ready' : 'Upload Teacher Poster'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '16:9', (u) => setTeacherForm((p) => ({ ...p, posterUrl: u })))} />
                      </label>
                      <div className="flex items-center gap-2">
                        {teacherForm.photoUrl && <img src={teacherForm.photoUrl} alt="" className="w-10 h-10 rounded-full object-contain bg-slate-950 border" />}
                        {teacherForm.posterUrl && <img src={teacherForm.posterUrl} alt="" className="h-10 max-w-24 rounded-md object-contain bg-slate-950 border" />}
                      </div>
                    </div>

                    <textarea placeholder="Short Faculty Bio / Teaching Focus" value={teacherForm.description} onChange={(e) => setTeacherForm({ ...teacherForm, description: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />

                    <div className="flex gap-2">
                      <button type="submit" className="min-h-[44px] px-6 py-2.5 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl">
                        {editingTeacherId ? 'Update Teacher Profile' : 'Create & Publish Teacher'}
                      </button>
                      {editingTeacherId && (
                        <button type="button" onClick={resetTeacherForm} className="min-h-[44px] px-4 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl">
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {teachers.map((t) => (
                      <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0">
                            <ResilientImage src={t.photoUrl} alt={t.name} fallbackTitle={t.name} className="w-full h-full object-cover object-top" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{t.name} ({t.status})</p>
                            <p className="text-xs text-slate-500">{t.email} · {t.phone} · {t.subjects}</p>
                            <p className="text-[11px] text-blue-700 dark:text-sky-400">
                              Batches: {t.assignedBatches?.length || 0} · Courses: {t.assignedCourses?.length || 0}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => startEditTeacher(t)} className="text-xs font-semibold text-blue-700 dark:text-sky-400">
                            Edit / Assign
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteAdminTeacher(t.id, t.email, actorEmail, actorRole);
                              loadAdminOverview();
                            }}
                            className="text-xs font-semibold text-red-700 dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. COURSES, BATCHES, LECTURES & STUDY MATERIALS */}
              {tab === 'courses' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'courses' as const, label: `Courses (${courses.length})` },
                      { id: 'batches' as const, label: `Batches (${batches.length})` },
                      { id: 'lectures' as const, label: `Chapters & Lectures (${lectures.length})` },
                      { id: 'materials' as const, label: `Study Materials (${materials.length})` },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setCourseSubTab(st.id)}
                        className={`min-h-[40px] px-4 py-2 text-xs font-bold rounded-xl ${
                          courseSubTab === st.id
                            ? 'bg-blue-700 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {courseSubTab === 'courses' && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {editingCourseId ? 'Edit Course' : 'Courses Management'}
                      </h2>
                      <form onSubmit={handleSaveCourse} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <input type="text" required placeholder="Course Title" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" required placeholder="Category (NEET, Class 12, IIT-JEE)" value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <select value={courseForm.examTrack} onChange={(e) => setCourseForm({ ...courseForm, examTrack: e.target.value as ExamTrack })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          {EXAM_TRACKS.map((et) => <option key={et} value={et}>{et}</option>)}
                        </select>
                        <input type="number" required placeholder="Selling Price (INR, 0 for Free)" value={courseForm.fees} onChange={(e) => setCourseForm({ ...courseForm, fees: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="number" placeholder="MRP Price (INR)" value={courseForm.mrpPrice} onChange={(e) => setCourseForm({ ...courseForm, mrpPrice: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="number" placeholder="Discount %" value={courseForm.discountPercent} onChange={(e) => setCourseForm({ ...courseForm, discountPercent: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" required placeholder="Duration (e.g. 12 Months)" value={courseForm.duration} onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="Teacher Name" value={courseForm.teacherName} onChange={(e) => setCourseForm({ ...courseForm, teacherName: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <label className="min-h-[44px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800">
                          <ImagePlus className="w-4 h-4 text-blue-700 dark:text-sky-400" />
                          {courseForm.imageUrl ? 'Replace Poster Image' : 'Pick Course Poster'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '16:9', (u) => setCourseForm((p) => ({ ...p, imageUrl: u })))} />
                        </label>
                        <input type="text" placeholder="Live Schedule" value={courseForm.liveSchedule} onChange={(e) => setCourseForm({ ...courseForm, liveSchedule: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="Status Label" value={courseForm.statusLabel} onChange={(e) => setCourseForm({ ...courseForm, statusLabel: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="Subjects" value={courseForm.subjects} onChange={(e) => setCourseForm({ ...courseForm, subjects: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <textarea placeholder="Description" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} className="sm:col-span-3 px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <textarea placeholder="Syllabus topics (one per line)" value={courseForm.syllabusText} onChange={(e) => setCourseForm({ ...courseForm, syllabusText: e.target.value })} className="sm:col-span-2 px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <textarea placeholder="Chapters (one per line)" value={courseForm.chaptersText} onChange={(e) => setCourseForm({ ...courseForm, chaptersText: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <div className="sm:col-span-3 flex gap-2">
                          <button type="submit" className="min-h-[44px] px-6 py-2.5 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl">
                            {editingCourseId ? 'Save Course Updates' : 'Create & Publish Course'}
                          </button>
                          {editingCourseId && (
                            <button type="button" onClick={resetCourseForm} className="min-h-[44px] px-4 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl">
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        {courses.map((c) => (
                          <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-950 shrink-0 flex items-center justify-center">
                                <ResilientImage src={c.imageUrl} alt={c.title} className="w-full h-full object-contain" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white tabular-nums">
                                  {c.title} — ₹{Number(c.fees).toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {c.category} · {c.examTrack || c.duration} · {c.published ? 'Published' : 'Unpublished'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button type="button" onClick={() => startEditCourse(c)} className="text-xs font-semibold text-blue-700 dark:text-sky-400">
                                Edit Course
                              </button>
                              <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 cursor-pointer">
                                Poster
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    openCropPicker(e, '16:9', async (url) => {
                                      await setDocument('courses', c.id, { imageUrl: url });
                                      showToast('Course poster updated!', 'success');
                                      loadAdminOverview();
                                    })
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                onClick={async () => {
                                  await setDocument('courses', c.id, { published: !c.published });
                                  loadAdminOverview();
                                }}
                                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                              >
                                {c.published ? 'Unpublish' : 'Publish'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await removeDocument('courses', c.id);
                                  loadAdminOverview();
                                }}
                                className="text-xs font-semibold text-red-700 dark:text-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {courseSubTab === 'batches' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {editingBatchId ? 'Edit Batch' : 'Batches Management'}
                      </h3>
                      <form onSubmit={handleSaveBatch} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <input type="text" required placeholder="Batch Name" value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" required placeholder="Timing (07:00 AM - 08:30 AM)" value={batchForm.timing} onChange={(e) => setBatchForm({ ...batchForm, timing: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <select value={batchForm.mode} onChange={(e) => setBatchForm({ ...batchForm, mode: e.target.value as 'Offline' | 'Online' | 'Hybrid' })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="Offline">Offline</option><option value="Online">Online</option><option value="Hybrid">Hybrid</option>
                        </select>
                        <select value={batchForm.courseId} onChange={(e) => setBatchForm({ ...batchForm, courseId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="">Linked Course</option>
                          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <input type="text" placeholder="Category (Class 12, NEET)" value={batchForm.category} onChange={(e) => setBatchForm({ ...batchForm, category: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="Days (Mon - Sat)" value={batchForm.days} onChange={(e) => setBatchForm({ ...batchForm, days: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="number" placeholder="Capacity" value={batchForm.capacity} onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="number" placeholder="Fees (INR)" value={batchForm.fees} onChange={(e) => setBatchForm({ ...batchForm, fees: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <label className="min-h-[44px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800">
                          <ImagePlus className="w-4 h-4 text-blue-700 dark:text-sky-400" />
                          {batchForm.posterUrl ? 'Replace Batch Poster' : 'Pick Batch Poster'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '16:9', (u) => setBatchForm((p) => ({ ...p, posterUrl: u })))} />
                        </label>
                        <div className="sm:col-span-3 flex gap-2">
                          <button type="submit" className="min-h-[44px] px-6 py-2 font-semibold text-white bg-blue-700 rounded-xl">
                            {editingBatchId ? 'Update Batch' : 'Create Batch'}
                          </button>
                          {editingBatchId && (
                            <button type="button" onClick={resetBatchForm} className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl">
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        {batches.map((b) => (
                          <div key={b.id} className="p-4 flex justify-between items-center text-sm">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{b.name} ({b.mode})</p>
                              <p className="text-xs text-slate-500">{b.courseName} · {b.timing} · {b.days} · Cap {b.capacity}</p>
                            </div>
                            <div className="flex gap-3">
                              <button type="button" onClick={() => startEditBatch(b)} className="text-xs font-semibold text-blue-700 dark:text-sky-400">
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await removeDocument('batches', b.id);
                                  loadAdminOverview();
                                }}
                                className="text-xs font-semibold text-red-700 dark:text-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {courseSubTab === 'lectures' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {editingLectureId ? 'Edit Recorded Lecture' : 'Chapters & Recorded Video Lectures'}
                      </h3>
                      <form onSubmit={handleSaveLecture} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <input type="text" required placeholder="Lecture Title" value={lectureForm.title} onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <select value={lectureForm.courseId} onChange={(e) => setLectureForm({ ...lectureForm, courseId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="">Select Course</option>
                          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <input type="text" required placeholder="Chapter Name" value={lectureForm.chapter} onChange={(e) => setLectureForm({ ...lectureForm, chapter: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="number" min={1} placeholder="Lecture #" value={lectureForm.lectureNumber} onChange={(e) => setLectureForm({ ...lectureForm, lectureNumber: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="Duration (e.g. 52 mins)" value={lectureForm.duration} onChange={(e) => setLectureForm({ ...lectureForm, duration: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <select value={lectureForm.videoSource} onChange={(e) => setLectureForm({ ...lectureForm, videoSource: e.target.value as 'youtube' | 'direct' })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="youtube">YouTube Link</option>
                          <option value="direct">Protected Direct Video Upload</option>
                        </select>
                        {lectureForm.videoSource === 'youtube' ? (
                          <input type="url" required placeholder="YouTube Video / Embed URL" value={lectureForm.videoUrl} onChange={(e) => setLectureForm({ ...lectureForm, videoUrl: e.target.value })} className="sm:col-span-2 px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        ) : (
                          <label className="sm:col-span-2 min-h-[44px] px-4 py-2 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-sky-300">
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading Video...' : lectureForm.videoUrl ? 'Direct Video Uploaded (Replace)' : 'Upload MP4 / WebM Lecture Video'}
                            <input type="file" accept="video/*" className="hidden" onChange={handleUploadDirectVideo} />
                          </label>
                        )}
                        <label className="min-h-[44px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800">
                          <ImagePlus className="w-4 h-4 text-blue-700" />
                          {lectureForm.thumbnailUrl ? 'Thumbnail Ready' : 'Pick Thumbnail'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '16:9', (u) => setLectureForm((p) => ({ ...p, thumbnailUrl: u })))} />
                        </label>
                        <input type="text" placeholder="Short Description" value={lectureForm.description} onChange={(e) => setLectureForm({ ...lectureForm, description: e.target.value })} className="sm:col-span-3 px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <div className="sm:col-span-3 flex flex-wrap items-center gap-4">
                          <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <input type="checkbox" checked={lectureForm.isFreePreview} onChange={(e) => setLectureForm({ ...lectureForm, isFreePreview: e.target.checked })} />
                            Free Preview (Watchable before purchase)
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <input type="checkbox" checked={lectureForm.published} onChange={(e) => setLectureForm({ ...lectureForm, published: e.target.checked })} />
                            Published
                          </label>
                        </div>
                        <div className="sm:col-span-3 flex gap-2">
                          <button type="submit" disabled={uploading} className="min-h-[44px] px-6 py-2 font-semibold text-white bg-blue-700 rounded-xl">
                            {editingLectureId ? 'Update Lecture' : 'Add Lecture'}
                          </button>
                          {editingLectureId && (
                            <button type="button" onClick={resetLectureForm} className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl">
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        {lectures.map((l) => (
                          <div key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                #{l.lectureNumber || 1} {l.title} {l.isFreePreview && <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">· Free Preview</span>}
                              </p>
                              <p className="text-xs text-slate-500">{l.courseName} · {l.chapter} · {l.duration} · {l.videoSource || l.platform}</p>
                            </div>
                            <div className="flex gap-3">
                              <button type="button" onClick={() => startEditLecture(l)} className="text-xs font-semibold text-blue-700 dark:text-sky-400">Edit</button>
                              <button type="button" onClick={async () => { await removeDocument('recorded_lectures', l.id); loadAdminOverview(); }} className="text-xs font-semibold text-red-700 dark:text-red-400">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {courseSubTab === 'materials' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {editingMaterialId ? 'Edit Study Material' : 'PDF Notes, PYQs, DPPs & Study Materials'}
                      </h3>
                      <form onSubmit={handleSaveMaterial} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <input type="text" required placeholder="Material Title" value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <select value={materialForm.category} onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value as StudyMaterialCategory })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          {MATERIAL_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select value={materialForm.courseId} onChange={(e) => setMaterialForm({ ...materialForm, courseId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="">Select Course</option>
                          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <input type="text" required placeholder="Chapter Name" value={materialForm.chapter} onChange={(e) => setMaterialForm({ ...materialForm, chapter: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <input type="text" placeholder="PDF URL or upload below" value={materialForm.fileUrl} onChange={(e) => setMaterialForm({ ...materialForm, fileUrl: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <label className="min-h-[44px] px-3 py-2 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-sky-300">
                          <FileText className="w-4 h-4" />
                          {uploading ? 'Uploading PDF...' : 'Upload PDF File'}
                          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleUploadMaterialPdf} />
                        </label>
                        <input type="text" placeholder="Short Description" value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} className="sm:col-span-2 px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <label className="min-h-[44px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800">
                          <ImagePlus className="w-4 h-4 text-blue-700" />
                          {materialForm.coverUrl ? 'Cover Ready' : 'Pick Cover Image'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '4:3', (u) => setMaterialForm((p) => ({ ...p, coverUrl: u })))} />
                        </label>
                        <div className="sm:col-span-3 flex gap-2">
                          <button type="submit" disabled={uploading} className="min-h-[44px] px-6 py-2 font-semibold text-white bg-blue-700 rounded-xl">
                            {editingMaterialId ? 'Update Material' : 'Publish Material'}
                          </button>
                          {editingMaterialId && (
                            <button type="button" onClick={resetMaterialForm} className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl">
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        {materials.map((m) => (
                          <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{m.title}</p>
                              <p className="text-xs text-slate-500">{m.category} · {m.courseName} · {m.chapter}</p>
                            </div>
                            <div className="flex gap-3">
                              <button type="button" onClick={() => startEditMaterial(m)} className="text-xs font-semibold text-blue-700 dark:text-sky-400">Edit</button>
                              <button type="button" onClick={async () => { await removeDocument('study_materials', m.id); loadAdminOverview(); }} className="text-xs font-semibold text-red-700 dark:text-red-400">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 8. ATTENDANCE */}
              {tab === 'attendance' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Attendance Management</h2>
                  <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <select value={attBatchId} onChange={(e) => setAttBatchId(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">All Batches</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <button type="button" onClick={handleSaveAttendance} className="min-h-[42px] px-5 py-2 text-sm font-semibold text-white bg-blue-700 rounded-xl">
                      Save Batch Attendance
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {students.filter((s) => !attBatchId || s.batchId === attBatchId).map((s) => (
                      <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</p>
                          <p className="text-xs font-mono text-slate-500">{s.admissionId} · {s.batchName}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(['Present', 'Absent', 'Late', 'Leave'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setAttMap((m) => ({ ...m, [s.id]: st }))}
                              className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl border ${
                                (attMap[s.id] || 'Present') === st
                                  ? 'bg-blue-700 text-white border-blue-700'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. FEES, CASHFREE ORDERS & REFUNDS */}
              {tab === 'fees' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fees, Cashfree Orders &amp; Refunds</h2>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          'zoc-fee-collection',
                          ['Receipt No', 'Student', 'Admission ID', 'Amount', 'Mode', 'Status', 'Refund', 'Date'],
                          payments.map((p) => [p.receiptNo, p.studentName, p.admissionId, p.amount, p.mode, p.paymentStatus || 'PAID', p.refundStatus || 'None', p.paidAt.slice(0, 10)])
                        )
                      }
                      className="min-h-[40px] px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> Download Collection Report
                    </button>
                  </div>

                  <form onSubmit={handleRecordPayment} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                    <select required value={payForm.feeRecordId} onChange={(e) => setPayForm({ ...payForm, feeRecordId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Select Student Fee Account</option>
                      {feeRecords.map((f) => <option key={f.id} value={f.id}>{f.studentName} ({f.admissionId}) — Paid ₹{f.paidAmount}</option>)}
                    </select>
                    <input type="number" required placeholder="Amount (INR)" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <select value={payForm.mode} onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Online">Online</option>
                    </select>
                    <button type="submit" className="min-h-[44px] py-2 font-semibold text-white bg-blue-700 rounded-xl">Record Payment &amp; Receipt</button>
                  </form>

                  {/* Cashfree Orders & Refunds Table */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Online Course Orders (Cashfree) ({orders.length})</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="py-2.5 px-3">Order ID / Receipt</th>
                            <th className="py-2.5 px-3">Student</th>
                            <th className="py-2.5 px-3">Course</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Payment Status</th>
                            <th className="py-2.5 px-3">Refund Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {orders.map((ord) => (
                            <tr key={ord.id}>
                              <td className="py-2.5 px-3 font-mono">
                                <p className="font-bold text-slate-900 dark:text-white">{ord.orderId}</p>
                                {ord.receiptNo && <p className="text-slate-500">{ord.receiptNo}</p>}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-semibold">{ord.studentName}</p>
                                <p className="text-slate-500">{ord.studentEmail}</p>
                              </td>
                              <td className="py-2.5 px-3">{ord.courseTitle}</td>
                              <td className="py-2.5 px-3 font-mono tabular-nums font-bold">₹{Number(ord.amount).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-semibold">{ord.status} ({ord.gatewayMode || 'sandbox'})</td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={ord.refundStatus || 'None'}
                                  onChange={(e) => handleUpdateOrderRefund(ord, e.target.value as 'None' | 'Requested' | 'Refunded')}
                                  className="px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-xs font-semibold"
                                >
                                  <option value="None">None</option>
                                  <option value="Requested">Requested</option>
                                  <option value="Refunded">Refunded</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                          {orders.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-4 px-3 text-center text-slate-500">No online Cashfree orders yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Fee Ledger Table */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <tr><th className="py-3 px-4">Student</th><th className="py-3 px-4">Total</th><th className="py-3 px-4">Paid</th><th className="py-3 px-4">Pending</th><th className="py-3 px-4">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {feeRecords.map((f) => {
                          const net = Math.max(0, Number(f.totalFees || 0) - Number(f.discount || 0) - Number(f.scholarship || 0) + Number(f.lateFee || 0));
                          const due = Math.max(0, net - Number(f.paidAmount || 0));
                          return (
                            <tr key={f.id}>
                              <td className="py-2.5 px-4 font-semibold">{f.studentName} <span className="font-mono text-xs text-slate-400">({f.admissionId})</span></td>
                              <td className="py-2.5 px-4 font-mono tabular-nums">₹{net.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-4 font-mono tabular-nums text-emerald-700 dark:text-emerald-400">₹{Number(f.paidAmount).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-4 font-mono tabular-nums text-red-700 dark:text-red-400">₹{due.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-4 text-xs font-semibold">{f.status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 10. TESTS, LIVE CLASSES, TIMETABLE & DOUBTS Q&A */}
              {tab === 'learning' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tests, Live Classes, Timetable &amp; Student Doubts</h2>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Timetable Form */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await addDocument('timetable', newSlot);
                        showToast('Calendar event added.', 'success');
                        loadAdminOverview();
                      }}
                      className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-sm"
                    >
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Timetable Slot</h3>
                      <input type="text" required placeholder="Event Title" value={newSlot.title} onChange={(e) => setNewSlot({ ...newSlot, title: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={newSlot.eventType} onChange={(e) => setNewSlot({ ...newSlot, eventType: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="Daily Class">Daily Class</option><option value="Live Class">Live Class</option><option value="Test">Test</option><option value="Holiday">Holiday</option><option value="Event">Event</option>
                        </select>
                        <input type="text" placeholder="Day (Monday)" value={newSlot.dayOfWeek} onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      </div>
                      <button type="submit" className="w-full min-h-[42px] py-2 font-semibold text-white bg-blue-700 rounded-xl">Add Schedule Slot</button>
                    </form>

                    {/* Live Class Form */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const b = batches.find((x) => x.id === newLiveClass.batchId) || batches[0];
                        await addDocument('live_classes', {
                          ...newLiveClass,
                          durationMinutes: Number(newLiveClass.durationMinutes || 60),
                          batchId: b?.id || '',
                          batchName: b?.name || 'Morning Batch',
                        });
                        showToast('Live class scheduled.', 'success');
                        setNewLiveClass({ title: '', subject: 'Organic Chemistry', chapter: '', courseId: '', batchId: '', teacherName: 'S. K. Srivastav', platform: 'Google Meet', joinUrl: '', scheduledAt: '', durationMinutes: '60', status: 'Upcoming' });
                        loadAdminOverview();
                      }}
                      className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-sm"
                    >
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">Schedule Live Class</h3>
                      <input type="text" required placeholder="Topic / Title" value={newLiveClass.title} onChange={(e) => setNewLiveClass({ ...newLiveClass, title: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="url" required placeholder="Join Link (Meet / Zoom / YouTube)" value={newLiveClass.joinUrl} onChange={(e) => setNewLiveClass({ ...newLiveClass, joinUrl: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="datetime-local" required value={newLiveClass.scheduledAt} onChange={(e) => setNewLiveClass({ ...newLiveClass, scheduledAt: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-xs" />
                        <select value={newLiveClass.batchId} onChange={(e) => setNewLiveClass({ ...newLiveClass, batchId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-xs">
                          <option value="">All Batches</option>
                          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <button type="submit" className="w-full min-h-[42px] py-2 font-semibold text-white bg-blue-700 rounded-xl">Publish Live Class</button>
                    </form>

                    {/* Test Creator */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const b = batches.find((x) => x.id === newTest.batchId) || batches[0];
                        await addDocument('tests', {
                          ...newTest,
                          durationMinutes: Number(newTest.durationMinutes || 30),
                          maxMarks: Number(newTest.maxMarks || 40),
                          batchId: b?.id || '',
                          batchName: b?.name || 'All Batches',
                          createdAt: new Date().toISOString(),
                        });
                        showToast('Test scheduled.', 'success');
                        setNewTest({ title: '', testType: 'Online MCQ', subject: 'Organic Chemistry', courseId: '', batchId: '', date: '', durationMinutes: '30', maxMarks: '40', instructions: 'Attempt all questions carefully.', posterUrl: '' });
                        loadAdminOverview();
                      }}
                      className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-sm"
                    >
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">Create Test / Exam</h3>
                      <input type="text" required placeholder="Test Title" value={newTest.title} onChange={(e) => setNewTest({ ...newTest, title: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={newTest.testType} onChange={(e) => setNewTest({ ...newTest, testType: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="Online MCQ">Online MCQ</option><option value="Offline Test">Offline Test</option><option value="Mock Test">Mock Test</option>
                        </select>
                        <input type="date" required value={newTest.date} onChange={(e) => setNewTest({ ...newTest, date: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Max Marks" value={newTest.maxMarks} onChange={(e) => setNewTest({ ...newTest, maxMarks: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <label className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800">
                          <ImagePlus className="w-4 h-4 text-blue-700" /> {newTest.posterUrl ? 'Poster Ready' : 'Test Poster'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '16:9', (u) => setNewTest((p) => ({ ...p, posterUrl: u })))} />
                        </label>
                      </div>
                      <button type="submit" className="w-full min-h-[42px] py-2 font-semibold text-white bg-blue-700 rounded-xl">Create Test</button>
                    </form>
                  </div>

                  {/* Student Doubts Q&A Desk */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-700" /> Student Doubts Q&amp;A Desk ({doubts.length})
                    </h3>
                    {doubts.length === 0 ? (
                      <p className="text-xs text-slate-500">No doubts submitted yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {doubts.map((d) => (
                          <div key={d.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {d.studentName} · {d.courseTitle} ({d.chapter})
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-semibold ${d.status === 'Answered' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                                {d.status}
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 dark:text-slate-200">{d.question}</p>
                            {d.reply && (
                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                                <strong>Answer ({d.repliedBy}):</strong> {d.reply}
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              <input
                                type="text"
                                placeholder="Write reply or update answer..."
                                value={doubtReplyMap[d.id] ?? ''}
                                onChange={(e) => setDoubtReplyMap((p) => ({ ...p, [d.id]: e.target.value }))}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const txt = (doubtReplyMap[d.id] || '').trim();
                                  if (!txt) return;
                                  await replyToStudentDoubt(d.id, txt, actorEmail);
                                  showToast('Doubt answered!', 'success');
                                  setDoubtReplyMap((p) => ({ ...p, [d.id]: '' }));
                                  loadAdminOverview();
                                }}
                                className="min-h-[36px] px-4 py-1.5 font-semibold text-white bg-blue-700 rounded-lg"
                              >
                                Send Reply
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Existing Tests & Live Classes quick list */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Scheduled Tests ({tests.length})</h4>
                      {tests.map((t) => (
                        <div key={t.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-100 dark:border-slate-800">
                          <span><strong>{t.title}</strong> · {t.date} · {t.maxMarks} marks</span>
                          <button type="button" onClick={async () => { await removeDocument('tests', t.id); loadAdminOverview(); }} className="text-red-700 font-semibold">Delete</button>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Live Classes ({liveClasses.length})</h4>
                      {liveClasses.map((lc) => (
                        <div key={lc.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-100 dark:border-slate-800">
                          <span><strong>{lc.title}</strong> · {lc.batchName} · {lc.status}</span>
                          <button type="button" onClick={async () => { await removeDocument('live_classes', lc.id); loadAdminOverview(); }} className="text-red-700 font-semibold">Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 11. NOTICES, TARGETED NOTIFICATIONS & RESULTS */}
              {tab === 'notices' && (
                <div className="space-y-8">
                  {/* Targeted Notification Broadcaster */}
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-700" /> Targeted Push Notifications
                    </h2>
                    <form onSubmit={handleSendTargetedNotif} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-sm mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" required placeholder="Notification Title" value={targetNotif.title} onChange={(e) => setTargetNotif({ ...targetNotif, title: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                        <select value={targetNotif.targetType} onChange={(e) => setTargetNotif({ ...targetNotif, targetType: e.target.value as NotificationItem['targetType'], targetId: '', targetUid: '' })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="all">All Students</option>
                          <option value="batch">Specific Batch</option>
                          <option value="course">Specific Course</option>
                          <option value="student">Individual Student</option>
                        </select>
                        {targetNotif.targetType === 'batch' && (
                          <select required value={targetNotif.targetId} onChange={(e) => setTargetNotif({ ...targetNotif, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                            <option value="">Select Batch</option>
                            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        )}
                        {targetNotif.targetType === 'course' && (
                          <select required value={targetNotif.targetId} onChange={(e) => setTargetNotif({ ...targetNotif, targetId: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                            <option value="">Select Course</option>
                            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                        )}
                        {targetNotif.targetType === 'student' && (
                          <select required value={targetNotif.targetUid} onChange={(e) => setTargetNotif({ ...targetNotif, targetUid: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                            <option value="">Select Student (Verified UID)</option>
                            {students.filter((s) => s.uid).map((s) => <option key={s.id} value={s.uid}>{s.name} ({s.admissionId})</option>)}
                          </select>
                        )}
                      </div>
                      <textarea required rows={2} placeholder="Alert message for students..." value={targetNotif.message} onChange={(e) => setTargetNotif({ ...targetNotif, message: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <button type="submit" className="min-h-[42px] px-6 py-2 font-semibold text-white bg-blue-700 rounded-xl inline-flex items-center gap-1.5">
                        <Send className="w-4 h-4" /> Send Push Notification
                      </button>
                    </form>
                  </div>

                  {/* Public Notice Board */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Publish Public Notice</h3>
                    <form onSubmit={handlePublishNotice} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-sm mb-4">
                      <input type="text" required placeholder="Notice Headline" value={newNotice.title} onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select value={newNotice.category} onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                          <option value="New Admission">New Admission</option><option value="Exam Dates">Exam Dates</option><option value="Holidays">Holidays</option><option value="Class Timetable">Class Timetable</option><option value="Test Schedule">Test Schedule</option><option value="Results">Results</option><option value="Important Announcement">Important Announcement</option>
                        </select>
                        <label className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800">
                          <ImagePlus className="w-4 h-4 text-blue-700" /> {newNotice.imageUrl ? 'Notice Image Ready' : 'Notice Image (Optional)'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '16:9', (u) => setNewNotice((p) => ({ ...p, imageUrl: u })))} />
                        </label>
                      </div>
                      <textarea required placeholder="Notice details..." value={newNotice.content} onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <button type="submit" className="min-h-[44px] px-6 py-2 font-semibold text-white bg-blue-700 rounded-xl">Publish Notice Live</button>
                    </form>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                      {notices.map((n) => (
                        <div key={n.id} className="p-4 flex justify-between items-center text-sm">
                          <div><p className="font-bold text-slate-900 dark:text-white">{n.title}</p><p className="text-xs text-slate-500">{n.category} · {n.date}</p></div>
                          <button type="button" onClick={async () => { await removeDocument('notices', n.id); loadAdminOverview(); }} className="text-xs font-semibold text-red-700 dark:text-red-400">Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Topper Results Showcase */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Topper Results Showcase</h3>
                    <form onSubmit={handleAddTopper} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
                      <input type="text" required placeholder="Student Name" value={newTopper.studentName} onChange={(e) => setNewTopper({ ...newTopper, studentName: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="text" required placeholder="Exam (e.g. IIT-JEE 2026)" value={newTopper.examName} onChange={(e) => setNewTopper({ ...newTopper, examName: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="text" required placeholder="Marks / Rank" value={newTopper.marksOrRank} onChange={(e) => setNewTopper({ ...newTopper, marksOrRank: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="text" required placeholder="Achievement" value={newTopper.achievement} onChange={(e) => setNewTopper({ ...newTopper, achievement: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="text" placeholder="Year" value={newTopper.year} onChange={(e) => setNewTopper({ ...newTopper, year: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <label className="min-h-[44px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                        {newTopper.photoUrl ? 'Photo Ready' : 'Pick Student Photo'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '1:1', (u) => setNewTopper((p) => ({ ...p, photoUrl: u })))} />
                      </label>
                      <button type="submit" className="sm:col-span-3 min-h-[44px] py-2 font-semibold text-white bg-blue-700 rounded-xl">Add Topper to Homepage</button>
                    </form>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {results.map((r) => (
                        <div key={r.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                          <div><p className="font-bold text-slate-900 dark:text-white">{r.studentName} ({r.marksOrRank})</p><p className="text-xs text-slate-500">{r.examName} · {r.year}</p></div>
                          <button type="button" onClick={async () => { await removeDocument('results', r.id); loadAdminOverview(); }} className="text-xs font-semibold text-red-700 dark:text-red-400">Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 12. GALLERY */}
              {tab === 'gallery' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Photo Gallery — Direct Mobile Gallery Upload</h2>
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <input type="text" placeholder="Photo Title (Optional)" value={newGalleryMeta.title} onChange={(e) => setNewGalleryMeta({ ...newGalleryMeta, title: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <select value={newGalleryMeta.category} onChange={(e) => setNewGalleryMeta({ ...newGalleryMeta, category: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                        <option value="Institute">Institute</option><option value="Classroom">Classroom</option><option value="Teacher">Teacher</option><option value="Awards">Awards</option><option value="Events">Events</option><option value="Banners">Banners</option>
                      </select>
                      <input type="text" placeholder="Album Name" value={newGalleryMeta.album} onChange={(e) => setNewGalleryMeta({ ...newGalleryMeta, album: e.target.value })} className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    </div>
                    <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                      <ImagePlus className="w-8 h-8 text-blue-700 dark:text-sky-400 mb-2" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white text-center">
                        {uploading ? 'Uploading Full-Ratio Photos...' : 'Tap to Open Phone Gallery (Select Single or Multiple Photos)'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                        Preserves exact aspect ratio · Supports JPG, JPEG, PNG, WEBP
                      </span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleMultiGalleryUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {gallery.map((g) => (
                      <div key={g.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                        <div className="h-44 bg-slate-950 flex items-center justify-center">
                          <ResilientImage src={g.imageUrl} alt={g.title} className="w-full h-full object-contain" />
                        </div>
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{g.category} · {g.album}</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{g.title}</p>
                          </div>
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <button
                              type="button"
                              onClick={async () => {
                                await setDocument('institute_settings', 'main', { heroBannerUrl: g.imageUrl });
                                showToast('Set as Homepage Hero Banner!', 'success');
                                loadAdminOverview();
                              }}
                              className="font-semibold text-blue-700 dark:text-sky-400"
                            >
                              Set Banner
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await removeDocument('gallery', g.id);
                                loadAdminOverview();
                              }}
                              className="font-semibold text-red-700 dark:text-red-400 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 13. WEBSITE CMS, USER ROLES & BACKUP */}
              {tab === 'cms' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Website Content, Settings &amp; Backup</h2>
                    {role === 'super_admin' && (
                      <button type="button" onClick={handleDownloadBackup} className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-xl inline-flex items-center gap-1.5">
                        <Database className="w-4 h-4" /> Export Full Database Backup (JSON)
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveCms} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Homepage, Banner, Logo &amp; Prof. {cmsForm.directorName} Profile</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <label className="min-h-[44px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5">
                        <ImagePlus className="w-4 h-4 text-blue-700" /> Upload Logo
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '1:1', (u) => { setCmsForm((p) => ({ ...p, logoUrl: u })); showToast('Logo ready. Click Save Settings.', 'info'); })} />
                      </label>
                      <label className="min-h-[44px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5">
                        <ImagePlus className="w-4 h-4 text-blue-700" /> Upload Hero Banner
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '16:9', (u) => { setCmsForm((p) => ({ ...p, heroBannerUrl: u })); showToast('Banner ready. Click Save Settings.', 'info'); })} />
                      </label>
                      <label className="min-h-[44px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5">
                        <ImagePlus className="w-4 h-4 text-blue-700" /> Upload Director Photo
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => openCropPicker(e, '4:3', (u) => { setCmsForm((p) => ({ ...p, directorPhotoUrl: u })); showToast('Photo ready. Click Save Settings.', 'info'); })} />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-semibold mb-1">Hero Heading</label><input type="text" value={cmsForm.heroHeading} onChange={(e) => setCmsForm({ ...cmsForm, heroHeading: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                      <div><label className="block text-xs font-semibold mb-1">Hero Subheading</label><input type="text" value={cmsForm.heroSubheading} onChange={(e) => setCmsForm({ ...cmsForm, heroSubheading: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                      <div><label className="block text-xs font-semibold mb-1">Director Name</label><input type="text" value={cmsForm.directorName} onChange={(e) => setCmsForm({ ...cmsForm, directorName: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                      <div><label className="block text-xs font-semibold mb-1">Director Qualification</label><input type="text" value={cmsForm.directorQualification} onChange={(e) => setCmsForm({ ...cmsForm, directorQualification: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                      <div><label className="block text-xs font-semibold mb-1">Phone Number</label><input type="text" value={cmsForm.phone} onChange={(e) => setCmsForm({ ...cmsForm, phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                      <div><label className="block text-xs font-semibold mb-1">WhatsApp Number</label><input type="text" value={cmsForm.whatsapp} onChange={(e) => setCmsForm({ ...cmsForm, whatsapp: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                      <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1">Address</label><input type="text" value={cmsForm.address} onChange={(e) => setCmsForm({ ...cmsForm, address: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                      <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1">About Institute</label><textarea rows={3} value={cmsForm.aboutText} onChange={(e) => setCmsForm({ ...cmsForm, aboutText: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                      <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1">Teaching Philosophy</label><textarea rows={2} value={cmsForm.directorPhilosophy} onChange={(e) => setCmsForm({ ...cmsForm, directorPhilosophy: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" /></div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Homepage Sections Show / Hide</p>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(cmsForm.showSections).map(([key, val]) => (
                          <label key={key} className="inline-flex items-center gap-1.5 text-xs font-medium capitalize">
                            <input
                              type="checkbox"
                              checked={val}
                              onChange={(e) => setCmsForm({ ...cmsForm, showSections: { ...cmsForm.showSections, [key]: e.target.checked } })}
                            />
                            {key}
                          </label>
                        ))}
                      </div>
                    </div>

                    <button type="submit" disabled={uploading} className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl">
                      Save Website Content &amp; Publish Live
                    </button>
                  </form>

                  {role === 'super_admin' && (
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">User Accounts &amp; Role Permissions</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                            <tr><th className="py-2.5 px-4">Email</th><th className="py-2.5 px-4">Name</th><th className="py-2.5 px-4">Role</th><th className="py-2.5 px-4">Assign Role</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {users.map((u) => (
                              <tr key={u.uid}>
                                <td className="py-2.5 px-4 font-mono text-xs">{u.email}</td>
                                <td className="py-2.5 px-4">{u.name}</td>
                                <td className="py-2.5 px-4 font-semibold text-xs uppercase">{u.role}</td>
                                <td className="py-2.5 px-4">
                                  {u.role !== 'super_admin' && (
                                    <select
                                      value={u.role}
                                      onChange={async (e) => {
                                        await updateUserRoleBySuperAdmin(u, e.target.value as 'student' | 'teacher' | 'admin', actorEmail);
                                        showToast('User role updated.', 'success');
                                        loadAdminOverview();
                                      }}
                                      className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg"
                                    >
                                      <option value="student">Student</option>
                                      <option value="teacher">Teacher</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
