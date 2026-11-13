import { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase.ts';
import {
  INITIAL_BANNERS,
  INITIAL_BATCHES,
  INITIAL_COURSES,
  INITIAL_FACULTY,
  INITIAL_GALLERY,
  INITIAL_HOMEWORK,
  INITIAL_LECTURES,
  INITIAL_LIVE_CLASSES,
  INITIAL_MATERIALS,
  INITIAL_NOTICES,
  INITIAL_POSTERS,
  INITIAL_RESULTS,
  INITIAL_SETTINGS,
  INITIAL_TESTS,
  INITIAL_TIMETABLE,
  SUPER_ADMIN_EMAIL,
} from './seedData.ts';
import type {
  AdmissionApplication,
  AttendanceRecord,
  BannerItem,
  Batch,
  CertificateRecord,
  Course,
  DeletionRequest,
  DoubtItem,
  DownloadRecord,
  EnrollmentRecord,
  ExamTrack,
  FeeRecord,
  HomeworkItem,
  HomeworkSubmission,
  LectureProgress,
  LiveClass,
  LoginSessionRecord,
  Notice,
  NotificationItem,
  OrderRecord,
  PaymentRecord,
  PosterItem,
  PublicFacultyCard,
  RecordedLecture,
  StudentActivityRecord,
  StudentRecord,
  StudyMaterial,
  TeacherRecord,
  TestItem,
  TestResult,
  TimetableSlot,
  UserProfile,
  UserRole,
} from '../types.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(error instanceof Error ? error.message : 'Database operation failed');
}

export function detectDeviceType(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'Android Mobile';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS Device';
  if (/Mobile/i.test(ua)) return 'Mobile Browser';
  if (/Windows/i.test(ua)) return 'Windows Desktop';
  if (/Mac/i.test(ua)) return 'Mac Desktop';
  return 'Desktop Browser';
}

export async function seedInitialCatalogIfEmpty(): Promise<void> {
  try {
    const settingsSnap = await getDoc(doc(db, 'institute_settings', 'main'));
    if (settingsSnap.exists()) return;

    const batch = writeBatch(db);
    batch.set(doc(db, 'institute_settings', 'main'), INITIAL_SETTINGS);
    for (const c of INITIAL_COURSES) batch.set(doc(db, 'courses', c.id), c);
    for (const b of INITIAL_BATCHES) batch.set(doc(db, 'batches', b.id), b);
    for (const p of INITIAL_POSTERS) batch.set(doc(db, 'posters', p.id), p);
    for (const bn of INITIAL_BANNERS) batch.set(doc(db, 'banners', bn.id), bn);
    for (const pf of INITIAL_FACULTY) batch.set(doc(db, 'public_faculty', pf.id), pf);
    for (const n of INITIAL_NOTICES) batch.set(doc(db, 'notices', n.id), n);
    for (const r of INITIAL_RESULTS) batch.set(doc(db, 'results', r.id), r);
    for (const g of INITIAL_GALLERY) batch.set(doc(db, 'gallery', g.id), g);
    for (const t of INITIAL_TIMETABLE) batch.set(doc(db, 'timetable', t.id), t);
    for (const lc of INITIAL_LIVE_CLASSES) batch.set(doc(db, 'live_classes', lc.id), lc);
    for (const lec of INITIAL_LECTURES) batch.set(doc(db, 'recorded_lectures', lec.id), lec);
    for (const mat of INITIAL_MATERIALS) batch.set(doc(db, 'study_materials', mat.id), mat);
    for (const hw of INITIAL_HOMEWORK) batch.set(doc(db, 'homework', hw.id), hw);
    for (const tst of INITIAL_TESTS) batch.set(doc(db, 'tests', tst.id), tst);
    await batch.commit();
  } catch (err) {
    console.warn('Initial catalog seed skipped or already seeded:', err);
  }
}

export const MOBILE_AUTH_DOMAIN = '@mobile.thezoneofchemistry.in';

export function getCleanEmailFromAuthUser(userEmail?: string | null): string {
  const clean = (userEmail || '').trim().toLowerCase();
  if (!clean || clean.endsWith(MOBILE_AUTH_DOMAIN)) return '';
  return clean;
}

export function extractPhoneFromAuthUser(user: User, fallbackMobile?: string): string {
  if (fallbackMobile?.trim()) return fallbackMobile.trim();
  const rawEmail = (user.email || '').trim().toLowerCase();
  if (rawEmail.endsWith(MOBILE_AUTH_DOMAIN)) {
    return rawEmail.slice(0, -MOBILE_AUTH_DOMAIN.length);
  }
  if (user.phoneNumber) {
    const digits = user.phoneNumber.replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : user.phoneNumber;
  }
  return '';
}

export function generateUniqueStudentId(uid: string): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const uidCode = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'STDN';
  return `ZOC-${year}-${rand}${uidCode}`;
}

