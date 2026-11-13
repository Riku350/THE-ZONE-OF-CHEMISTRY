import React, { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  Edit3,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlayCircle,
  Plus,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { uploadMediaFile } from '../lib/mediaUpload.ts';
import { BackBar } from './BackBar.tsx';
import { ResilientImage } from './ResilientImage.tsx';
import { ImageCropModal } from './ImageCropModal.tsx';
import {
  addDocument,
  fetchTeacherPortalData,
  removeDocument,
  replyToStudentDoubt,
  saveBatchAttendance,
  sendTargetedNotification,
  setDocument,
} from '../lib/firestoreService.ts';
import type {
  Batch,
  Course,
  DoubtItem,
  HomeworkItem,
  HomeworkSubmission,
  LiveClass,
  MCQQuestion,
  RecordedLecture,
  StudentActivityRecord,
  StudentRecord,
  StudyMaterial,
  StudyMaterialCategory,
  TeacherRecord,
  TestItem,
  TimetableSlot,
} from '../types.ts';

type TeacherTab =
  | 'overview'
  | 'attendance'
  | 'live'
  | 'lectures'
  | 'materials'
  | 'homework'
  | 'tests'
  | 'doubts'
  | 'analytics'
  | 'notify'
  | 'timetable';

export function TeacherPortal() {
  const { firebaseUser, role, idToken, faculty, showToast, logout, navigate } = useApp();
  const [tab, setTab] = useState<TeacherTab>('overview');
  const [loading, setLoading] = useState(true);

  const [teacherRecord, setTeacherRecord] = useState<TeacherRecord | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [lectures, setLectures] = useState<RecordedLecture[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [studentActivity, setStudentActivity] = useState<StudentActivityRecord[]>([]);

  // Attendance marking state
  const [attBatchId, setAttBatchId] = useState('');
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attMap, setAttMap] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Leave'>>({});

  // Quick forms
  const [liveForm, setLiveForm] = useState({
    title: '',
    subject: 'Organic Chemistry',
    chapter: '',
    batchId: '',
    platform: 'Google Meet',
    joinUrl: '',
    scheduledAt: '',
    durationMinutes: 60,
  });

  const [editingLecId, setEditingLecId] = useState<string | null>(null);
  const [lecForm, setLecForm] = useState({
    title: '',
    description: '',
    courseId: '',
    batchId: '',
    chapter: '',
    lectureNumber: '1',
    duration: '45 mins',
    videoUrl: '',
    thumbnailUrl: '',
    videoSource: 'youtube' as 'youtube' | 'direct',
    isFreePreview: false,
  });

  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [matForm, setMatForm] = useState({
    title: '',
    category: 'PDF Notes' as StudyMaterialCategory,
    courseId: '',
    batchId: '',
    chapter: '',
    fileUrl: '',
    coverUrl: '',
  });

  const [hwForm, setHwForm] = useState({ title: '', description: '', courseId: '', batchId: '', chapter: '', dueDate: '' });
  const [resForm, setResForm] = useState({ testId: '', studentId: '', marksObtained: '', maxMarks: '100', rank: '1', remarks: '' });
  const [newTestForm, setNewTestForm] = useState({
    title: '',
    testType: 'Online MCQ' as TestItem['testType'],
    subject: 'Chemistry',
    courseId: '',
    batchId: '',
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: 30,
    maxMarks: 20,
    instructions: 'Select the single best answer for each question.',
  });
  const [mcqDrafts, setMcqDrafts] = useState<MCQQuestion[]>([
    { id: 'q1', question: '', options: ['', '', '', ''], correctIndex: 0, chapter: 'Organic Chemistry' },
  ]);

  const [doubtReplies, setDoubtReplies] = useState<Record<string, string>>({});
  const [notifyForm, setNotifyForm] = useState({ title: '', message: '', targetType: 'batch' as 'batch' | 'course' | 'all', targetId: '' });
  const [cropTarget, setCropTarget] = useState<'lecThumb' | 'matCover' | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function loadTeacherData() {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const d = await fetchTeacherPortalData(firebaseUser.email || '', role);
      setTeacherRecord(d.teacherRecord || null);
      setStudents(d.students || []);
      setBatches(d.batches || []);
      setCourses(d.courses || []);
      setLiveClasses(d.liveClasses || []);
      setLectures(d.recordedLectures || []);
      setMaterials(d.studyMaterials || []);
      setHomework(d.homework || []);
      setSubmissions(d.submissions || []);
      setTests(d.tests || []);
      setTimetable(d.timetable || []);
      setDoubts(d.doubts || []);
      setStudentActivity(d.studentActivity || []);
      if (d.batches?.[0]?.id && !attBatchId) setAttBatchId(d.batches[0].id);
    } catch (err: any) {
      showToast(err.message || 'Failed to load teacher workspace', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (firebaseUser && (role === 'teacher' || role === 'admin' || role === 'super_admin')) {
      loadTeacherData();
    } else {
      setLoading(false);
    }
  }, [firebaseUser?.uid, role]);

  if (!firebaseUser || (role !== 'teacher' && role !== 'admin' && role !== 'super_admin')) {
    return (
      <div className="min-h-[75vh] bg-slate-50 dark:bg-slate-950 flex flex-col">
        <BackBar title="Teacher Portal" backLabel="Back" fallbackPath="/" />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Teacher Access Required</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Only authorized faculty members or admins can access the Teacher Portal.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student-login')}
            className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const batchStudents = students.filter((s) => !attBatchId || s.batchId === attBatchId);
  const myFacultyCard =
    faculty.find((f) => f.name.toLowerCase().includes((teacherRecord?.name || firebaseUser.displayName || 'srivastav').toLowerCase())) ||
    faculty[0];

  async function saveAttendance() {
    try {
      const selectedBatch = batches.find((b) => b.id === attBatchId);
      const records = batchStudents.map((s) => ({
        studentId: s.id,
        studentUid: s.uid || '',
        studentName: s.name,
        admissionId: s.admissionId,
        status: attMap[s.id] || 'Present',
      }));
      await saveBatchAttendance(attBatchId, selectedBatch?.name || '', attDate, records, firebaseUser?.email || 'Teacher', role || 'teacher');
      showToast(`Attendance saved for ${records.length} students.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save attendance', 'error');
    }
  }

  async function createLive(e: React.FormEvent) {
    e.preventDefault();
    try {
      const b = batches.find((x) => x.id === liveForm.batchId) || batches[0];
      await addDocument('live_classes', {
        ...liveForm,
        batchId: b?.id || '',
        batchName: b?.name || '',
        courseId: b?.courseId || '',
        teacherName: teacherRecord?.name || myFacultyCard?.name || 'S. K. Srivastav',
        status: 'Upcoming',
        createdAt: new Date().toISOString(),
      });
      await sendTargetedNotification(
        {
          title: 'New Live Class Scheduled',
          message: `${liveForm.title} (${liveForm.platform}) on ${liveForm.scheduledAt}`,
          type: 'class',
          targetType: b?.id ? 'batch' : 'all',
          targetId: b?.id || '',
        },
        firebaseUser?.email || 'Teacher'
      );
      showToast('Live class scheduled.', 'success');
      setLiveForm({ title: '', subject: 'Organic Chemistry', chapter: '', batchId: '', platform: 'Google Meet', joinUrl: '', scheduledAt: '', durationMinutes: 60 });
      loadTeacherData();
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule live class', 'error');
    }
  }

  async function handleDirectVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadMediaFile(f, idToken, { courseId: lecForm.courseId });
      setLecForm((p) => ({ ...p, videoUrl: url, videoSource: 'direct' }));
      showToast('Video uploaded to protected server storage.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function saveLecture(e: React.FormEvent) {
    e.preventDefault();
    try {
      const c = courses.find((x) => x.id === lecForm.courseId) || courses[0];
      const payload = {
        ...lecForm,
        lectureNumber: Number(lecForm.lectureNumber || 1),
        courseId: c?.id || '',
        courseName: c?.title || '',
        platform: lecForm.videoSource === 'direct' ? 'Direct' : 'YouTube',
        published: true,
        publishDate: new Date().toISOString().slice(0, 10),
      };
      if (editingLecId) {
        await setDocument('recorded_lectures', editingLecId, payload);
        showToast('Lecture updated.', 'success');
      } else {
        await addDocument('recorded_lectures', payload);
        showToast('Recorded lecture published.', 'success');
      }
      setEditingLecId(null);
      setLecForm({
        title: '',
        description: '',
        courseId: '',
        batchId: '',
        chapter: '',
        lectureNumber: '1',
        duration: '45 mins',
        videoUrl: '',
        thumbnailUrl: '',
        videoSource: 'youtube',
        isFreePreview: false,
      });
      loadTeacherData();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish lecture', 'error');
    }
  }

  async function uploadMaterialPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadMediaFile(f, idToken, { courseId: matForm.courseId });
      setMatForm((p) => ({ ...p, fileUrl: url }));
      showToast('PDF / Document prepared.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function saveMaterial(e: React.FormEvent) {
    e.preventDefault();
    try {
      const c = courses.find((x) => x.id === matForm.courseId) || courses[0];
      const payload = {
        ...matForm,
        courseId: c?.id || '',
        courseName: c?.title || '',
        published: true,
        uploadedBy: teacherRecord?.name || firebaseUser?.displayName || firebaseUser?.email || 'S. K. Srivastav',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      if (editingMatId) {
        await setDocument('study_materials', editingMatId, payload);
        showToast('Study material updated.', 'success');
      } else {
        await addDocument('study_materials', payload);
        showToast('Study material published.', 'success');
      }
      setEditingMatId(null);
      setMatForm({ title: '', category: 'PDF Notes', courseId: '', batchId: '', chapter: '', fileUrl: '', coverUrl: '' });
      loadTeacherData();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish study material', 'error');
    }
  }

  async function createHomework(e: React.FormEvent) {
    e.preventDefault();
    try {
      const b = batches.find((x) => x.id === hwForm.batchId) || batches[0];
      await addDocument('homework', {
        ...hwForm,
        batchId: b?.id || '',
        batchName: b?.name || '',
        courseId: b?.courseId || '',
        assignedBy: teacherRecord?.name || firebaseUser?.displayName || 'S. K. Srivastav',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      showToast('Homework assigned.', 'success');
      setHwForm({ title: '', description: '', courseId: '', batchId: '', chapter: '', dueDate: '' });
      loadTeacherData();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign homework', 'error');
    }
  }

  async function createTest(e: React.FormEvent) {
    e.preventDefault();
    try {
      const b = batches.find((x) => x.id === newTestForm.batchId) || batches[0];
      const validQuestions = mcqDrafts.filter((q) => q.question.trim() && q.options.some((o) => o.trim()));
      await addDocument('tests', {
        ...newTestForm,
        batchId: b?.id || '',
        batchName: b?.name || 'All Batches',
        questions: validQuestions,
        createdAt: new Date().toISOString(),
      });
      showToast('MCQ Test published!', 'success');
      setNewTestForm({
        title: '',
        testType: 'Online MCQ',
        subject: 'Chemistry',
        courseId: '',
        batchId: '',
        date: new Date().toISOString().slice(0, 10),
        durationMinutes: 30,
        maxMarks: 20,
        instructions: 'Select the single best answer for each question.',
      });
      setMcqDrafts([{ id: 'q1', question: '', options: ['', '', '', ''], correctIndex: 0, chapter: 'Organic Chemistry' }]);
      loadTeacherData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create test', 'error');
    }
  }

  async function publishResult(e: React.FormEvent) {
    e.preventDefault();
    const t = tests.find((x) => x.id === resForm.testId) || tests[0];
    const s = students.find((x) => x.id === resForm.studentId);
    if (!s || !t) {
      showToast('Select a student and test.', 'error');
      return;
    }
    try {
      const maxMarks = Number(resForm.maxMarks || 100);
      const marksObtained = Number(resForm.marksObtained || 0);
      const percentage = Math.round((marksObtained / (maxMarks || 1)) * 100);
      await addDocument('test_results', {
        testId: t.id,
        testTitle: t.title,
        studentId: s.id,
        studentUid: s.uid || '',
        studentName: s.name,
        admissionId: s.admissionId,
        marksObtained,
        maxMarks,
        percentage,
        rank: Number(resForm.rank || 1),
        remarks: resForm.remarks,
        date: new Date().toISOString().slice(0, 10),
      });
      showToast('Student marks published.', 'success');
      setResForm({ testId: '', studentId: '', marksObtained: '', maxMarks: '100', rank: '1', remarks: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to publish result', 'error');
    }
  }

  async function handleAnswerDoubt(doubtId: string) {
    const reply = doubtReplies[doubtId]?.trim();
    if (!reply) return;
    try {
      await replyToStudentDoubt(doubtId, reply, teacherRecord?.name || firebaseUser?.displayName || 'Faculty');
      showToast('Reply sent to student!', 'success');
      loadTeacherData();
    } catch (err: any) {
      showToast(err.message || 'Failed to send reply', 'error');
    }
  }

  async function handleSendBatchNotification(e: React.FormEvent) {
    e.preventDefault();
    try {
      await sendTargetedNotification(
        {
          title: notifyForm.title.trim(),
          message: notifyForm.message.trim(),
          type: 'notice',
          targetType: notifyForm.targetType,
          targetId: notifyForm.targetId,
        },
        firebaseUser?.email || 'Teacher'
      );
      showToast('Notification broadcasted!', 'success');
      setNotifyForm({ title: '', message: '', targetType: 'batch', targetId: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to send notification', 'error');
    }
  }

  const tabs: { id: TeacherTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Assigned Students', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'attendance', label: 'Mark Attendance', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'live', label: 'Live Classes', icon: <Video className="w-4 h-4" /> },
    { id: 'lectures', label: 'Recorded Lectures', icon: <PlayCircle className="w-4 h-4" /> },
    { id: 'materials', label: 'Study Materials', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'homework', label: 'Homework', icon: <FileText className="w-4 h-4" /> },
    { id: 'tests', label: 'Tests & Marks', icon: <Award className="w-4 h-4" /> },
    { id: 'doubts', label: `Doubts (${doubts.filter((d) => d.status === 'Open').length})`, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'analytics', label: 'Student Analytics', icon: <Activity className="w-4 h-4" /> },
    { id: 'notify', label: 'Notify Batch', icon: <Bell className="w-4 h-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Calendar className="w-4 h-4" /> },
  ];

  const activeLabel = tabs.find((t) => t.id === tab)?.label || 'Teacher Workspace';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onCancel={() => {
            setCropFile(null);
            setCropTarget(null);
          }}
          onConfirm={(url) => {
            if (cropTarget === 'lecThumb') setLecForm((p) => ({ ...p, thumbnailUrl: url }));
            if (cropTarget === 'matCover') setMatForm((p) => ({ ...p, coverUrl: url }));
            setCropFile(null);
            setCropTarget(null);
          }}
        />
      )}

      <BackBar
        title={tab === 'overview' ? 'Teacher Portal' : activeLabel}
        backLabel={tab === 'overview' ? 'Home' : 'Back'}
        fallbackPath="/"
        onBack={tab === 'overview' ? undefined : () => setTab('overview')}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0">
          <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            {myFacultyCard?.photoUrl && (
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                <ResilientImage src={myFacultyCard.photoUrl} alt={myFacultyCard.name} className="w-full h-full object-cover object-top" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700 dark:text-sky-400">Faculty Workspace</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{teacherRecord?.name || myFacultyCard?.name || 'Teacher Dashboard'}</p>
            </div>
          </div>
          <nav className="space-y-1 flex-1 overflow-y-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                  tab === t.id ? 'bg-blue-700 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t.icon} <span>{t.label}</span>
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

        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 max-w-[1180px] w-full mx-auto">
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-3 mb-5 no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  tab === t.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-blue-800 dark:text-sky-300">
                        Scoped Access: {batches.length} Assigned Batches · {courses.length} Courses · {students.length} Students
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {batches.map((b) => b.name).join(' · ') || 'Full Institute Faculty Access'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4">Admission ID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Course &amp; Batch</th>
                          <th className="py-3 px-4">Mobile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {students.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2.5 px-4 font-mono">{s.admissionId}</td>
                            <td className="py-2.5 px-4 font-semibold">{s.name}</td>
                            <td className="py-2.5 px-4">{s.courseName} · {s.batchName}</td>
                            <td className="py-2.5 px-4 tabular-nums">{s.mobile}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'attendance' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daily Attendance Marking</h2>
                  <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <select value={attBatchId} onChange={(e) => setAttBatchId(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <button type="button" onClick={saveAttendance} className="min-h-[42px] px-5 py-2 text-sm font-semibold text-white bg-blue-700 rounded-xl">
                      Save Attendance
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {batchStudents.map((s) => (
                      <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</p>
                          <p className="text-xs font-mono text-slate-500">{s.admissionId}</p>
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

              {tab === 'live' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Schedule Live Class</h2>
                  <form onSubmit={createLive} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <input type="text" required placeholder="Class Topic Title" value={liveForm.title} onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="text" required placeholder="Chapter" value={liveForm.chapter} onChange={(e) => setLiveForm({ ...liveForm, chapter: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <select value={liveForm.batchId} onChange={(e) => setLiveForm({ ...liveForm, batchId: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Select Batch</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select value={liveForm.platform} onChange={(e) => setLiveForm({ ...liveForm, platform: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="Google Meet">Google Meet</option>
                      <option value="Zoom">Zoom</option>
                      <option value="YouTube Live">YouTube Live</option>
                      <option value="Jitsi">Jitsi</option>
                    </select>
                    <input type="url" required placeholder="Join URL (https://meet.google.com/...)" value={liveForm.joinUrl} onChange={(e) => setLiveForm({ ...liveForm, joinUrl: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="text" required placeholder="Date & Time (e.g. 2026-11-16 07:00 AM)" value={liveForm.scheduledAt} onChange={(e) => setLiveForm({ ...liveForm, scheduledAt: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <button type="submit" className="sm:col-span-2 min-h-[44px] py-2.5 font-semibold text-white bg-blue-700 rounded-xl">Publish Live Class</button>
                  </form>
                  <div className="space-y-2">
                    {liveClasses.map((lc) => (
                      <div key={lc.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{lc.title}</p>
                          <p className="text-xs text-slate-500">{lc.platform} · {lc.batchName} · {lc.scheduledAt}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <a href={lc.joinUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-700 dark:text-sky-400">Open Link</a>
                          <button type="button" onClick={async () => { await removeDocument('live_classes', lc.id); loadTeacherData(); }} className="text-xs text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'lectures' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingLecId ? 'Edit Recorded Lecture' : 'Publish Recorded Lecture'}
                  </h2>
                  <form onSubmit={saveLecture} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <input type="text" required placeholder="Lecture Title" value={lecForm.title} onChange={(e) => setLecForm({ ...lecForm, title: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="text" required placeholder="Chapter Name" value={lecForm.chapter} onChange={(e) => setLecForm({ ...lecForm, chapter: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <select value={lecForm.courseId} onChange={(e) => setLecForm({ ...lecForm, courseId: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Select Course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min={1} placeholder="Lecture #" value={lecForm.lectureNumber} onChange={(e) => setLecForm({ ...lecForm, lectureNumber: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="text" placeholder="Duration (e.g. 48 mins)" value={lecForm.duration} onChange={(e) => setLecForm({ ...lecForm, duration: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    </div>
                    <select value={lecForm.videoSource} onChange={(e) => setLecForm({ ...lecForm, videoSource: e.target.value as 'youtube' | 'direct' })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="youtube">YouTube / Vimeo URL</option>
                      <option value="direct">Direct MP4 / WebM Upload</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs font-semibold px-2">
                      <input type="checkbox" checked={lecForm.isFreePreview} onChange={(e) => setLecForm({ ...lecForm, isFreePreview: e.target.checked })} />
                      Allow Free Preview for Non-Enrolled Visitors
                    </label>
                    <div className="sm:col-span-2 flex flex-wrap gap-2">
                      <input type="text" required placeholder={lecForm.videoSource === 'direct' ? 'Upload video file or paste direct MP4 link' : 'YouTube / Embed URL'} value={lecForm.videoUrl} onChange={(e) => setLecForm({ ...lecForm, videoUrl: e.target.value })} className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <label className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl cursor-pointer inline-flex items-center gap-1.5">
                        <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Video'}
                        <input type="file" accept="video/mp4,video/webm" onChange={handleDirectVideoUpload} className="hidden" />
                      </label>
                      <label className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-300 rounded-xl cursor-pointer inline-flex items-center gap-1.5">
                        Thumbnail
                        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCropTarget('lecThumb'); setCropFile(f); } e.target.value = ''; }} className="hidden" />
                      </label>
                    </div>
                    <input type="text" placeholder="Short description" value={lecForm.description} onChange={(e) => setLecForm({ ...lecForm, description: e.target.value })} className="sm:col-span-2 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <button type="submit" className="sm:col-span-2 min-h-[44px] py-2.5 font-semibold text-white bg-blue-700 rounded-xl">
                      {editingLecId ? 'Update Recorded Lecture' : 'Publish Recorded Lecture'}
                    </button>
                  </form>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {lectures.map((lec) => (
                      <div key={lec.id} className="p-4 flex justify-between items-center gap-3 text-sm">
                        <div>
                          <p className="text-xs text-blue-700 dark:text-sky-400">{lec.chapter} · Lec {lec.lectureNumber || 1} {lec.isFreePreview ? '· Free Preview' : ''}</p>
                          <p className="font-bold text-slate-900 dark:text-white">{lec.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLecId(lec.id);
                              setLecForm({
                                title: lec.title,
                                description: lec.description,
                                courseId: lec.courseId,
                                batchId: lec.batchId,
                                chapter: lec.chapter,
                                lectureNumber: String(lec.lectureNumber || 1),
                                duration: lec.duration,
                                videoUrl: lec.videoUrl,
                                thumbnailUrl: lec.thumbnailUrl || '',
                                videoSource: lec.videoSource || 'youtube',
                                isFreePreview: Boolean(lec.isFreePreview),
                              });
                            }}
                            className="p-2 text-blue-700 dark:text-sky-400"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={async () => { await removeDocument('recorded_lectures', lec.id); loadTeacherData(); }} className="p-2 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'materials' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingMatId ? 'Edit Study Material' : 'Upload Study Material & Notes'}
                  </h2>
                  <form onSubmit={saveMaterial} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <input type="text" required placeholder="Material Title" value={matForm.title} onChange={(e) => setMatForm({ ...matForm, title: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <select value={matForm.category} onChange={(e) => setMatForm({ ...matForm, category: e.target.value as StudyMaterialCategory })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      {(['PDF Notes', 'NCERT Notes', 'Important Questions', 'PYQ', 'Assignment', 'Worksheet', 'Test Paper', 'Answer Key', 'DPP', 'Mock Test'] as StudyMaterialCategory[]).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input type="text" required placeholder="Chapter Name" value={matForm.chapter} onChange={(e) => setMatForm({ ...matForm, chapter: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <select value={matForm.courseId} onChange={(e) => setMatForm({ ...matForm, courseId: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Public / Select Course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                      <input type="text" required placeholder="PDF URL or upload below" value={matForm.fileUrl} onChange={(e) => setMatForm({ ...matForm, fileUrl: e.target.value })} className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <label className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-700 text-white rounded-xl cursor-pointer inline-flex items-center gap-1.5">
                        <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload PDF'}
                        <input type="file" accept="application/pdf,image/*" onChange={uploadMaterialPdf} className="hidden" />
                      </label>
                      <label className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-300 rounded-xl cursor-pointer inline-flex items-center gap-1.5">
                        Cover Poster
                        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCropTarget('matCover'); setCropFile(f); } e.target.value = ''; }} className="hidden" />
                      </label>
                    </div>
                    <button type="submit" className="sm:col-span-2 min-h-[44px] py-2.5 font-semibold text-white bg-blue-700 rounded-xl">
                      {editingMatId ? 'Update Study Material' : 'Publish Study Material'}
                    </button>
                  </form>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {materials.map((m) => (
                      <div key={m.id} className="p-4 flex justify-between items-center text-sm gap-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{m.title}</p>
                          <p className="text-xs text-slate-500">{m.category} · {m.chapter}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-700 dark:text-sky-400">Open File</a>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMatId(m.id);
                              setMatForm({
                                title: m.title,
                                category: m.category,
                                courseId: m.courseId,
                                batchId: m.batchId,
                                chapter: m.chapter,
                                fileUrl: m.fileUrl,
                                coverUrl: m.coverUrl || '',
                              });
                            }}
                            className="p-2 text-blue-700"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={async () => { await removeDocument('study_materials', m.id); loadTeacherData(); }} className="p-2 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'homework' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assign Homework &amp; Review Submissions</h2>
                  <form onSubmit={createHomework} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <input type="text" required placeholder="Homework Title" value={hwForm.title} onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="date" required value={hwForm.dueDate} onChange={(e) => setHwForm({ ...hwForm, dueDate: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <select value={hwForm.batchId} onChange={(e) => setHwForm({ ...hwForm, batchId: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Select Batch</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <input type="text" required placeholder="Chapter" value={hwForm.chapter} onChange={(e) => setHwForm({ ...hwForm, chapter: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <textarea placeholder="Assignment Instructions" value={hwForm.description} onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })} className="sm:col-span-2 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <button type="submit" className="sm:col-span-2 min-h-[44px] py-2.5 font-semibold text-white bg-blue-700 rounded-xl">Assign Homework</button>
                  </form>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                    <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">Student Submissions ({submissions.length})</h3>
                    {submissions.map((sub) => (
                      <div key={sub.id} className="py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{sub.studentName} — {sub.homeworkTitle}</p>
                          <p className="text-xs text-slate-500">{sub.status}</p>
                        </div>
                        <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-700 dark:text-sky-400">View Submission</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'tests' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Online MCQ Test</h2>
                  <form onSubmit={createTest} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" required placeholder="Test Title" value={newTestForm.title} onChange={(e) => setNewTestForm({ ...newTestForm, title: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <select value={newTestForm.batchId} onChange={(e) => setNewTestForm({ ...newTestForm, batchId: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                        <option value="">All Batches</option>
                        {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <input type="number" placeholder="Duration (mins)" value={newTestForm.durationMinutes} onChange={(e) => setNewTestForm({ ...newTestForm, durationMinutes: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                      <input type="number" placeholder="Max Marks" value={newTestForm.maxMarks} onChange={(e) => setNewTestForm({ ...newTestForm, maxMarks: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    </div>

                    <div className="space-y-3">
                      {mcqDrafts.map((q, qIdx) => (
                        <div key={q.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                          <input
                            type="text"
                            placeholder={`Question ${qIdx + 1}`}
                            value={q.question}
                            onChange={(e) => {
                              const copy = [...mcqDrafts];
                              copy[qIdx] = { ...copy[qIdx], question: e.target.value };
                              setMcqDrafts(copy);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => (
                              <input
                                key={oIdx}
                                type="text"
                                placeholder={`Option ${oIdx + 1}`}
                                value={opt}
                                onChange={(e) => {
                                  const copy = [...mcqDrafts];
                                  const opts = [...copy[qIdx].options];
                                  opts[oIdx] = e.target.value;
                                  copy[qIdx] = { ...copy[qIdx], options: opts };
                                  setMcqDrafts(copy);
                                }}
                                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs"
                              />
                            ))}
                          </div>
                          <select
                            value={q.correctIndex}
                            onChange={(e) => {
                              const copy = [...mcqDrafts];
                              copy[qIdx] = { ...copy[qIdx], correctIndex: Number(e.target.value) };
                              setMcqDrafts(copy);
                            }}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs"
                          >
                            {[0, 1, 2, 3].map((i) => <option key={i} value={i}>Correct: Option {i + 1}</option>)}
                          </select>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMcqDrafts((p) => [...p, { id: `q_${Date.now()}`, question: '', options: ['', '', '', ''], correctIndex: 0, chapter: 'Chemistry' }])}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-400 text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Question
                      </button>
                    </div>
                    <button type="submit" className="min-h-[44px] px-5 py-2.5 font-semibold text-white bg-blue-700 rounded-xl">Publish Online Test</button>
                  </form>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Publish Offline Test Marks &amp; Ranks</h3>
                  <form onSubmit={publishResult} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <select required value={resForm.testId} onChange={(e) => setResForm({ ...resForm, testId: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Select Test</option>
                      {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                    <select required value={resForm.studentId} onChange={(e) => setResForm({ ...resForm, studentId: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="">Select Student</option>
                      {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admissionId})</option>)}
                    </select>
                    <input type="number" required placeholder="Marks Obtained" value={resForm.marksObtained} onChange={(e) => setResForm({ ...resForm, marksObtained: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="number" required placeholder="Max Marks" value={resForm.maxMarks} onChange={(e) => setResForm({ ...resForm, maxMarks: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="number" placeholder="Rank" value={resForm.rank} onChange={(e) => setResForm({ ...resForm, rank: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <input type="text" placeholder="Teacher Remarks" value={resForm.remarks} onChange={(e) => setResForm({ ...resForm, remarks: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <button type="submit" className="sm:col-span-2 min-h-[44px] py-2.5 font-semibold text-white bg-blue-700 rounded-xl">Publish Result</button>
                  </form>
                </div>
              )}

              {tab === 'doubts' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Student Chemistry Doubts ({doubts.length})</h2>
                  {doubts.length === 0 ? (
                    <p className="text-sm text-slate-500">No doubts submitted yet.</p>
                  ) : (
                    doubts.map((d) => (
                      <div key={d.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-blue-700 dark:text-sky-400">{d.studentName} · {d.courseTitle} ({d.chapter})</span>
                          <span className="font-semibold">{d.status}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{d.question}</p>
                        {d.reply ? (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl">
                            Answered: {d.reply}
                          </p>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type clear explanation / answer..."
                              value={doubtReplies[d.id] || ''}
                              onChange={(e) => setDoubtReplies({ ...doubtReplies, [d.id]: e.target.value })}
                              className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => handleAnswerDoubt(d.id)}
                              className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold"
                            >
                              Send Reply
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'analytics' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assigned Student Activity &amp; Progress</h2>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Logins</th>
                          <th className="py-3 px-4">Study Time</th>
                          <th className="py-3 px-4">Last Video</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {studentActivity.length === 0 ? (
                          <tr><td colSpan={5} className="py-6 text-center text-slate-500">No student activity logged yet.</td></tr>
                        ) : (
                          studentActivity.map((a) => (
                            <tr key={a.id}>
                              <td className="py-3 px-4 font-semibold">{a.studentName}<span className="block text-[11px] text-slate-400">{a.deviceType}</span></td>
                              <td className="py-3 px-4">
                                <span className={`text-xs font-bold ${a.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {a.isOnline ? 'Online Now' : 'Offline'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono tabular-nums">{a.totalLoginCount}</td>
                              <td className="py-3 px-4 font-mono tabular-nums">{a.studyTimeMinutes} mins</td>
                              <td className="py-3 px-4 text-xs">{a.lastWatchedLectureTitle || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'notify' && (
                <div className="max-w-xl space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Send Batch / Course Notification</h2>
                  <form onSubmit={handleSendBatchNotification} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-sm">
                    <select value={notifyForm.targetType} onChange={(e) => setNotifyForm({ ...notifyForm, targetType: e.target.value as any, targetId: '' })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                      <option value="batch">Specific Batch</option>
                      <option value="course">Specific Course</option>
                      <option value="all">All Assigned Students</option>
                    </select>
                    {notifyForm.targetType === 'batch' && (
                      <select value={notifyForm.targetId} onChange={(e) => setNotifyForm({ ...notifyForm, targetId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                        <option value="">Select Batch</option>
                        {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}
                    {notifyForm.targetType === 'course' && (
                      <select value={notifyForm.targetId} onChange={(e) => setNotifyForm({ ...notifyForm, targetId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl">
                        <option value="">Select Course</option>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    )}
                    <input type="text" required placeholder="Notification Title" value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <textarea rows={3} required placeholder="Message for students..." value={notifyForm.message} onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl" />
                    <button type="submit" className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl">Send Notification</button>
                  </form>
                </div>
              )}

              {tab === 'timetable' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Faculty Timetable</h2>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {timetable.map((t) => (
                      <div key={t.id} className="p-4 text-sm flex justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t.title}</p>
                          <p className="text-xs text-slate-500">{t.batchName} · {t.room}</p>
                        </div>
                        <div className="text-right text-xs font-mono tabular-nums">{t.date || t.dayOfWeek} · {t.startTime} – {t.endTime}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
