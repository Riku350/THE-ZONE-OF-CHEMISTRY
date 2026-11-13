import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  MapPin,
  MessageCircle,
  Phone,
  SlidersHorizontal,
  Sparkles,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ResilientImage } from './ResilientImage.tsx';
import type { Course, ExamTrack } from '../types.ts';

const EXAM_TRACKS: { value: ExamTrack; shortLabel: string; sub: string }[] = [
  { value: 'Class 11 Chemistry', shortLabel: '11th – Chemistry', sub: 'CBSE & Bihar Board Foundation' },
  { value: 'Class 12 Chemistry', shortLabel: '12th – Chemistry', sub: 'Board + Mechanism Mastery' },
  { value: '12th IIT-JEE', shortLabel: '12th – IIT-JEE', sub: 'Main & Advanced Chemistry' },
  { value: '12th NEET', shortLabel: '12th – NEET', sub: 'NCERT Line-by-Line + 3,000 MCQs' },
  { value: 'Dropper Chemistry', shortLabel: 'Dropper – Chemistry', sub: '11th + 12th Rapid Ranker Batch' },
];

const OTHER_BATCH_FILTERS = [
  'All',
  'Class 11',
  'Class 12',
  'IIT-JEE',
  'NEET',
  'Dropper',
  'Bihar Board',
  'CBSE',
];