export async function syncUserSession(
  user: User,
  signupInfo?: { name?: string; mobile?: string }
): Promise<{
  profile: UserProfile;
  role: UserRole;
  studentProfile: StudentRecord | null;
}> {
  const email = getCleanEmailFromAuthUser(user.email);
  const isVerified = user.emailVerified === true && Boolean(email);
  const resolvedMobile = extractPhoneFromAuthUser(user, signupInfo?.mobile);
  const resolvedName = (
    signupInfo?.name?.trim() ||
    user.displayName ||
    (email ? email.split('@')[0] : '') ||
    (resolvedMobile ? `Student ${resolvedMobile.slice(-4)}` : 'Student')
  ).slice(0, 120);
  const now = new Date().toISOString();
  let role: UserRole = 'student';

  try {
    if (email === SUPER_ADMIN_EMAIL && isVerified) {
      role = 'super_admin';
      await setDoc(
        doc(db, 'admins', user.uid),
        {
          uid: user.uid,
          email,
          role: 'super_admin',
          updatedAt: now,
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email,
          name: user.displayName || 'S. K. Srivastav',
          role: 'super_admin',
          status: 'active',
          isBlocked: false,
          photoUrl: user.photoURL || '',
          createdAt: now,
        },
        { merge: true }
      );
      await seedInitialCatalogIfEmpty();
    } else {
      if (isVerified) {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid)).catch(() => null);
        if (adminSnap && adminSnap.exists()) {
          const adminRole = adminSnap.data()?.role;
          role = adminRole === 'super_admin' ? 'super_admin' : 'admin';
        } else if (email) {
          const teacherEmailSnap = await getDoc(doc(db, 'teachers_by_email', email)).catch(() => null);
          if (teacherEmailSnap && teacherEmailSnap.exists()) {
            role = 'teacher';
            const teacherSnap = await getDocs(query(collection(db, 'teachers'), where('email', '==', email))).catch(() => null);
            if (teacherSnap && !teacherSnap.empty && !teacherSnap.docs[0].data()?.uid) {
              await updateDoc(teacherSnap.docs[0].ref, { uid: user.uid }).catch(() => {});
            }
          }
        }
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const generatedId = role === 'student' ? generateUniqueStudentId(user.uid) : undefined;
        await setDoc(userRef, {
          uid: user.uid,
          email,
          name: resolvedName,
          phone: resolvedMobile.slice(0, 30),
          ...(generatedId ? { studentId: generatedId } : {}),
          role: 'student',
          status: 'active',
          isBlocked: false,
          photoUrl: user.photoURL || '',
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const existingData = userSnap.data() as UserProfile;
        if (role === 'student' && existingData.role) {
          role = existingData.role;
        }
        const patch: Record<string, string> = {};
        if (signupInfo?.name?.trim()) {
          patch.name = signupInfo.name.trim().slice(0, 120);
        } else if (!existingData.name && resolvedName) {
          patch.name = resolvedName;
        }
        if (resolvedMobile && resolvedMobile !== existingData.phone) {
          patch.phone = resolvedMobile.slice(0, 30);
        }
        if (email && !existingData.email) {
          patch.email = email.slice(0, 200);
        }
        if (user.photoURL && !existingData.photoUrl) {
          patch.photoUrl = user.photoURL;
        }
        if (role === 'student' && !existingData.studentId) {
          patch.studentId = generateUniqueStudentId(user.uid);
        }
        if (Object.keys(patch).length > 0 && existingData.isBlocked !== true) {
          patch.updatedAt = now;
          await setDoc(userRef, patch, { merge: true });
        }
      }
    }

    const finalUserSnap = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
    let profile: UserProfile = (finalUserSnap?.data() as UserProfile) || {
      uid: user.uid,
      email,
      name: resolvedName,
      phone: resolvedMobile,
      studentId: role === 'student' ? generateUniqueStudentId(user.uid) : undefined,
      role,
      status: 'active',
      photoUrl: user.photoURL || '',
      createdAt: now,
    };

    // Auto-release expired temporary blocks
    if (profile.isBlocked && profile.blockType === 'temporary' && profile.blockedUntil) {
      const untilMs = new Date(profile.blockedUntil).getTime();
      if (!Number.isNaN(untilMs) && untilMs <= Date.now()) {
        await setDoc(
          doc(db, 'users', user.uid),
          { isBlocked: false, blockReason: '', blockedUntil: '', status: 'active' },
          { merge: true }
        ).catch(() => {});
        profile = { ...profile, isBlocked: false, blockReason: '', blockedUntil: '', status: 'active' };
      }
    }

    let studentProfile: StudentRecord | null = null;
    if (!profile.isBlocked) {
      const byUid = await getDocs(query(collection(db, 'students'), where('uid', '==', user.uid))).catch(() => null);
      if (byUid && !byUid.empty) {
        const existingDoc = byUid.docs[0];
        studentProfile = { id: existingDoc.id, ...(existingDoc.data() as Omit<StudentRecord, 'id'>) };

        // Sync updated name / mobile on existing student profile after OTP verification or login
        const studentPatch: Record<string, string> = {};
        if (signupInfo?.name?.trim() && signupInfo.name.trim() !== studentProfile.name) {
          studentPatch.name = signupInfo.name.trim().slice(0, 120);
        }
        if (resolvedMobile && resolvedMobile !== studentProfile.mobile) {
          studentPatch.mobile = resolvedMobile.slice(0, 20);
        }
        if (Object.keys(studentPatch).length > 0) {
          studentPatch.updatedAt = now;
          await updateDoc(existingDoc.ref, studentPatch);
          studentProfile = { ...studentProfile, ...studentPatch };
        }

        if (profile.studentId !== studentProfile.admissionId && studentProfile.admissionId) {
          await setDoc(doc(db, 'users', user.uid), { studentId: studentProfile.admissionId }, { merge: true }).catch(() => {});
          profile = { ...profile, studentId: studentProfile.admissionId };
        }
      } else if (email && isVerified) {
        const byEmail = await getDocs(query(collection(db, 'students'), where('email', '==', email))).catch(() => null);
        if (byEmail && !byEmail.empty) {
          const sDoc = byEmail.docs[0];
          await updateDoc(sDoc.ref, { uid: user.uid }).catch(() => {});
          studentProfile = { id: sDoc.id, ...(sDoc.data() as Omit<StudentRecord, 'id'>), uid: user.uid };
        }
      }

      // Fallback: check direct students/{uid} doc before creating a new record
      if (!studentProfile) {
        const directSnap = await getDoc(doc(db, 'students', user.uid)).catch(() => null);
        if (directSnap && directSnap.exists()) {
          const data = directSnap.data() as Omit<StudentRecord, 'id'>;
          if (!data.uid && email && isVerified) {
            await updateDoc(directSnap.ref, { uid: user.uid }).catch(() => {});
            studentProfile = { id: directSnap.id, ...data, uid: user.uid };
          } else if (data.uid === user.uid) {
            studentProfile = { id: directSnap.id, ...data };
          }
        }
      }

      // Auto-create student profile record with unique Student ID for newly signed-up students
      if (!studentProfile && role === 'student') {
        const assignedStudentId = profile.studentId || generateUniqueStudentId(user.uid);
        const studentDoc: Omit<StudentRecord, 'id'> = {
          uid: user.uid,
          admissionId: assignedStudentId,
          name: (profile.name || resolvedName).slice(0, 120),
          fatherName: '',
          motherName: '',
          dob: profile.dob || '',
          gender: '',
          email: email.slice(0, 200),
          mobile: (resolvedMobile || profile.phone || '').slice(0, 20),
          whatsapp: (resolvedMobile || profile.phone || '').slice(0, 20),
          address: profile.address || '',
          schoolName: '',
          studentClass: profile.studentClass || 'Class 12',
          board: profile.board || 'CBSE',
          examGoal: profile.examGoal || 'Class 12 Chemistry',
          courseId: '',
          courseName: 'General Chemistry Track',
          batchId: '',
          batchName: 'New Registration',
          previousMarks: '',
          guardianContact: '',
          photoUrl: profile.photoUrl || '',
          status: 'active',
          isBlocked: false,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, 'students', user.uid), studentDoc);
        studentProfile = { id: user.uid, ...studentDoc };
      }
    }

    return { profile, role, studentProfile };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Student Online Presence & Login Session Analytics
export async function recordStudentLoginActivity(
  user: User,
  studentProfile: StudentRecord | null,
  incrementLoginCount: boolean
): Promise<string | null> {
  try {
    const uid = user.uid;
    const now = new Date().toISOString();
    const deviceType = detectDeviceType();
    const actRef = doc(db, 'student_activity', uid);
    const prevSnap = await getDoc(actRef).catch(() => null);
    const prevCount = prevSnap?.exists() ? Number(prevSnap.data()?.totalLoginCount || 0) : 0;

    const cleanEmail = getCleanEmailFromAuthUser(user.email);
    const phone = extractPhoneFromAuthUser(user, studentProfile?.mobile);
    const fallbackName = studentProfile?.name || user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : phone || 'Student');

    await setDoc(
      actRef,
      {
        uid,
        studentName: fallbackName,
        email: cleanEmail || phone,
        admissionId: studentProfile?.admissionId || '',
        courseId: studentProfile?.courseId || '',
        courseName: studentProfile?.courseName || '',
        batchId: studentProfile?.batchId || '',
        batchName: studentProfile?.batchName || '',
        isOnline: true,
        deviceType,
        lastActive: now,
        ...(incrementLoginCount ? { lastLoginAt: now } : {}),
        totalLoginCount: incrementLoginCount ? prevCount + 1 : Math.max(1, prevCount),
      },
      { merge: true }
    );

    if (incrementLoginCount) {
      const sessRef = await addDoc(collection(db, 'login_sessions'), {
        uid,
        studentName: fallbackName,
        email: cleanEmail || phone,
        courseName: studentProfile?.courseName || '',
        batchId: studentProfile?.batchId || '',
        batchName: studentProfile?.batchName || '',
        deviceType,
        loginTime: now,
        lastActive: now,
        isOnline: true,
      });
      return sessRef.id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function pingStudentHeartbeat(
  uid: string,
  sessionId: string | null,
  studyMinutesDelta = 1
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const actRef = doc(db, 'student_activity', uid);
    const snap = await getDoc(actRef).catch(() => null);
    const prevMins = snap?.exists() ? Number(snap.data()?.studyTimeMinutes || 0) : 0;
    await setDoc(
      actRef,
      {
        uid,
        isOnline: true,
        lastActive: now,
        studyTimeMinutes: prevMins + studyMinutesDelta,
      },
      { merge: true }
    );
    if (sessionId) {
      await setDoc(doc(db, 'login_sessions', sessionId), { lastActive: now, isOnline: true }, { merge: true }).catch(() => {});
    }
  } catch {
    // silent heartbeat fail
  }
}

export async function markStudentLoggedOut(uid: string, sessionId: string | null): Promise<void> {
  try {
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'student_activity', uid),
      { uid, isOnline: false, lastLogoutAt: now, lastActive: now },
      { merge: true }
    ).catch(() => {});
    if (sessionId) {
      await setDoc(doc(db, 'login_sessions', sessionId), { isOnline: false, logoutTime: now }, { merge: true }).catch(() => {});
    }
  } catch {
    // non-blocking
  }
}

