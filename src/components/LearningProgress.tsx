import React, { useMemo } from 'react';
import { Award, BookOpen, CheckCircle2, PlayCircle, TrendingUp } from 'lucide-react';
import type {
  Course,
  EnrollmentRecord,
  LectureProgress,
  RecordedLecture,
  StudentRecord,
  TestItem,
  TestResult,
} from '../types.ts';

interface LearningProgressProps {
  student: StudentRecord | null;
  courses: Course[];
  enrollments: EnrollmentRecord[];
  lectures: RecordedLecture[];
  lectureProgress: LectureProgress[];
  tests: TestItem[];
  testResults: TestResult[];
  onOpenLectures: () => void;
  onOpenTests: () => void;
  onOpenCourse: (courseId: string) => void;
  onExploreCourses: () => void;
}

interface CourseProgressSummary {
  courseId: string;
  courseTitle: string;
  category: string;
  teacherName: string;
  completedLectures: number;
  totalLectures: number;
  lecturePercent: number;
  testCount: number;
  attemptedTests: number;
  avgTestScore: number | null;
  latestResult: TestResult | null;
}

export function LearningProgress({
  student,
  courses,
  enrollments,
  lectures,
  lectureProgress,
  tests,
  testResults,
  onOpenLectures,
  onOpenTests,
  onOpenCourse,
  onExploreCourses,
}: LearningProgressProps) {
  const summaries = useMemo<CourseProgressSummary[]>(() => {
    const enrolledEntries: { courseId: string; courseTitle: string; batchId?: string }[] = [];
    const seenCourseIds = new Set<string>();

    for (const enr of enrollments) {
      if (enr.status !== 'Active' && enr.status !== 'Pending') continue;
      if (!enr.courseId || seenCourseIds.has(enr.courseId)) continue;
      seenCourseIds.add(enr.courseId);
      enrolledEntries.push({
        courseId: enr.courseId,
        courseTitle: enr.courseTitle,
        batchId: enr.batchId,
      });
    }

    if (student?.courseId && !seenCourseIds.has(student.courseId)) {
      seenCourseIds.add(student.courseId);
      enrolledEntries.unshift({
        courseId: student.courseId,
        courseTitle: student.courseName || 'Enrolled Chemistry Course',
        batchId: student.batchId,
      });
    }

    const progressByLecture = new Map<string, LectureProgress>();
    for (const lp of lectureProgress) {
      progressByLecture.set(lp.lectureId, lp);
    }

    return enrolledEntries.map((entry) => {
      const matchedCourse = courses.find((c) => c.id === entry.courseId);
      const titleLower = (matchedCourse?.title || entry.courseTitle || '').trim().toLowerCase();

      const courseLectures = lectures.filter(
        (l) =>
          l.courseId === entry.courseId ||
          (!l.courseId && l.courseName && l.courseName.trim().toLowerCase() === titleLower)
      );

      const completedLectures = courseLectures.filter((l) => progressByLecture.get(l.id)?.completed).length;

      let lecturePercent = 0;
      if (courseLectures.length > 0) {
        const totalPct = courseLectures.reduce((sum, l) => {
          const p = progressByLecture.get(l.id);
          if (!p) return sum;
          return sum + (p.completed ? 100 : Math.min(99, Math.max(0, Number(p.progressPercent || 0))));
        }, 0);
        lecturePercent = Math.round(totalPct / courseLectures.length);
      }

      const courseTests = tests.filter(
        (t) =>
          t.courseId === entry.courseId ||
          (entry.batchId && t.batchId === entry.batchId)
      );
      const courseTestIds = new Set(courseTests.map((t) => t.id));
      const courseTestTitles = new Set(courseTests.map((t) => t.title.trim().toLowerCase()));

      const matchedResults = testResults.filter(
        (r) =>
          courseTestIds.has(r.testId) ||
          (r.testTitle && courseTestTitles.has(r.testTitle.trim().toLowerCase()))
      );

      const avgTestScore =
        matchedResults.length > 0
          ? Math.round(
              matchedResults.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / matchedResults.length
            )
          : null;

      const latestResult =
        matchedResults.length > 0
          ? [...matchedResults].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
          : null;

      return {
        courseId: entry.courseId,
        courseTitle: matchedCourse?.title || entry.courseTitle,
        category: matchedCourse?.category || 'Enrolled Course',
        teacherName: matchedCourse?.teacherName || 'Prof. S. K. Srivastav',
        completedLectures,
        totalLectures: courseLectures.length,
        lecturePercent,
        testCount: courseTests.length,
        attemptedTests: matchedResults.length,
        avgTestScore,
        latestResult,
      };
    });
  }, [courses, enrollments, lectures, lectureProgress, student?.batchId, student?.courseId, student?.courseName, testResults, tests]);

  const overallStats = useMemo(() => {
    const totalLectures = summaries.reduce((s, c) => s + c.totalLectures, 0);
    const completedLectures = summaries.reduce((s, c) => s + c.completedLectures, 0);
    const overallAvgScore = testResults.length
      ? Math.round(testResults.reduce((s, r) => s + Number(r.percentage || 0), 0) / testResults.length)
      : null;
    return { totalLectures, completedLectures, overallAvgScore };
  }, [summaries, testResults]);

  return (
    <section
      aria-label="Learning Progress"
      className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-700 dark:text-sky-400" />
            <span>Learning Progress</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track completed video lectures and test performance across your enrolled courses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-sky-300 font-semibold tabular-nums inline-flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5" />
            {overallStats.completedLectures} / {overallStats.totalLectures} Lectures
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold tabular-nums inline-flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            {overallStats.overallAvgScore !== null
              ? `Avg Test Score: ${overallStats.overallAvgScore}%`
              : `${testResults.length} Tests Taken`}
          </span>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-blue-700 dark:text-sky-400 mx-auto" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">No Enrolled Courses Yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enroll in a chemistry course to track your video lecture completion and test scores here.
            </p>
          </div>
          <button
            type="button"
            onClick={onExploreCourses}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
          >
            Browse Courses
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summaries.map((item) => (
            <div
              key={item.courseId}
              className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-sky-400">
                    {item.category}
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {item.courseTitle}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.teacherName}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold tabular-nums shrink-0 ${
                    item.lecturePercent === 100
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                      : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-sky-300'
                  }`}
                >
                  {item.lecturePercent}%
                </span>
              </div>

              {/* Course Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-sky-400" />
                    Course Completion
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {item.completedLectures} of {item.totalLectures} videos
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={item.lecturePercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.courseTitle} progress`}
                  className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
                >
                  <svg className="w-full h-full block" preserveAspectRatio="none">
                    <rect
                      x="0"
                      y="0"
                      height="100%"
                      width={`${item.lecturePercent}%`}
                      rx="5"
                      className={
                        item.lecturePercent === 100
                          ? 'fill-emerald-600 transition-all duration-500'
                          : 'fill-blue-700 dark:fill-sky-500 transition-all duration-500'
                      }
                    />
                  </svg>
                </div>
              </div>

              {/* Lectures & Test Score Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onOpenLectures}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left hover:border-blue-400 transition-colors"
                >
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Video Lectures</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                    {item.completedLectures} / {item.totalLectures}
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-sky-400 font-medium mt-0.5">
                    {item.totalLectures === 0
                      ? 'No videos yet'
                      : item.completedLectures === item.totalLectures
                      ? 'All completed'
                      : 'Continue watching →'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={onOpenTests}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left hover:border-blue-400 transition-colors"
                >
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Test Scores</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                    {item.avgTestScore !== null ? `${item.avgTestScore}% Avg` : 'No scores yet'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                    {item.latestResult
                      ? `Latest: ${item.latestResult.marksObtained}/${item.latestResult.maxMarks} (${item.attemptedTests} taken)`
                      : item.testCount > 0
                      ? `${item.testCount} tests available`
                      : 'Tests & Results →'}
                  </p>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenCourse(item.courseId)}
                  className="text-xs font-semibold text-blue-700 dark:text-sky-400 hover:underline min-h-[32px]"
                >
                  Open Course Classroom →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
