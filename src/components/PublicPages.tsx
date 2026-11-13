import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileCheck,
  HelpCircle,
  ImagePlus,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  PlayCircle,
  Printer,
  Search,
  Trophy,
  Users,
  Video,
  X,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useApp } from '../context/AppContext.tsx';
import { db } from '../lib/firebase.ts';
import { ResilientImage } from './ResilientImage.tsx';
import { BackBar } from './BackBar.tsx';
import { ImageCropModal } from './ImageCropModal.tsx';
import { ChemistryVideoPlayer } from './ChemistryVideoPlayer.tsx';
import { exportHtmlToPrintPdf } from '../lib/exportUtils.ts';
import {
  INITIAL_LECTURES,
  INITIAL_LIVE_CLASSES,
  INITIAL_MATERIALS,
  INITIAL_TESTS,
} from '../lib/seedData.ts';
import {
  lookupAdmissionStatus,
  saveStudentDownload,
  saveStudentLectureProgress,
  submitAdmissionApplication,
  submitEnquiryForm,
  submitStudentMcqTest,
} from '../lib/firestoreService.ts';
import type {
  AdmissionApplication,
  LiveClass,
  RecordedLecture,
  StudyMaterial,
  TestItem,
  TestResult,
} from '../types.ts';

export function AboutPage() {
  const { settings, faculty, navigate } = useApp();
  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen">
      <BackBar title="About Institute" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 aspect-[4/3]">
              <ResilientImage src={settings.directorPhotoUrl} alt={settings.directorName} className="w-full h-full object-cover object-top" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 mb-1">Director &amp; Chief Mentor</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Prof. {settings.directorName}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-5">{settings.aboutText}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-5">
              <div>
                <p className="text-xs text-slate-500">Qualification</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{settings.directorQualification}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Experience</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{settings.directorExperience}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Specialization</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{settings.directorSubjects}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Campus Location</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{settings.address}</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 italic mb-6">“{settings.directorPhilosophy}”</p>
            <button
              type="button"
              onClick={() => navigate('/admissions')}
              className="min-h-[44px] px-6 py-2.5 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
            >
              Apply for Admission
            </button>
          </div>
        </div>

        {faculty.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Faculty Team</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faculty.map((f) => (
                <div key={f.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                    <ResilientImage src={f.photoUrl} alt={f.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{f.name}</p>
                    <p className="text-xs text-blue-700 dark:text-sky-400">{f.subjects}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{f.qualification} · {f.experience}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CoursesPage({ courseId }: { courseId?: string }) {
  const {
    courses,
    batches,
    enrollments,
    role,
    idToken,
    firebaseUser,
    searchQuery,
    openCheckout,
    navigate,
    showToast,
  } = useApp();
  const [filter, setFilter] = useState('All');
  const [localQ, setLocalQ] = useState('');
  const [courseLectures, setCourseLectures] = useState<RecordedLecture[]>(INITIAL_LECTURES);
  const [courseMaterials, setCourseMaterials] = useState<StudyMaterial[]>(INITIAL_MATERIALS);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [selectedLecture, setSelectedLecture] = useState<RecordedLecture | null>(null);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      getDocs(query(collection(db, 'recorded_lectures'), where('courseId', '==', courseId))).catch(() => null),
      getDocs(query(collection(db, 'study_materials'), where('courseId', '==', courseId))).catch(() => null),
    ]).then(([lSnap, mSnap]) => {
      if (lSnap && !lSnap.empty) {
        const list = lSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<RecordedLecture, 'id'>) }))
          .filter((l) => l.published !== false)
          .sort((a, b) => Number(a.lectureNumber || 1) - Number(b.lectureNumber || 1));
        setCourseLectures(list);
      } else {
        setCourseLectures(INITIAL_LECTURES.filter((l) => l.courseId === courseId));
      }
      if (mSnap && !mSnap.empty) {
        setCourseMaterials(
          mSnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<StudyMaterial, 'id'>) }))
            .filter((m) => m.published !== false)
        );
      } else {
        setCourseMaterials(INITIAL_MATERIALS.filter((m) => m.courseId === courseId));
      }
    });
  }, [courseId]);

  const q = localQ || searchQuery;

  if (courseId) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
          <BackBar title="Course Not Found" backLabel="Back to Courses" fallbackPath="/courses" />
          <div className="max-w-lg mx-auto px-4 py-16 text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Course Not Found</h2>
            <button type="button" onClick={() => navigate('/courses')} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl">
              Browse All Courses
            </button>
          </div>
        </div>
      );
    }

    const matchingBatches = batches.filter((b) => b.courseId === course.id);
    const discountPct =
      course.discountPercent ||
      (course.mrpPrice && course.mrpPrice > course.fees
        ? Math.round(((course.mrpPrice - course.fees) / course.mrpPrice) * 100)
        : 0);

    const isEnrolled =
      enrollments.some((e) => e.courseId === course.id && e.status === 'Active') ||
      role === 'super_admin' ||
      role === 'admin' ||
      role === 'teacher' ||
      Number(course.fees) <= 0;

    // Group lectures by chapter
    const chaptersMap: Record<string, RecordedLecture[]> = {};
    courseLectures.forEach((lec) => {
      const key = lec.chapter || 'General Chemistry';
      if (!chaptersMap[key]) chaptersMap[key] = [];
      chaptersMap[key].push(lec);
    });
    const chapterNames = Object.keys(chaptersMap);

    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 pb-24">
        <BackBar title={course.title} backLabel="Back to Courses" fallbackPath="/courses" />

        <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center max-h-80">
                <ResilientImage src={course.imageUrl} alt={course.title} className="w-full max-h-80 object-contain" />
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-semibold text-blue-700 dark:text-sky-400">
                {course.examTrack || course.category} · {course.duration} · {isEnrolled ? 'Course Unlocked' : course.statusLabel || 'Admissions Open'}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{course.title}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{course.description}</p>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">Teacher</span>
                  <span className="font-bold text-slate-900 dark:text-white">{course.teacherName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Live Schedule</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{course.liveSchedule || course.batchAvailability}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Fees</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-blue-700 dark:text-sky-400">
                    {Number(course.fees) <= 0 ? 'FREE' : `₹${Number(course.fees).toLocaleString('en-IN')}`}
                  </span>
                  {course.mrpPrice && course.mrpPrice > course.fees && (
                    <del className="ml-2 text-xs text-slate-400 font-mono tabular-nums">
                      ₹{Number(course.mrpPrice).toLocaleString('en-IN')}
                    </del>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Discount &amp; Duration</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">
                    {discountPct > 0 ? `${discountPct}% OFF · ` : ''}{course.duration}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {isEnrolled ? (
                  <button
                    type="button"
                    onClick={() => navigate('/student?tab=lectures')}
                    className="flex-1 min-h-[48px] px-6 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl inline-flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" /> Open Student Lectures
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCheckout(course)}
                    className="flex-1 min-h-[48px] px-6 py-3 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl inline-flex items-center justify-center gap-2"
                  >
                    Buy Now / Enroll Online <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/admissions?course=${course.id}`)}
                  className="min-h-[48px] px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Offline Form
                </button>
              </div>
            </div>
          </div>

          {/* Inline Lecture Preview / Player */}
          {selectedLecture && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-blue-700 dark:text-sky-400 uppercase tracking-wider">
                  Course Classroom Player
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedLecture(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Hide Player
                </button>
              </div>
              <ChemistryVideoPlayer
                lecture={selectedLecture}
                idToken={idToken}
                isUnlocked={isEnrolled}
                onUnlockClick={() => openCheckout(course)}
                onProgressSave={
                  firebaseUser
                    ? (completed, pct, pos, dur) => {
                        saveStudentLectureProgress(firebaseUser.uid, selectedLecture, completed, pct, pos, dur).catch(() => {});
                        if (completed) showToast('Lecture marked complete!', 'success');
                      }
                    : undefined
                }
              />
            </div>
          )}

          {/* Chapter-wise Video Lectures Accordion */}
          {chapterNames.length > 0 && (
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chapter-Wise Lectures ({courseLectures.length})
                </h3>
                {!isEnrolled && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Free Previews Open · Full Access After Enroll
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {chapterNames.map((ch, idx) => {
                  const isOpen = openChapters[ch] ?? idx === 0;
                  const chLectures = chaptersMap[ch];
                  return (
                    <div key={ch} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenChapters((p) => ({ ...p, [ch]: !isOpen }))}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between text-left"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{ch}</p>
                          <p className="text-[11px] text-slate-500">{chLectures.length} lectures</p>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {chLectures.map((lec) => {
                            const accessible = isEnrolled || lec.isFreePreview;
                            return (
                              <div key={lec.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                    Lecture {lec.lectureNumber || 1}: {lec.title}
                                  </p>
                                  <p className="text-[11px] text-slate-500 tabular-nums">
                                    {lec.duration} · {lec.isFreePreview && !isEnrolled ? 'Free Preview' : accessible ? 'Unlocked' : 'Locked'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLecture(lec)}
                                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 ${
                                    accessible
                                      ? 'bg-blue-700 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {accessible ? <PlayCircle className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                  {accessible ? 'Watch' : 'Preview'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chapters, Syllabus & Materials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {course.chapters && course.chapters.length > 0 && (
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Key Chemistry Chapters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.chapters.map((ch, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200">
                      {idx + 1}. {ch}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Syllabus Highlights</h3>
              <ul className="space-y-2">
                {(course.syllabus || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-mono text-xs text-blue-700 dark:text-sky-400 font-bold tabular-nums mt-0.5">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Course PDF Materials */}
          {courseMaterials.length > 0 && (
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Course Notes &amp; Worksheets</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courseMaterials.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-blue-700 dark:text-sky-400">{m.category}</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{m.title}</p>
                    </div>
                    {isEnrolled ? (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-300 text-xs font-bold shrink-0 inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openCheckout(course)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-bold shrink-0 inline-flex items-center gap-1"
                      >
                        <Lock className="w-3.5 h-3.5" /> Unlock
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batches & Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <p className="text-xs font-bold text-blue-700 dark:text-sky-400 mb-1">Active Batches</p>
              {matchingBatches.length > 0 ? (
                matchingBatches.map((b) => (
                  <p key={b.id} className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {b.name} · {b.timing} ({b.mode})
                  </p>
                ))
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400">{course.batchAvailability}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/study')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-blue-400"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-sky-400">Study Hub</span>
                <PlayCircle className="w-4 h-4 text-blue-700 dark:text-sky-400" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">Watch Demo &amp; Chapter Videos</p>
            </button>

            <button
              type="button"
              onClick={() => navigate(firebaseUser ? '/student?tab=doubts' : '/student-login')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-blue-400"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Ask Chemistry Doubt</span>
                <BookOpen className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">Direct Teacher Q&amp;A</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categories = ['All', 'Class 11', 'Class 12', 'NEET', 'IIT-JEE', 'Dropper', 'Bihar Board', 'CBSE'];
  const list = courses.filter((c) => {
    const matchCat = filter === 'All' || c.category === filter || (c.examTrack || '').includes(filter);
    const matchQ = !q.trim() || c.title.toLowerCase().includes(q.toLowerCase()) || c.subjects.toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="All Courses" backLabel="Home" fallbackPath="/" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search chemistry courses..."
              className="w-full h-10 pl-9 pr-3 text-sm bg-slate-100 dark:bg-slate-800 rounded-xl border border-transparent focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 ${
                  filter === cat ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((course) => {
            const isEnrolled = enrollments.some((e) => e.courseId === course.id && e.status === 'Active');
            return (
              <div key={course.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <button type="button" onClick={() => navigate(`/courses/${course.id}`)} className="w-full h-48 bg-slate-950 overflow-hidden flex items-center justify-center">
                  <ResilientImage src={course.imageUrl} alt={course.title} className="w-full h-full object-contain" />
                </button>
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 mb-1">
                    {course.examTrack || course.category} · {course.duration}
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{course.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Teacher: {course.teacherName}</p>
                  <div className="flex items-baseline justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mb-4 mt-auto">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {Number(course.fees) <= 0 ? 'FREE' : `₹${Number(course.fees).toLocaleString('en-IN')}`}
                      </span>
                      {course.mrpPrice && <del className="text-xs text-slate-400 font-mono tabular-nums">₹{Number(course.mrpPrice).toLocaleString('en-IN')}</del>}
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {isEnrolled ? 'Enrolled' : course.statusLabel || 'Open'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => (isEnrolled ? navigate(`/courses/${course.id}`) : openCheckout(course))}
                      className="flex-1 min-h-[44px] py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
                    >
                      {isEnrolled ? 'Continue Learning' : Number(course.fees) <= 0 ? 'Enroll Free →' : 'Buy Now →'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl"
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
  );
}

export function BatchesPage() {
  const { batches, timetable, navigate } = useApp();
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Batches & Timetable" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {batches.map((b) => (
            <div key={b.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
              {b.posterUrl && (
                <div className="aspect-[16/9] bg-slate-100">
                  <ResilientImage src={b.posterUrl} alt={b.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 mb-1">{b.mode} · {b.days}</p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{b.name}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{b.courseName}</p>
                <div className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4">
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> <span className="tabular-nums">{b.timing}</span></div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> <span className="tabular-nums">{Math.max(0, b.capacity - (b.enrolledCount || 0))} / {b.capacity} seats left</span></div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                  <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">₹{Number(b.fees).toLocaleString('en-IN')}</span>
                  <button type="button" onClick={() => navigate(`/admissions?batch=${b.id}`)} className="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-blue-700 rounded-xl">
                    Join Batch →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">Weekly Class &amp; Test Schedule</h2>
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold">Class / Event</th>
                <th className="py-3 px-4 font-semibold">Day / Date</th>
                <th className="py-3 px-4 font-semibold">Timing</th>
                <th className="py-3 px-4 font-semibold">Room / Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {timetable.map((slot) => (
                <tr key={slot.id}>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{slot.title}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-600 dark:text-slate-300">{slot.date || slot.dayOfWeek}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-600 dark:text-slate-300">{slot.startTime} – {slot.endTime}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{slot.batchName} · {slot.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function StudyHubPage() {
  const { firebaseUser, idToken, courses, enrollments, role, openCheckout, showToast, navigate } = useApp();
  const [materials, setMaterials] = useState<StudyMaterial[]>(INITIAL_MATERIALS);
  const [lectures, setLectures] = useState<RecordedLecture[]>(INITIAL_LECTURES);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>(INITIAL_LIVE_CLASSES);
  const [activeVideo, setActiveVideo] = useState<RecordedLecture | null>(null);
  const [matCategory, setMatCategory] = useState<string>('All');
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'study_materials')).catch(() => null),
      getDocs(collection(db, 'recorded_lectures')).catch(() => null),
      getDocs(collection(db, 'live_classes')).catch(() => null),
    ]).then(([mSnap, lSnap, lcSnap]) => {
      if (mSnap && !mSnap.empty) {
        setMaterials(
          mSnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<StudyMaterial, 'id'>) }))
            .filter((m) => m.published !== false)
        );
      }
      if (lSnap && !lSnap.empty) {
        setLectures(
          lSnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<RecordedLecture, 'id'>) }))
            .filter((l) => l.published !== false)
        );
      }
      if (lcSnap && !lcSnap.empty) setLiveClasses(lcSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LiveClass, 'id'>) })));
    });
  }, []);

  const isCourseUnlocked = (cId: string) => {
    if (!cId) return true;
    if (role === 'super_admin' || role === 'admin' || role === 'teacher') return true;
    const course = courses.find((c) => c.id === cId);
    if (course && Number(course.fees) <= 0) return true;
    return enrollments.some((e) => e.courseId === cId && e.status === 'Active');
  };

  async function handleDownloadMaterial(m: StudyMaterial) {
    if (!isCourseUnlocked(m.courseId)) {
      const targetCourse = courses.find((c) => c.id === m.courseId);
      if (targetCourse) openCheckout(targetCourse);
      else showToast('Enroll in this course to download protected notes.', 'info');
      return;
    }
    if (firebaseUser) {
      await saveStudentDownload(firebaseUser, m).catch(() => {});
      showToast(`Saved "${m.title}" to My Downloads`, 'success');
    }
    setPreviewMaterial(m);
  }

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

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Study Hub & Materials" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        {activeVideo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-sky-400">Chemistry Classroom Player</span>
              <button type="button" onClick={() => setActiveVideo(null)} className="text-xs font-semibold text-slate-500">
                Close Player
              </button>
            </div>
            <ChemistryVideoPlayer
              lecture={activeVideo}
              idToken={idToken}
              isUnlocked={isCourseUnlocked(activeVideo.courseId)}
              onUnlockClick={() => {
                const targetCourse = courses.find((c) => c.id === activeVideo.courseId);
                if (targetCourse) openCheckout(targetCourse);
              }}
              onProgressSave={
                firebaseUser
                  ? (completed, pct, pos, dur) => {
                      saveStudentLectureProgress(firebaseUser.uid, activeVideo, completed, pct, pos, dur).catch(() => {});
                      if (completed) showToast('Lecture marked complete!', 'success');
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Study Materials PDF & Notes */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Notes, PYQs, Worksheets &amp; PDFs</h2>
            {firebaseUser && (
              <button type="button" onClick={() => navigate('/student?tab=downloads')} className="text-xs font-semibold text-blue-700 dark:text-sky-400">
                My Downloads →
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-4">
            {matCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setMatCategory(c)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                  matCategory === c
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((m) => {
              const unlocked = isCourseUnlocked(m.courseId);
              return (
                <div key={m.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                  {m.coverUrl && (
                    <div className="h-44 bg-slate-950 flex items-center justify-center">
                      <ResilientImage src={m.coverUrl} alt={m.title} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-xs font-semibold text-blue-700 dark:text-sky-400">{m.category} · {m.chapter}</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 mb-3 flex-1">{m.title}</h3>
                    <button
                      type="button"
                      onClick={() => handleDownloadMaterial(m)}
                      className={`min-h-[44px] w-full px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                        unlocked
                          ? 'bg-blue-50 dark:bg-slate-800 text-blue-800 dark:text-sky-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {unlocked ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {unlocked ? 'Preview & Save PDF' : 'Unlock Course to Access'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recorded Lectures */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">Recorded Video Lectures</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lectures.map((lec) => {
              const unlocked = isCourseUnlocked(lec.courseId) || lec.isFreePreview;
              return (
                <div key={lec.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      {lec.chapter} · {lec.duration}
                      {lec.isFreePreview ? ' · Free Preview' : ''}
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{lec.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveVideo(lec)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 ${
                      unlocked ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {unlocked ? <PlayCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {unlocked ? 'Watch' : 'Locked'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Live Classes */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">Live Interactive Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveClasses.map((lc) => (
              <div key={lc.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{lc.status} · {lc.scheduledAt}</p>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{lc.title}</h3>
                  <p className="text-xs text-slate-500">{lc.platform} · {lc.teacherName}</p>
                </div>
                <a
                  href={lc.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                >
                  <Video className="w-4 h-4" /> Join
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* In-App PDF / Document Preview Modal */}
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

export function OnlineClassesPage() {
  const { firebaseUser, navigate } = useApp();
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>(INITIAL_LIVE_CLASSES);

  useEffect(() => {
    getDocs(collection(db, 'live_classes'))
      .then((snap) => {
        if (!snap.empty) setLiveClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LiveClass, 'id'>) })));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Online Live Classes" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {!firebaseUser && (
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">Sign in to sync batch-specific live links &amp; attendance.</p>
            <button type="button" onClick={() => navigate('/student-login')} className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold shrink-0">
              Student Login
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveClasses.map((lc) => (
            <div key={lc.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-700 dark:text-sky-400">{lc.platform} · {lc.batchName}</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{lc.status}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{lc.title}</h2>
              <p className="text-xs text-slate-500">{lc.subject} ({lc.chapter}) · {lc.scheduledAt}</p>
              <a
                href={lc.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" /> Join Live Session
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TestSeriesPage() {
  const { firebaseUser, studentProfile, showToast, navigate } = useApp();
  const [tests, setTests] = useState<TestItem[]>(INITIAL_TESTS);
  const [leaderboard, setLeaderboard] = useState<TestResult[]>([]);
  const [activeTest, setActiveTest] = useState<TestItem | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [scoreReport, setScoreReport] = useState<{ obtained: number; max: number; pct: number } | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'tests'))
      .then((snap) => {
        if (!snap.empty) setTests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TestItem, 'id'>) })));
      })
      .catch(() => {});
    getDocs(collection(db, 'test_results'))
      .then((snap) => {
        if (!snap.empty) {
          const rows = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<TestResult, 'id'>) }))
            .sort((a, b) => Number(b.percentage || 0) - Number(a.percentage || 0));
          setLeaderboard(rows.slice(0, 10));
        }
      })
      .catch(() => {});
  }, [scoreReport]);

  async function handleSubmitTest() {
    if (!activeTest) return;
    const questions = activeTest.questions || [];
    const maxMarks = Number(activeTest.maxMarks || 20);
    const perQ = maxMarks / (questions.length || 1);
    let correct = 0;
    questions.forEach((q, i) => {
      if (Number(answers[i]) === Number(q.correctIndex)) correct += 1;
    });
    const obtained = Math.round(correct * perQ);
    const pct = Math.round((obtained / maxMarks) * 100);

    if (firebaseUser) {
      await submitStudentMcqTest(firebaseUser.uid, studentProfile, activeTest, answers).catch(() => {});
    }
    setScoreReport({ obtained, max: maxMarks, pct });
    showToast(`Test evaluated! Score: ${obtained}/${maxMarks} (${pct}%)`, 'success');
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar
        title={activeTest ? activeTest.title : 'Test Series & MCQ'}
        backLabel={activeTest ? 'Back to Tests' : 'Back'}
        fallbackPath="/"
        onBack={
          activeTest
            ? () => {
                setActiveTest(null);
                setScoreReport(null);
                setAnswers({});
              }
            : undefined
        }
      />

      <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        {activeTest ? (
          <div className="space-y-5 max-w-2xl mx-auto">
            {scoreReport && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Result Evaluated</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  {scoreReport.obtained} / {scoreReport.max} ({scoreReport.pct}%)
                </p>
              </div>
            )}

            {(activeTest.questions || []).map((q, idx) => (
              <div key={q.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Q{idx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <label
                      key={oIdx}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-colors ${
                        answers[idx] === oIdx
                          ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-sky-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`mcq_${idx}`}
                        checked={answers[idx] === oIdx}
                        onChange={() => setAnswers((p) => ({ ...p, [idx]: oIdx }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleSubmitTest}
              className="w-full min-h-[48px] py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold"
            >
              Submit Test &amp; View Score
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tests.map((t) => (
                <div key={t.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                  {t.posterUrl && (
                    <div className="h-44 bg-slate-950 flex items-center justify-center">
                      <ResilientImage src={t.posterUrl} alt={t.title} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 tabular-nums">
                      {t.testType} · {t.maxMarks} Marks · {t.durationMinutes} mins
                    </p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{t.title}</h2>
                    <p className="text-xs text-slate-500 mt-1 mb-4 flex-1">{t.instructions}</p>
                    {t.questions && t.questions.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTest(t);
                          setScoreReport(null);
                          setAnswers({});
                        }}
                        className="min-h-[44px] w-full py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                      >
                        <ClipboardCheck className="w-4 h-4" /> Start MCQ Test
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/student-login')}
                        className="min-h-[44px] w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                      >
                        View Schedule ({t.date})
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {leaderboard.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Test Series Leaderboard</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-4">Rank</th>
                        <th className="py-2.5 px-4">Student</th>
                        <th className="py-2.5 px-4">Test</th>
                        <th className="py-2.5 px-4">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {leaderboard.map((r, idx) => (
                        <tr key={r.id}>
                          <td className="py-2.5 px-4 font-bold font-mono tabular-nums">#{idx + 1}</td>
                          <td className="py-2.5 px-4 font-semibold">{r.studentName}</td>
                          <td className="py-2.5 px-4 text-slate-500">{r.testTitle}</td>
                          <td className="py-2.5 px-4 font-mono font-bold tabular-nums text-blue-700 dark:text-sky-400">
                            {r.marksObtained}/{r.maxMarks} ({r.percentage}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AdmissionsPage() {
  const { courses, batches, showToast, navigate } = useApp();
  const params = new URLSearchParams(window.location.search);
  const initialCourse = params.get('course') || courses[0]?.id || '';
  const initialBatch = params.get('batch') || batches[0]?.id || '';

  const [form, setForm] = useState({
    fullName: '',
    fatherName: '',
    motherName: '',
    dob: '',
    gender: 'Male',
    mobile: '',
    whatsapp: '',
    email: '',
    address: '',
    schoolName: '',
    studentClass: 'Class 12',
    board: 'CBSE',
    courseId: initialCourse,
    batchId: initialBatch,
    previousMarks: '',
    photoUrl: '',
    guardianContact: '',
    additionalInfo: '',
  });
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<AdmissionApplication | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedCourse = courses.find((c) => c.id === form.courseId);
      const selectedBatch = batches.find((b) => b.id === form.batchId);
      const created = await submitAdmissionApplication({
        ...form,
        courseName: selectedCourse?.title || 'Chemistry Course',
        batchName: selectedBatch?.name || 'Power Batch',
      });
      setSubmittedRecord(created);
      showToast(`Application submitted! ID: ${created.admissionId}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit admission form', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedRecord) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <BackBar title="Admission Submitted" backLabel="Back" fallbackPath="/" />
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-8">
          <div className="p-6 sm:p-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admission Application Submitted</h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">Keep your unique Admission ID safe to check approval status.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-sm my-5">
              <div className="flex justify-between"><span className="text-slate-500">Admission ID</span><span className="font-mono font-bold text-blue-700 dark:text-sky-400">{submittedRecord.admissionId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-semibold">{submittedRecord.fullName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Course</span><span className="font-semibold">{submittedRecord.courseName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Mobile</span><span className="font-mono tabular-nums">{submittedRecord.mobile}</span></div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  exportHtmlToPrintPdf(
                    `Admission Confirmation — ${submittedRecord.admissionId}`,
                    `<p><strong>Admission ID:</strong> ${submittedRecord.admissionId}</p>
                     <p><strong>Student Name:</strong> ${submittedRecord.fullName}</p>
                     <p><strong>Course:</strong> ${submittedRecord.courseName}</p>
                     <p><strong>Batch:</strong> ${submittedRecord.batchName}</p>`
                  )
                }
                className="min-h-[44px] px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Confirmation
              </button>
              <button
                type="button"
                onClick={() => navigate('/admission-status')}
                className="min-h-[44px] px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-xl"
              >
                Track Admission Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Online Admission Form" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5 flex justify-end">
          <button type="button" onClick={() => navigate('/admission-status')} className="text-xs font-bold text-blue-700 dark:text-sky-400 hover:underline">
            Already Applied? Check Admission Status →
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold mb-1">Student Full Name *</label><input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div><label className="block text-xs font-semibold mb-1">Father&apos;s Name *</label><input type="text" required value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div><label className="block text-xs font-semibold mb-1">Mother&apos;s Name *</label><input type="text" required value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold mb-1">Date of Birth *</label><input type="date" required value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
              <div><label className="block text-xs font-semibold mb-1">Gender *</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
            </div>
            <div><label className="block text-xs font-semibold mb-1">Mobile Number *</label><input type="tel" required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div><label className="block text-xs font-semibold mb-1">WhatsApp Number *</label><input type="tel" required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div><label className="block text-xs font-semibold mb-1">Email (For Student Portal) *</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div><label className="block text-xs font-semibold mb-1">Parent / Guardian Contact *</label><input type="tel" required value={form.guardianContact} onChange={(e) => setForm({ ...form, guardianContact: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1">Full Address *</label><input type="text" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div><label className="block text-xs font-semibold mb-1">School / College *</label><input type="text" required value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div><label className="block text-xs font-semibold mb-1">Previous Class Marks / %</label><input type="text" value={form.previousMarks} onChange={(e) => setForm({ ...form, previousMarks: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">Class *</label>
              <select value={form.studentClass} onChange={(e) => setForm({ ...form, studentClass: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
                <option value="Class 11">Class 11</option><option value="Class 12">Class 12</option><option value="Dropper / Target">Dropper / Target</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Board *</label>
              <select value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
                <option value="CBSE">CBSE</option><option value="Bihar Board (BSEB)">Bihar Board (BSEB)</option><option value="ICSE / ISC">ICSE / ISC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Select Course *</label>
              <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title} (₹{Number(c.fees).toLocaleString('en-IN')})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Preferred Batch *</label>
              <select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.timing}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center">
              {form.photoUrl ? <ResilientImage src={form.photoUrl} alt="Student" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
            </div>
            <label className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer">
              <ImagePlus className="w-4 h-4 text-blue-700" />
              Pick &amp; Crop Photo from Gallery
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCropFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <button type="submit" disabled={submitting} className="w-full min-h-[48px] py-3 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl">
            {submitting ? 'Submitting Application...' : 'Submit Admission Application'}
          </button>
        </form>
      </div>

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          defaultAspect="1:1"
          onCancel={() => setCropFile(null)}
          onConfirm={(url) => {
            setForm((p) => ({ ...p, photoUrl: url }));
            setCropFile(null);
            showToast('Student photo cropped and attached.', 'success');
          }}
        />
      )}
    </div>
  );
}

export function AdmissionStatusPage() {
  const [admissionId, setAdmissionId] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await lookupAdmissionStatus(admissionId, mobile);
      if (!data) throw new Error('No matching admission application found.');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to check status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Track Admission Status" backLabel="Back" fallbackPath="/admissions" />
      <div className="max-w-[560px] mx-auto px-4 sm:px-6 py-10">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <FileCheck className="w-8 h-8 text-blue-700 dark:text-sky-400 mb-3" />
          <p className="text-xs text-slate-500 mb-5">Enter Admission ID (e.g. ZOC-2026-1234) and mobile number.</p>
          <form onSubmit={handleCheck} className="space-y-4">
            <input type="text" required value={admissionId} onChange={(e) => setAdmissionId(e.target.value)} placeholder="ZOC-2026-XXXX" className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" />
            <input type="tel" required value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile number" className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl" />
            <button type="submit" disabled={loading} className="w-full min-h-[44px] py-2.5 text-sm font-bold text-white bg-blue-700 rounded-xl">
              {loading ? 'Checking...' : 'Check Status'}
            </button>
          </form>
          {error && <div className="mt-4 p-3 rounded-xl bg-red-50 text-xs text-red-700">{error}</div>}
          {result && (
            <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Applicant</span><span className="font-bold">{result.fullName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Course</span><span className="font-semibold">{result.courseName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-bold uppercase text-blue-700 dark:text-sky-400">{result.status}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResultsPage() {
  const { results } = useApp();
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Toppers & Results" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {results.map((r) => (
            <div key={r.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border border-slate-200">
                <ResilientImage src={r.photoUrl} alt={r.studentName} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-slate-500 tabular-nums">{r.examName} · {r.year}</p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">{r.studentName}</h2>
              <p className="text-lg font-bold text-blue-700 dark:text-sky-400 font-mono tabular-nums my-1.5">{r.marksOrRank}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{r.achievement}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GalleryPage() {
  const { gallery } = useApp();
  const [cat, setCat] = useState('All');
  const [selected, setSelected] = useState<{ url: string; title: string } | null>(null);
  const categories = ['All', 'Institute', 'Classroom', 'Teacher', 'Awards', 'Events', 'Banners'];
  const items = gallery.filter((g) => cat === 'All' || g.category === cat);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Institute Photo Gallery" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-6">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 ${cat === c ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelected({ url: item.imageUrl, title: item.title })} className="text-left rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="aspect-[4/3] bg-slate-100">
                <ResilientImage src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-3.5">
                <p className="text-xs text-slate-500">{item.category} · {item.album}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{item.title}</p>
              </div>
            </button>
          ))}
        </div>
        {selected && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="aspect-video bg-slate-900"><ResilientImage src={selected.url} alt={selected.title} className="w-full h-full object-contain" /></div>
              <div className="p-4 flex justify-between items-center"><p className="text-sm font-semibold">{selected.title}</p><button type="button" onClick={() => setSelected(null)} className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl">Close</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NoticesPage() {
  const { notices } = useApp();
  const [q, setQ] = useState('');
  const filtered = notices.filter((n) => !q.trim() || n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Notice Board" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notices..." className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl" />
        {filtered.map((n) => (
          <div key={n.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {n.imageUrl && (
              <div className="aspect-[16/9] rounded-xl overflow-hidden mb-3">
                <ResilientImage src={n.imageUrl} alt={n.title} className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 tabular-nums mb-1">{n.category} · {n.date}</p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">{n.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings, showToast } = useApp();
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await submitEnquiryForm({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        source: 'Contact Form',
      });
      showToast('Thank you! Our Motihari academic desk will contact you shortly.', 'success');
      setForm({ name: '', phone: '', email: '', message: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title="Contact & Help Desk" backLabel="Back" fallbackPath="/" />
      <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-sm">
            <div className="flex items-start gap-2.5"><MapPin className="w-4 h-4 text-blue-700 mt-0.5" /> <span>{settings.address}</span></div>
            <div className="flex items-center gap-2.5"><Phone className="w-4 h-4 text-blue-700" /> <span className="tabular-nums">{settings.phone}</span></div>
            <div className="flex items-center gap-2.5"><Calendar className="w-4 h-4 text-blue-700" /> <span>Mon – Sat: 06:30 AM – 07:30 PM</span></div>
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="min-h-[44px] w-full mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp Support
            </a>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-56">
            <iframe title="Motihari Campus Location" src="https://www.google.com/maps?q=Chandmari+Motihari+Bihar&output=embed" className="w-full h-full border-0" loading="lazy" />
          </div>
        </div>

        <div className="lg:col-span-7">
          <form onSubmit={onSubmit} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-700" /> Send Enquiry / Support Ticket
            </h2>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full Name" className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" />
            <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone / WhatsApp Number" className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (Optional)" className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" />
            <textarea rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Ask about batch timings, portal login, fees, or admissions..." className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" />
            <button type="submit" disabled={sending} className="min-h-[44px] px-6 py-2.5 text-sm font-bold text-white bg-blue-700 rounded-xl">
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function LegalPage({ type }: { type: 'privacy' | 'terms' | 'refund' }) {
  const titleMap = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Refund & Cancellation Policy',
  };
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <BackBar title={titleMap[type]} backLabel="Back" fallbackPath="/" />
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-8 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {titleMap[type]} — THE ZONE OF CHEMISTRY
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {type === 'privacy'
            ? 'THE ZONE OF CHEMISTRY (Station Road / Chandmari, Motihari, Bihar) collects student admission details, academic attendance, test scores, and fee records strictly for educational administration, portal access, and parent communication. Personal data is isolated by student account and never sold or shared with unauthorized third parties.'
            : type === 'terms'
            ? 'Admission to classroom or online batches at THE ZONE OF CHEMISTRY is subject to verification by institute administration. Course fees, batch timings, and discipline norms apply uniformly to all enrolled students. Online study materials and recorded lectures are strictly for personal academic use.'
            : 'Online course fee payments via Cashfree or Campus Desk are non-transferable once digital lectures and PDF notes have been accessed. In case of duplicate payment or genuine batch cancellation prior to course commencement, refund requests can be submitted from your Student Orders tab or Motihari Campus Desk for resolution within 5–7 business days.'}
        </p>
      </div>
    </div>
  );
}