export function generateAdmissionId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ZOC-${year}-${rand}`;
}

export function generateReceiptNo(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `RCP-${year}-${rand}`;
}

export async function logAdminActivity(actorEmail: string, actorRole: string, action: string, target: string): Promise<void> {
  try {
    await addDoc(collection(db, 'admin_activity_logs'), {
      actorEmail,
      actorRole,
      action,
      target,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Activity log skipped:', err);
  }
}

// Public Admissions & Enquiries
export async function submitAdmissionApplication(
  payload: Omit<AdmissionApplication, 'id' | 'admissionId' | 'status' | 'submittedAt'>
): Promise<AdmissionApplication> {
  const admissionId = generateAdmissionId();
  const mobile = String(payload.mobile).trim();
  const record = {
    ...payload,
    admissionId,
    email: String(payload.email).trim().toLowerCase(),
    mobile,
    status: 'pending' as const,
    remarks: 'Application received. Pending verification by institute office.',
    submittedAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, 'admissions'), record);
    const lookupKey = `${admissionId}_${mobile.replace(/\D/g, '')}`;
    await setDoc(doc(db, 'admission_status', lookupKey), {
      admissionId,
      fullName: record.fullName,
      courseName: record.courseName,
      batchName: record.batchName,
      studentClass: record.studentClass,
      board: record.board,
      status: 'pending',
      remarks: record.remarks,
      submittedAt: record.submittedAt,
    });
    return { id: docRef.id, ...record };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'admissions');
  }
}

export async function lookupAdmissionStatus(admissionId: string, mobile: string): Promise<Record<string, any> | null> {
  const cleanId = admissionId.trim().toUpperCase();
  const cleanMob = mobile.replace(/\D/g, '');
  const lookupKey = `${cleanId}_${cleanMob}`;
  try {
    const snap = await getDoc(doc(db, 'admission_status', lookupKey));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `admission_status/${lookupKey}`);
  }
}

export async function submitEnquiryForm(payload: {
  name: string;
  phone: string;
  email?: string;
  studentClass?: string;
  message: string;
  source: 'Contact Form' | 'Admission Enquiry';
}): Promise<void> {
  try {
    await addDoc(collection(db, 'enquiries'), {
      ...payload,
      status: 'New',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'enquiries');
  }
}

// Student Enrollments & Downloads
export async function enrollStudentInCourse(
  user: User,
  course: Course,
  batchId?: string,
  status: 'Active' | 'Pending' = 'Pending'
): Promise<EnrollmentRecord> {
  try {
    const resolvedStatus: 'Active' | 'Pending' = Number(course.fees || 0) === 0 ? 'Active' : status;
    const cleanEmail = getCleanEmailFromAuthUser(user.email);
    const phone = extractPhoneFromAuthUser(user);
    const record: Omit<EnrollmentRecord, 'id'> = {
      studentUid: user.uid,
      studentName: user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : phone || 'Student'),
      studentEmail: cleanEmail || phone,
      courseId: course.id,
      courseTitle: course.title,
      batchId: batchId || '',
      amountPaid: resolvedStatus === 'Active' ? Number(course.fees || 0) : 0,
      status: resolvedStatus,
      enrolledAt: new Date().toISOString(),
    };
    const docId = `${user.uid}_${course.id}`;
    await setDoc(doc(db, 'enrollments', docId), record, { merge: true });
    return { id: docId, ...record };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'enrollments');
  }
}

export async function saveStudentDownload(user: User, mat: StudyMaterial): Promise<DownloadRecord> {
  try {
    const record: Omit<DownloadRecord, 'id'> = {
      studentUid: user.uid,
      materialId: mat.id,
      title: mat.title,
      category: mat.category,
      chapter: mat.chapter,
      fileUrl: mat.fileUrl,
      downloadedAt: new Date().toISOString(),
    };
    const docId = `${user.uid}_${mat.id}`;
    await setDoc(doc(db, 'student_downloads', docId), record, { merge: true });
    return { id: docId, ...record };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'student_downloads');
  }
}

// Student Doubts & Certificates & Deletion Requests
export async function submitStudentDoubt(payload: {
  studentUid: string;
  studentName: string;
  admissionId?: string;
  courseId: string;
  courseTitle: string;
  batchId?: string;
  chapter: string;
  question: string;
}): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'doubts'), {
      ...payload,
      status: 'Open',
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'doubts');
  }
}

export async function replyToStudentDoubt(doubtId: string, reply: string, repliedBy: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'doubts', doubtId), {
      reply: reply.trim(),
      repliedBy,
      status: 'Answered',
      repliedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `doubts/${doubtId}`);
  }
}

export async function issueCourseCertificate(
  uid: string,
  studentName: string,
  admissionId: string,
  courseId: string,
  courseTitle: string,
  completionPercent: number,
  directorName: string
): Promise<CertificateRecord> {
  try {
    const docId = `${uid}_${courseId}`;
    const existing = await getDoc(doc(db, 'certificates', docId)).catch(() => null);
    if (existing && existing.exists()) {
      return { id: existing.id, ...(existing.data() as Omit<CertificateRecord, 'id'>) };
    }
    const cert: Omit<CertificateRecord, 'id'> = {
      certificateNo: `CERT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      studentUid: uid,
      studentName,
      admissionId,
      courseId,
      courseTitle,
      completionPercent,
      issuedAt: new Date().toISOString().slice(0, 10),
      directorName,
    };
    await setDoc(doc(db, 'certificates', docId), cert);
    return { id: docId, ...cert };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'certificates');
  }
}