export function PublicHome() {
  const {
    settings,
    courses,
    banners,
    faculty,
    results,
    gallery,
    enrollments,
    selectedExam,
    setSelectedExam,
    searchQuery,
    examModalOpen,
    setExamModalOpen,
    openCheckout,
    navigate,
    showToast,
  } = useApp();

  const [batchChip, setBatchChip] = useState<string>('All');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const currentExamMeta = EXAM_TRACKS.find((e) => e.value === selectedExam) || EXAM_TRACKS[1];

  const handleSelectExam = (exam: ExamTrack) => {
    setSelectedExam(exam);
    setBatchChip('All');
    setExamModalOpen(false);
    showToast(`Switched course feed to ${exam}`, 'info');
  };

  // Prioritize courses matching the chosen exam track & batch chip & global search query
  const visibleCourses = courses.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.subjects.toLowerCase().includes(q) ||
      (c.examTrack || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (batchChip !== 'All') {
      return (
        c.category.toLowerCase() === batchChip.toLowerCase() ||
        c.title.toLowerCase().includes(batchChip.toLowerCase()) ||
        (c.examTrack || '').toLowerCase().includes(batchChip.toLowerCase())
      );
    }

    if (!q) {
      if (selectedExam === 'Class 11 Chemistry') {
        return c.examTrack === 'Class 11 Chemistry' || c.category === 'Class 11';
      }
      if (selectedExam === '12th NEET') {
        return c.examTrack === '12th NEET' || c.category === 'NEET' || c.category === 'Dropper';
      }
      if (selectedExam === '12th IIT-JEE') {
        return c.examTrack === '12th IIT-JEE' || c.category === 'IIT-JEE' || c.category === 'JEE';
      }
      if (selectedExam === 'Dropper Chemistry') {
        return c.examTrack === 'Dropper Chemistry' || c.category === 'Dropper' || c.category === 'IIT-JEE' || c.category === 'NEET';
      }
      return true;
    }

    return true;
  });

  const activeBanner = banners[bannerIndex % Math.max(1, banners.length)];

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 1. MOBILE APP TOP GRADIENT SECTION */}
      <section className="bg-gradient-to-b from-sky-100/85 via-blue-50/55 to-white dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 pt-4 pb-6 sm:pt-6 sm:pb-8">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-5">
          {/* Exam Selection Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-blue-700 dark:text-sky-400">Active Learning Goal</p>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {currentExamMeta.shortLabel}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                  {currentExamMeta.sub}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExamModalOpen(true)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-800 dark:text-sky-300 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Change
            </button>
          </div>

          {/* 3 Main App Category Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/online-classes')}
              className="group p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 hover:border-blue-400 text-left shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between min-h-[104px] sm:min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-400 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div className="mt-3">
                <p className="text-xs sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Online Classes
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                  Live &amp; Recorded
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setBatchChip('Class 12');
                document.getElementById('popular-courses')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 hover:border-indigo-400 text-left shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between min-h-[104px] sm:min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div className="mt-3">
                <p className="text-xs sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Power Batch
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                  Toppers Track
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/tests')}
              className="group p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 hover:border-sky-400 text-left shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between min-h-[104px] sm:min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div className="mt-3">
                <p className="text-xs sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Test Series
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                  MCQ &amp; Rank
                </p>
              </div>
            </button>
          </div>

          {/* Live Featured Banner Slider (Admin Editable — Uncropped Full Poster Frame) */}
          {activeBanner && (
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
                <div className="lg:col-span-7 bg-slate-950 relative flex items-center justify-center max-h-[360px] overflow-hidden">
                  <ResilientImage
                    src={activeBanner.imageUrl}
                    alt={activeBanner.title}
                    fallbackTitle="THE ZONE OF CHEMISTRY"
                    className="w-full max-h-[360px] object-contain"
                  />
                </div>
                <div className="lg:col-span-5 p-5 sm:p-7 bg-slate-950 text-white flex flex-col justify-center">
                  <p className="text-xs font-semibold text-sky-300 mb-1.5">
                    {settings.instituteName} · {settings.directorName}
                  </p>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-snug mb-2" style={{ textWrap: 'balance' }}>
                    {activeBanner.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mb-5 line-clamp-2">
                    {activeBanner.subtitle || settings.heroSubheading}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(activeBanner.ctaPath || '/courses')}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      {activeBanner.ctaLabel || 'Explore Now'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {banners.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        {banners.map((bn, idx) => (
                          <button
                            key={bn.id}
                            type="button"
                            onClick={() => setBannerIndex(idx)}
                            aria-label={`Slide ${idx + 1}`}
                            className={`h-2 rounded-full transition-all ${
                              idx === bannerIndex % banners.length ? 'w-6 bg-sky-400' : 'w-2 bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. OTHER BATCHES HORIZONTAL CHIPS */}
      <section className="py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Other Batches</h2>
            <button
              type="button"
              onClick={() => navigate('/batches')}
              className="text-xs font-semibold text-blue-700 dark:text-sky-400 inline-flex items-center gap-0.5"
            >
              Timetable <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {OTHER_BATCH_FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setBatchChip(cat)}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  batchChip === cat
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. POPULAR COURSES (MOBILE APP POSTER CARDS) */}
      <section id="popular-courses" className="py-7 sm:py-10 bg-white dark:bg-slate-950">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-sky-400">{selectedExam}</p>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Popular Chemistry Courses
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {visibleCourses.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                No courses matched your current filter or search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBatchChip('All');
                  setSelectedExam('Class 12 Chemistry');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 rounded-xl"
              >
                Show All Courses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleCourses.map((course) => {
                const discountPct =
                  course.discountPercent ||
                  (course.mrpPrice && course.mrpPrice > course.fees
                    ? Math.round(((course.mrpPrice - course.fees) / course.mrpPrice) * 100)
                    : 0);
                const isEnrolled = enrollments.some((e) => e.courseId === course.id && e.status === 'Active');

                return (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-blue-300 dark:hover:border-sky-700 transition-all flex flex-col"
                  >
                    {/* Large Course Poster (Uncropped Frame) */}
                    <button
                      type="button"
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="w-full h-52 bg-slate-950 overflow-hidden flex items-center justify-center"
                    >
                      <ResilientImage
                        src={course.imageUrl}
                        alt={course.title}
                        fallbackTitle={course.title}
                        className="w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300"
                      />
                    </button>

                    {/* Clean Minimal Metadata */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span className="font-semibold text-blue-700 dark:text-sky-400 truncate">
                          {course.examTrack || course.category} · {course.category}
                        </span>
                        <span className="tabular-nums shrink-0">{course.duration}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="text-left"
                      >
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug hover:text-blue-700 dark:hover:text-sky-400 transition-colors">
                          {course.title}
                        </h3>
                      </button>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                        Teacher: <span className="font-semibold">{course.teacherName}</span>
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                        {isEnrolled ? 'Enrolled · Unlocked' : course.statusLabel || 'Admissions Open'}
                      </p>

                      {/* Price & Discount Row */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                            {Number(course.fees) <= 0 ? 'FREE' : `₹${Number(course.fees).toLocaleString('en-IN')}`}
                          </span>
                          {course.mrpPrice && course.mrpPrice > course.fees && (
                            <del className="text-xs text-slate-400 font-mono tabular-nums">
                              ₹{Number(course.mrpPrice).toLocaleString('en-IN')}
                            </del>
                          )}
                        </div>
                        {discountPct > 0 && (
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                            {discountPct}% OFF
                          </span>
                        )}
                      </div>

                      {/* Buy Now & Details Arrow */}
                      <div className="mt-4 flex items-center gap-2.5">
                        {isEnrolled ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/courses/${course.id}`)}
                            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5"
                          >
                            Start Learning <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCheckout(course)}
                            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                          >
                            {Number(course.fees) <= 0 ? 'Enroll Free' : 'Buy Now'}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/courses/${course.id}`)}
                          aria-label={`View details for ${course.title}`}
                          className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. FACULTY & DIRECTOR POSTER SHOWCASE */}
      {settings.showSections.about && (
        <section className="py-8 sm:py-12 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-sky-400">Mentor &amp; Faculty</p>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Learn from Prof. {settings.directorName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-sky-400 inline-flex items-center gap-1"
              >
                About <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(faculty.length > 0 ? faculty : []).map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-5 items-center sm:items-start"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0">
                    <ResilientImage
                      src={t.photoUrl || settings.directorPhotoUrl}
                      alt={t.name}
                      fallbackTitle={t.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.name}</h3>
                    <p className="text-xs font-semibold text-blue-700 dark:text-sky-400 mt-0.5">{t.subjects}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t.qualification} · {t.experience}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 line-clamp-3 leading-relaxed">
                      {t.description || settings.directorPhilosophy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. TOPPERS & CAMPUS QUICK ACCESS */}
      <section className="py-8 sm:py-12 bg-white dark:bg-slate-950">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-10">
          {settings.showSections.results && (
            <div>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-sky-400">Motihari Hall of Fame</p>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Recent Toppers &amp; Selections
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/results')}
                  className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-sky-400 inline-flex items-center gap-1"
                >
                  All Results <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {results.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2.5 border border-slate-200 dark:border-slate-700">
                      <ResilientImage src={r.photoUrl} alt={r.studentName} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.studentName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.examName}</p>
                    <p className="text-sm font-bold text-blue-700 dark:text-sky-400 font-mono tabular-nums mt-1">
                      {r.marksOrRank}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compact Campus Contact & Admission Tracking Bar */}
          <div className="p-5 sm:p-7 rounded-2xl bg-gradient-to-r from-blue-800 to-sky-700 text-white flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-sky-200 inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Station Road / Chandmari, Motihari, Bihar
              </p>
              <h2 className="text-lg sm:text-2xl font-bold">Need Batch Guidance or Offline Admission?</h2>
              <p className="text-xs sm:text-sm text-sky-100">
                Track existing Admission ID or talk directly to Prof. S. K. Srivastav&apos;s academic desk.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/admission-status')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold whitespace-nowrap"
              >
                Track Admission ID
              </button>
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-sky-50 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp Desk
              </a>
            </div>
          </div>

          {settings.showSections.gallery && gallery.length > 0 && (
            <div>
              <div className="flex items-end justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Campus Moments</h2>
                <button
                  type="button"
                  onClick={() => navigate('/gallery')}
                  className="text-xs font-semibold text-blue-700 dark:text-sky-400 inline-flex items-center gap-1"
                >
                  Gallery <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {gallery.slice(0, 4).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setLightboxImage({ url: g.imageUrl, title: g.title })}
                    className="aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                  >
                    <ResilientImage src={g.imageUrl} alt={g.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* EXAM SELECTION BOTTOM SHEET / MODAL */}
      {examModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
          onClick={() => setExamModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Select Target Exam / Class</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Homepage courses update automatically</p>
              </div>
              <button
                type="button"
                onClick={() => setExamModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
              {EXAM_TRACKS.map((opt) => {
                const active = selectedExam === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectExam(opt.value)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-colors ${
                      active
                        ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:border-sky-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{opt.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.sub}</p>
                    </div>
                    {active && <Check className="w-5 h-5 text-blue-700 dark:text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GALLERY LIGHTBOX */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 no-print"
          onClick={() => setLightboxImage(null)}
        >
          <div className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-slate-900">
              <ResilientImage src={lightboxImage.url} alt={lightboxImage.title} className="w-full h-full object-contain" />
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{lightboxImage.title}</p>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-700 text-white rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