export async function submitDeletionRequest(uid: string, studentName: string, email: string, reason: string): Promise<void> {
  try {
    await addDoc(collection(db, 'deletion_requests'), {
      studentUid: uid,
      studentName,
      email: email.toLowerCase(),
      reason: reason.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'deletion_requests');
  }
}

// Student Block / Unblock Management
export async function setStudentBlockStatus(
  student: { uid?: string; id?: string; name: string; email: string },
  options: {
    block: boolean;
    blockType?: 'temporary' | 'permanent';
    blockReason?: string;
    blockedUntil?: string;
  },
  actorEmail: string,
  actorRole: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const blockData = options.block
      ? {
          isBlocked: true,
          blockType: options.blockType || 'permanent',
          blockReason: options.blockReason || 'Restricted by Institute Administration',
          blockedUntil: options.blockType === 'temporary' ? options.blockedUntil || '' : '',
          blockedAt: now,
          blockedBy: actorEmail,
          status: 'inactive',
        }
      : {
          isBlocked: false,
          blockType: 'temporary',
          blockReason: '',
          blockedUntil: '',
          blockedAt: '',
          blockedBy: '',
          status: 'active',
        };

    if (student.id) {
      await setDoc(doc(db, 'students', student.id), blockData, { merge: true }).catch(() => {});
    }
    if (student.uid) {
      await setDoc(doc(db, 'users', student.uid), blockData, { merge: true }).catch(() => {});
      await setDoc(doc(db, 'student_activity', student.uid), { isOnline: false }, { merge: true }).catch(() => {});
    }
    await logAdminActivity(
      actorEmail,
      actorRole,
      options.block ? `Blocked Student (${options.blockType || 'permanent'})` : 'Unblocked Student',
      `${student.name} (${student.email})${options.blockReason ? ` — ${options.blockReason}` : ''}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${student.id || student.uid}`);
  }
}

// Student Portal Data & Actions
export async function fetchStudentPortalData(uid: string, email: string) {
  try {
    let sSnap = await getDocs(query(collection(db, 'students'), where('uid', '==', uid))).catch(() => null);
    if ((!sSnap || sSnap.empty) && email) {
      sSnap = await getDocs(query(collection(db, 'students'), where('email', '==', email.toLowerCase()))).catch(() => null);
    }
    const student = !sSnap || sSnap.empty ? null : ({ id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as StudentRecord);
    const batchId = student?.batchId || '';

    const [
      attSnap,
      feeSnap,
      paySnap,
      orderSnap,
      resSnap,
      subSnap,
      progSnap,
      enrollSnap,
      dlSnap,
      doubtSnap,
      certSnap,
      liveSnap,
      lecSnap,
      matSnap,
      hwSnap,
      testSnap,
      noticeSnap,
      notifSnap,
      ttSnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'attendance'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'fee_records'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'payments'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'orders'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'test_results'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'homework_submissions'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'lecture_progress'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'enrollments'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'student_downloads'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'doubts'), where('studentUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'certificates'), where('studentUid', '==', uid))).catch(() => null),
      batchId ? getDocs(query(collection(db, 'live_classes'), where('batchId', '==', batchId))) : getDocs(collection(db, 'live_classes')),
      getDocs(collection(db, 'recorded_lectures')),
      getDocs(collection(db, 'study_materials')),
      batchId ? getDocs(query(collection(db, 'homework'), where('batchId', '==', batchId))) : getDocs(collection(db, 'homework')),
      batchId ? getDocs(query(collection(db, 'tests'), where('batchId', '==', batchId))) : getDocs(collection(db, 'tests')),
      getDocs(query(collection(db, 'notices'), where('published', '==', true))),
      getDocs(collection(db, 'notifications')).catch(() => null),
      getDocs(collection(db, 'timetable')),
    ]);

    return {
      student,
      attendance: attSnap ? attSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceRecord) : [],
      fees: feeSnap ? feeSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeeRecord) : [],
      payments: paySnap ? paySnap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRecord) : [],
      orders: orderSnap ? orderSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrderRecord) : [],
      testResults: resSnap ? resSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult) : [],
      homeworkSubmissions: subSnap ? subSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as HomeworkSubmission) : [],
      lectureProgress: progSnap ? progSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as LectureProgress) : [],
      enrollments: enrollSnap ? enrollSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as EnrollmentRecord) : [],
      downloads: dlSnap ? dlSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as DownloadRecord) : [],
      doubts: doubtSnap ? doubtSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as DoubtItem) : [],
      certificates: certSnap ? certSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as CertificateRecord) : [],
      liveClasses: liveSnap.empty ? INITIAL_LIVE_CLASSES : liveSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as LiveClass),
      recordedLectures: lecSnap.empty ? INITIAL_LECTURES : lecSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecordedLecture),
      studyMaterials: matSnap.empty ? INITIAL_MATERIALS : matSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudyMaterial),
      homework: hwSnap.empty ? INITIAL_HOMEWORK : hwSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as HomeworkItem),
      tests: testSnap.empty ? INITIAL_TESTS : testSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestItem),
      notices: noticeSnap.empty ? INITIAL_NOTICES : noticeSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notice),
      notifications: notifSnap ? notifSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationItem) : [],
      timetable: ttSnap.empty ? INITIAL_TIMETABLE : ttSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TimetableSlot),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'student_portal');
  }
}

export async function updateStudentProfileFields(
  uid: string,
  studentId: string | undefined,
  updates: {
    mobile?: string;
    address?: string;
    photoUrl?: string;
    dob?: string;
    studentClass?: string;
    board?: string;
    examGoal?: ExamTrack;
    name?: string;
  }
) {
  try {
    const clean: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (updates.mobile !== undefined) {
      clean.mobile = updates.mobile;
      clean.phone = updates.mobile;
    }
    if (updates.address !== undefined) clean.address = updates.address;
    if (updates.photoUrl !== undefined) clean.photoUrl = updates.photoUrl;
    if (updates.dob !== undefined) clean.dob = updates.dob;
    if (updates.studentClass !== undefined) clean.studentClass = updates.studentClass;
    if (updates.board !== undefined) clean.board = updates.board;
    if (updates.examGoal !== undefined) clean.examGoal = updates.examGoal;
    if (updates.name !== undefined) clean.name = updates.name;

    await setDoc(doc(db, 'users', uid), clean, { merge: true });
    if (studentId) {
      const studentClean = { ...clean };
      delete studentClean.phone;
      await updateDoc(doc(db, 'students', studentId), studentClean).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function submitStudentHomework(
  uid: string,
  studentId: string,
  studentName: string,
  homeworkId: string,
  homeworkTitle: string,
  fileUrl: string
) {
  try {
    await addDoc(collection(db, 'homework_submissions'), {
      homeworkId,
      homeworkTitle,
      studentId,
      studentUid: uid,
      studentName,
      fileUrl,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'homework_submissions');
  }
}

export async function saveStudentLectureProgress(
  uid: string,
  lecture: { id: string; title?: string },
  completed: boolean,
  progressPercent: number,
  lastPositionSeconds = 0,
  durationSeconds = 0
) {
  try {
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'lecture_progress', `${uid}_${lecture.id}`),
      {
        studentUid: uid,
        lectureId: lecture.id,
        completed,
        progressPercent: Math.min(100, Math.max(0, Math.round(progressPercent))),
        lastPositionSeconds: Math.max(0, Math.round(lastPositionSeconds)),
        durationSeconds: Math.max(0, Math.round(durationSeconds)),
        lastWatchedAt: now,
      },
      { merge: true }
    );
    await setDoc(
      doc(db, 'student_activity', uid),
      {
        uid,
        lastWatchedLectureId: lecture.id,
        lastWatchedLectureTitle: lecture.title || '',
        videoProgressPercent: Math.min(100, Math.max(0, Math.round(progressPercent))),
        lastActive: now,
      },
      { merge: true }
    ).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `lecture_progress/${uid}_${lecture.id}`);
  }
}

export async function submitStudentMcqTest(
  uid: string,
  student: StudentRecord | null,
  test: TestItem,
  answers: Record<number, number>
) {
  const questions = test.questions || [];
  const totalQ = questions.length || 1;
  const marksPerQ = Number(test.maxMarks || 20) / totalQ;
  let correct = 0;
  const weak: string[] = [];
  questions.forEach((q, idx) => {
    if (Number(answers[idx]) === Number(q.correctIndex)) correct += 1;
    else if (q.chapter) weak.push(q.chapter);
  });
  const marksObtained = Math.round(correct * marksPerQ);
  const maxMarks = Number(test.maxMarks || 20);
  const percentage = Math.round((marksObtained / maxMarks) * 100);

  const payload = {
    testId: test.id,
    testTitle: test.title,
    studentId: student?.id || uid,
    studentUid: uid,
    studentName: student?.name || auth.currentUser?.displayName || 'Student',
    admissionId: student?.admissionId || 'ONLINE',
    marksObtained,
    maxMarks,
    percentage,
    rank: 1,
    weakChapters: Array.from(new Set(weak)).join(', ') || 'None',
    remarks:
      percentage >= 80
        ? 'Excellent conceptual command'
        : percentage >= 50
        ? 'Good effort — revise highlighted chapters'
        : 'Needs focused revision',
    date: new Date().toISOString().slice(0, 10),
  };

  try {
    await addDoc(collection(db, 'test_results'), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'test_results');
  }
}

// Teacher & Admin Data Loaders + Mutations
export async function fetchTeacherPortalData(teacherEmail?: string, userRole?: UserRole | null) {
  try {
    const [
      teachersSnap,
      studentsSnap,
      batchesSnap,
      coursesSnap,
      attSnap,
      liveSnap,
      lecSnap,
      matSnap,
      hwSnap,
      subSnap,
      testSnap,
      resSnap,
      ttSnap,
      noticeSnap,
      doubtSnap,
      actSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'teachers')).catch(() => null),
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'batches')),
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'attendance')),
      getDocs(collection(db, 'live_classes')),
      getDocs(collection(db, 'recorded_lectures')),
      getDocs(collection(db, 'study_materials')),
      getDocs(collection(db, 'homework')),
      getDocs(collection(db, 'homework_submissions')),
      getDocs(collection(db, 'tests')),
      getDocs(collection(db, 'test_results')),
      getDocs(collection(db, 'timetable')),
      getDocs(collection(db, 'notices')),
      getDocs(collection(db, 'doubts')).catch(() => null),
      getDocs(collection(db, 'student_activity')).catch(() => null),
    ]);

    const cleanEmail = (teacherEmail || '').toLowerCase();
    const teacherRec = teachersSnap?.docs
      .map((d) => ({ id: d.id, ...d.data() }) as TeacherRecord)
      .find((t) => t.email.toLowerCase() === cleanEmail) || null;

    let allBatches = batchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch);
    let allCourses = coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Course);
    let allStudents = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudentRecord);
    let allActivity = actSnap ? actSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudentActivityRecord) : [];

    // Scope strictly to teacher's assigned batches/courses when logged in as role === 'teacher'
    const assignedBatches = (teacherRec?.assignedBatches || []).map((x) => x.toLowerCase());
    const assignedCourses = (teacherRec?.assignedCourses || []).map((x) => x.toLowerCase());
    const shouldScope = userRole === 'teacher' && (assignedBatches.length > 0 || assignedCourses.length > 0);

    if (shouldScope) {
      allBatches = allBatches.filter(
        (b) =>
          assignedBatches.includes(b.id.toLowerCase()) ||
          assignedBatches.includes(b.name.toLowerCase()) ||
          assignedCourses.includes(b.courseId.toLowerCase()) ||
          assignedCourses.includes((b.courseName || '').toLowerCase())
      );
      allCourses = allCourses.filter(
        (c) => assignedCourses.includes(c.id.toLowerCase()) || assignedCourses.includes(c.title.toLowerCase())
      );
      const allowedBatchIds = new Set(allBatches.map((b) => b.id));
      const allowedCourseIds = new Set(allCourses.map((c) => c.id));
      allStudents = allStudents.filter(
        (s) =>
          allowedBatchIds.has(s.batchId) ||
          allowedCourseIds.has(s.courseId) ||
          assignedBatches.includes((s.batchName || '').toLowerCase()) ||
          assignedCourses.includes((s.courseName || '').toLowerCase())
      );
      allActivity = allActivity.filter(
        (a) =>
          allowedBatchIds.has(a.batchId || '') ||
          allowedCourseIds.has(a.courseId || '') ||
          assignedBatches.includes((a.batchName || '').toLowerCase()) ||
          assignedCourses.includes((a.courseName || '').toLowerCase())
      );
    }

    return {
      teacherRecord: teacherRec,
      students: allStudents,
      batches: allBatches,
      courses: allCourses,
      attendance: attSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceRecord),
      liveClasses: liveSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as LiveClass),
      recordedLectures: lecSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecordedLecture),
      studyMaterials: matSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudyMaterial),
      homework: hwSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as HomeworkItem),
      submissions: subSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as HomeworkSubmission),
      tests: testSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestItem),
      testResults: resSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult),
      timetable: ttSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TimetableSlot),
      notices: noticeSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notice),
      doubts: doubtSnap ? doubtSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as DoubtItem) : [],
      studentActivity: allActivity,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'teacher_portal');
  }
}

export async function fetchAdminOverviewData() {
  try {
    await seedInitialCatalogIfEmpty();
    const cols = [
      'admissions',
      'students',
      'teachers',
      'public_faculty',
      'courses',
      'batches',
      'posters',
      'banners',
      'enrollments',
      'orders',
      'attendance',
      'fee_records',
      'payments',
      'live_classes',
      'recorded_lectures',
      'study_materials',
      'homework',
      'tests',
      'test_results',
      'notices',
      'notifications',
      'gallery',
      'results',
      'timetable',
      'enquiries',
      'doubts',
      'student_activity',
      'login_sessions',
      'deletion_requests',
      'admin_activity_logs',
      'users',
    ] as const;

    const snaps = await Promise.all(cols.map((c) => getDocs(collection(db, c)).catch(() => null)));
    const settingsSnap = await getDoc(doc(db, 'institute_settings', 'main'));

    const payload: Record<string, any> = {
      settings: settingsSnap.exists() ? settingsSnap.data() : INITIAL_SETTINGS,
    };
    cols.forEach((c, idx) => {
      const snap = snaps[idx];
      payload[c] = snap ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
    });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin_overview');
  }
}

export async function saveBatchAttendance(
  batchId: string,
  batchName: string,
  date: string,
  records: Array<{
    studentId: string;
    studentUid?: string;
    studentName: string;
    admissionId: string;
    status: 'Present' | 'Absent' | 'Late' | 'Leave';
  }>,
  markedBy: string,
  actorRole: string
) {
  try {
    const batch = writeBatch(db);
    for (const r of records) {
      const docId = `${date}_${batchId}_${r.studentId}`;
      batch.set(
        doc(db, 'attendance', docId),
        {
          studentId: r.studentId,
          studentUid: r.studentUid || '',
          studentName: r.studentName,
          admissionId: r.admissionId,
          batchId,
          batchName,
          date,
          status: r.status,
          markedBy,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    await batch.commit();
    await logAdminActivity(markedBy, actorRole, 'Marked Attendance', `${batchName} (${date})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'attendance');
  }
}

export async function decideAdmission(
  adm: AdmissionApplication,
  decision: 'approved' | 'rejected' | 'pending' | 'under_review',
  actorEmail: string,
  actorRole: string,
  customMessage?: string
) {
  try {
    const remarks =
      customMessage?.trim() ||
      (decision === 'approved'
        ? 'Admission approved! Welcome to THE ZONE OF CHEMISTRY.'
        : decision === 'rejected'
        ? 'Application could not be approved at this time.'
        : decision === 'under_review'
        ? 'Your application is currently Under Review by our academic desk.'
        : 'Pending review.');

    await updateDoc(doc(db, 'admissions', adm.id), {
      status: decision,
      remarks,
      ...(customMessage ? { requestedInfoMessage: customMessage.trim() } : {}),
      reviewedAt: new Date().toISOString(),
    });

    const lookupKey = `${adm.admissionId}_${String(adm.mobile).replace(/\D/g, '')}`;
    await setDoc(
      doc(db, 'admission_status', lookupKey),
      {
        admissionId: adm.admissionId,
        fullName: adm.fullName,
        courseName: adm.courseName,
        batchName: adm.batchName,
        studentClass: adm.studentClass,
        board: adm.board,
        status: decision,
        remarks,
        ...(customMessage ? { requestedInfoMessage: customMessage.trim() } : {}),
        submittedAt: adm.submittedAt,
        reviewedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    if (decision === 'approved') {
      const existing = await getDocs(query(collection(db, 'students'), where('admissionId', '==', adm.admissionId)));
      if (existing.empty) {
        const courseDoc = adm.courseId ? await getDoc(doc(db, 'courses', adm.courseId)).catch(() => null) : null;
        const courseFees = courseDoc && courseDoc.exists() ? Number(courseDoc.data()?.fees || 12000) : 12000;

        const studentRef = await addDoc(collection(db, 'students'), {
          uid: '',
          admissionId: adm.admissionId,
          name: adm.fullName,
          fatherName: adm.fatherName,
          motherName: adm.motherName || '',
          dob: adm.dob || '',
          gender: adm.gender || '',
          email: adm.email.toLowerCase(),
          mobile: adm.mobile,
          whatsapp: adm.whatsapp || adm.mobile,
          address: adm.address || '',
          schoolName: adm.schoolName || '',
          studentClass: adm.studentClass,
          board: adm.board,
          courseId: adm.courseId,
          courseName: adm.courseName,
          batchId: adm.batchId,
          batchName: adm.batchName,
          previousMarks: adm.previousMarks || '',
          guardianContact: adm.guardianContact || adm.mobile,
          photoUrl: adm.photoUrl || '',
          status: 'active',
          isBlocked: false,
          createdAt: new Date().toISOString(),
        });

        await addDoc(collection(db, 'fee_records'), {
          studentId: studentRef.id,
          studentUid: '',
          studentName: adm.fullName,
          admissionId: adm.admissionId,
          courseName: adm.courseName,
          totalFees: courseFees,
          discount: 0,
          scholarship: 0,
          paidAmount: 0,
          lateFee: 0,
          installments: 2,
          dueDate: new Date(Date.now() + 15 * 86400_000).toISOString().slice(0, 10),
          status: 'Pending',
          updatedAt: new Date().toISOString(),
        });
      }
      await addDoc(collection(db, 'notifications'), {
        title: 'Admission Approved',
        message: `Congratulations ${adm.fullName}! Your admission (${adm.admissionId}) for ${adm.courseName} is approved.`,
        type: 'admission',
        targetType: 'all',
        createdAt: new Date().toISOString(),
      });
    } else if (customMessage) {
      await addDoc(collection(db, 'notifications'), {
        title: `Admission Update (${adm.admissionId})`,
        message: `${adm.fullName}: ${customMessage}`,
        type: 'admission',
        targetType: 'all',
        createdAt: new Date().toISOString(),
      });
    }

    await logAdminActivity(actorEmail, actorRole, `Admission ${decision}`, `${adm.fullName} (${adm.admissionId})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `admissions/${adm.id}`);
  }
}

export async function createAdminStudent(
  payload: {
    name: string;
    fatherName: string;
    email: string;
    mobile: string;
    studentClass: string;
    board: string;
    courseId: string;
    courseName: string;
    batchId: string;
    batchName: string;
    totalFees: string;
  },
  actorEmail: string,
  actorRole: string
) {
  try {
    const admissionId = generateAdmissionId();
    const studentRef = await addDoc(collection(db, 'students'), {
      uid: '',
      admissionId,
      name: payload.name.trim(),
      fatherName: payload.fatherName.trim(),
      motherName: '',
      dob: '',
      gender: '',
      email: payload.email.trim().toLowerCase(),
      mobile: payload.mobile.trim(),
      whatsapp: payload.mobile.trim(),
      address: '',
      schoolName: '',
      studentClass: payload.studentClass,
      board: payload.board,
      courseId: payload.courseId,
      courseName: payload.courseName,
      batchId: payload.batchId,
      batchName: payload.batchName,
      previousMarks: '',
      guardianContact: payload.mobile.trim(),
      photoUrl: '',
      status: 'active',
      isBlocked: false,
      createdAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'fee_records'), {
      studentId: studentRef.id,
      studentUid: '',
      studentName: payload.name.trim(),
      admissionId,
      courseName: payload.courseName,
      totalFees: Number(payload.totalFees || 12000),
      discount: 0,
      scholarship: 0,
      paidAmount: 0,
      lateFee: 0,
      installments: 2,
      dueDate: new Date(Date.now() + 15 * 86400_000).toISOString().slice(0, 10),
      status: 'Pending',
      updatedAt: new Date().toISOString(),
    });

    await logAdminActivity(actorEmail, actorRole, 'Added Student', `${payload.name} (${admissionId})`);
    return admissionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
  }
}

export async function createAdminTeacher(
  payload: {
    name: string;
    email: string;
    phone: string;
    qualification: string;
    subjects: string;
    experience: string;
    description?: string;
    photoUrl?: string;
    posterUrl?: string;
    assignedBatches?: string[];
    assignedCourses?: string[];
  },
  actorEmail: string,
  actorRole: string
) {
  const email = payload.email.trim().toLowerCase();
  try {
    const ref = await addDoc(collection(db, 'teachers'), {
      ...payload,
      email,
      uid: '',
      assignedBatches: payload.assignedBatches || [],
      assignedCourses: payload.assignedCourses || [],
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'teachers_by_email', email), {
      email,
      name: payload.name.trim(),
      teacherDocId: ref.id,
      status: 'active',
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'public_faculty', ref.id), {
      name: payload.name.trim(),
      qualification: payload.qualification || '',
      subjects: payload.subjects || '',
      experience: payload.experience || '',
      description: payload.description || '',
      photoUrl: payload.photoUrl || '',
      posterUrl: payload.posterUrl || '',
      assignedBatches: payload.assignedBatches || [],
      assignedCourses: payload.assignedCourses || [],
      active: true,
    });
    await logAdminActivity(actorEmail, actorRole, 'Created Teacher Account', `${payload.name} (${email})`);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'teachers');
  }
}

export async function updateAdminTeacher(
  teacherId: string,
  updates: Partial<PublicFacultyCard> & { email?: string; phone?: string },
  actorEmail: string,
  actorRole: string
) {
  try {
    await setDoc(doc(db, 'teachers', teacherId), updates, { merge: true });
    if (updates.email) {
      await setDoc(
        doc(db, 'teachers_by_email', updates.email.toLowerCase()),
        {
          email: updates.email.toLowerCase(),
          name: updates.name || '',
          teacherDocId: teacherId,
          status: 'active',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    await setDoc(
      doc(db, 'public_faculty', teacherId),
      {
        name: updates.name,
        qualification: updates.qualification,
        subjects: updates.subjects,
        experience: updates.experience,
        description: updates.description,
        photoUrl: updates.photoUrl,
        posterUrl: updates.posterUrl,
        assignedBatches: updates.assignedBatches,
        assignedCourses: updates.assignedCourses,
        active: updates.active ?? true,
      },
      { merge: true }
    );
    await logAdminActivity(actorEmail, actorRole, 'Updated Teacher Profile', updates.name || teacherId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `teachers/${teacherId}`);
  }
}

export async function deleteAdminTeacher(teacherId: string, teacherEmail: string, actorEmail: string, actorRole: string) {
  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
    await deleteDoc(doc(db, 'public_faculty', teacherId)).catch(() => {});
    if (teacherEmail) {
      await deleteDoc(doc(db, 'teachers_by_email', teacherEmail.toLowerCase())).catch(() => {});
    }
    await logAdminActivity(actorEmail, actorRole, 'Deleted Teacher', teacherEmail || teacherId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teachers/${teacherId}`);
  }
}

export async function updateUserRoleBySuperAdmin(
  targetUser: UserProfile,
  newRole: 'student' | 'teacher' | 'admin',
  actorEmail: string
) {
  try {
    await setDoc(doc(db, 'users', targetUser.uid), { role: newRole }, { merge: true });
    if (newRole === 'admin') {
      await setDoc(doc(db, 'admins', targetUser.uid), {
        uid: targetUser.uid,
        email: targetUser.email.toLowerCase(),
        role: 'admin',
        assignedBy: actorEmail,
        updatedAt: new Date().toISOString(),
      });
      await deleteDoc(doc(db, 'teachers_by_email', targetUser.email.toLowerCase())).catch(() => {});
    } else if (newRole === 'teacher') {
      await deleteDoc(doc(db, 'admins', targetUser.uid)).catch(() => {});
      await setDoc(doc(db, 'teachers_by_email', targetUser.email.toLowerCase()), {
        email: targetUser.email.toLowerCase(),
        name: targetUser.name,
        status: 'active',
        updatedAt: new Date().toISOString(),
      });
    } else {
      await deleteDoc(doc(db, 'admins', targetUser.uid)).catch(() => {});
      await deleteDoc(doc(db, 'teachers_by_email', targetUser.email.toLowerCase())).catch(() => {});
    }
    await logAdminActivity(actorEmail, 'super_admin', 'Updated User Role', `${targetUser.email} -> ${newRole}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${targetUser.uid}`);
  }
}

export async function recordFeePaymentInFirestore(
  fee: FeeRecord,
  amount: number,
  mode: PaymentRecord['mode'],
  referenceId: string,
  actorEmail: string,
  actorRole: string
) {
  try {
    const newPaid = Number(fee.paidAmount || 0) + amount;
    const netTotal = Math.max(
      0,
      Number(fee.totalFees || 0) - Number(fee.discount || 0) - Number(fee.scholarship || 0) + Number(fee.lateFee || 0)
    );
    const status = newPaid >= netTotal ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
    const receiptNo = generateReceiptNo();

    await addDoc(collection(db, 'payments'), {
      receiptNo,
      feeRecordId: fee.id,
      studentId: fee.studentId,
      studentUid: fee.studentUid || '',
      studentName: fee.studentName,
      admissionId: fee.admissionId,
      courseTitle: fee.courseName,
      amount,
      mode,
      referenceId,
      paymentStatus: 'PAID',
      refundStatus: 'None',
      verified: true,
      paidAt: new Date().toISOString(),
      recordedBy: actorEmail,
    });
    await updateDoc(doc(db, 'fee_records', fee.id), {
      paidAmount: newPaid,
      status,
      updatedAt: new Date().toISOString(),
    });
    if (fee.studentUid) {
      await addDoc(collection(db, 'notifications'), {
        title: 'Fee Receipt Generated',
        message: `Payment of ₹${amount} received via ${mode} (Receipt: ${receiptNo}).`,
        type: 'fee',
        targetType: 'student',
        targetUid: fee.studentUid,
        createdAt: new Date().toISOString(),
      });
    }
    await logAdminActivity(actorEmail, actorRole, 'Recorded Fee Payment', `${fee.studentName} ₹${amount} (${receiptNo})`);
    return receiptNo;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'payments');
  }
}

export async function exportFullBackupFromFirestore(actorEmail: string) {
  const overview = await fetchAdminOverviewData();
  await logAdminActivity(actorEmail, 'super_admin', 'Exported Full Database Backup', 'JSON');
  return {
    exportedAt: new Date().toISOString(),
    project: 'THE ZONE OF CHEMISTRY',
    ...overview,
  };
}

export async function publishPosterTarget(poster: Omit<PosterItem, 'id'>, existingId?: string): Promise<string> {
  try {
    let posterId = existingId;
    if (posterId) {
      await setDoc(doc(db, 'posters', posterId), { ...poster, updatedAt: new Date().toISOString() }, { merge: true });
    } else {
      const ref = await addDoc(collection(db, 'posters'), { ...poster, updatedAt: new Date().toISOString() });
      posterId = ref.id;
    }

    if (poster.published && poster.imageUrl) {
      if (poster.targetType === 'Course Poster' && poster.targetId) {
        await setDoc(doc(db, 'courses', poster.targetId), { imageUrl: poster.imageUrl }, { merge: true }).catch(() => {});
      } else if (poster.targetType === 'Batch Poster' && poster.targetId) {
        await setDoc(doc(db, 'batches', poster.targetId), { posterUrl: poster.imageUrl }, { merge: true }).catch(() => {});
      } else if (poster.targetType === 'Test Series Poster' && poster.targetId) {
        await setDoc(doc(db, 'tests', poster.targetId), { posterUrl: poster.imageUrl }, { merge: true }).catch(() => {});
      } else if (poster.targetType === 'Study Material Cover' && poster.targetId) {
        await setDoc(doc(db, 'study_materials', poster.targetId), { coverUrl: poster.imageUrl }, { merge: true }).catch(() => {});
      } else if (poster.targetType === 'Notice Image' && poster.targetId) {
        await setDoc(doc(db, 'notices', poster.targetId), { imageUrl: poster.imageUrl }, { merge: true }).catch(() => {});
      } else if (poster.targetType === 'Teacher Poster' && poster.targetId) {
        await setDoc(doc(db, 'public_faculty', poster.targetId), { posterUrl: poster.imageUrl }, { merge: true }).catch(() => {});
        await setDoc(doc(db, 'teachers', poster.targetId), { posterUrl: poster.imageUrl }, { merge: true }).catch(() => {});
      } else if (poster.targetType === 'Teacher Profile Photo' && poster.targetId) {
        await setDoc(doc(db, 'public_faculty', poster.targetId), { photoUrl: poster.imageUrl }, { merge: true }).catch(() => {});
        await setDoc(doc(db, 'teachers', poster.targetId), { photoUrl: poster.imageUrl }, { merge: true }).catch(() => {});
      } else if (poster.targetType === 'Institute Logo') {
        await setDoc(doc(db, 'institute_settings', 'main'), { logoUrl: poster.imageUrl }, { merge: true }).catch(() => {});
      } else if (poster.targetType === 'Homepage Banner') {
        await setDoc(doc(db, 'institute_settings', 'main'), { heroBannerUrl: poster.imageUrl }, { merge: true }).catch(() => {});
        await setDoc(
          doc(db, 'banners', posterId),
          {
            title: poster.title,
            subtitle: poster.category,
            ctaLabel: 'Explore Courses',
            ctaPath: '/courses',
            imageUrl: poster.imageUrl,
            published: true,
            startDate: '2026-01-01',
            endDate: '2027-12-31',
            sortOrder: 1,
            createdAt: poster.createdAt,
          } satisfies Omit<BannerItem, 'id'>,
          { merge: true }
        );
      }
    }
    return posterId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'posters');
  }
}

export async function sendTargetedNotification(
  payload: Omit<NotificationItem, 'id' | 'createdAt'>,
  actorEmail: string
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'notifications'), {
      ...payload,
      createdBy: actorEmail,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications');
  }
}

// Generic CRUD Helpers
export async function addDocument(colName: string, data: Record<string, any>) {
  try {
    const ref = await addDoc(collection(db, colName), data);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colName);
  }
}

export async function setDocument(colName: string, id: string, data: Record<string, any>) {
  try {
    await setDoc(doc(db, colName, id), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colName}/${id}`);
  }
}

export async function removeDocument(colName: string, id: string) {
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colName}/${id}`);
  }
}
