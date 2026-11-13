export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student';

export type ExamTrack =
  | 'Class 11 Chemistry'
  | 'Class 12 Chemistry'
  | '12th IIT-JEE'
  | '12th NEET'
  | 'Dropper Chemistry';

export type PosterTargetType =
  | 'Course Poster'
  | 'Teacher Poster'
  | 'Teacher Profile Photo'
  | 'Homepage Banner'
  | 'Batch Poster'
  | 'Test Series Poster'
  | 'Study Material Cover'
  | 'Student Profile Photo'
  | 'Gallery Image'
  | 'Notice Image'
  | 'Institute Logo';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  photoUrl?: string;
  phone?: string;
  address?: string;
  dob?: string;
  studentClass?: string;
  board?: string;
  examGoal?: ExamTrack;
  isBlocked?: boolean;
  blockType?: 'temporary' | 'permanent';
  blockReason?: string;
  blockedUntil?: string;
  blockedAt?: string;
  blockedBy?: string;
  notificationReadAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentRecord {
  id: string;
  uid?: string;
  admissionId: string;
  name: string;
  fatherName: string;
  motherName: string;
  dob: string;
  gender: string;
  email: string;
  mobile: string;
  whatsapp: string;
  address: string;
  schoolName: string;
  studentClass: string;
  board: string;
  examGoal?: ExamTrack;
  courseId: string;
  courseName: string;
  batchId: string;
  batchName: string;
  previousMarks: string;
  guardianContact: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
  isBlocked?: boolean;
  blockType?: 'temporary' | 'permanent';
  blockReason?: string;
  blockedUntil?: string;
  blockedAt?: string;
  blockedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TeacherRecord {
  id: string;
  uid?: string;
  name: string;
  email: string;
  phone: string;
  qualification: string;
  subjects: string;
  experience: string;
  description?: string;
  photoUrl?: string;
  posterUrl?: string;
  assignedBatches: string[];
  assignedCourses?: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PublicFacultyCard {
  id: string;
  name: string;
  qualification: string;
  subjects: string;
  experience: string;
  description: string;
  photoUrl: string;
  posterUrl?: string;
  assignedBatches?: string[];
  assignedCourses?: string[];
  active: boolean;
}

export interface AdmissionApplication {
  id: string;
  admissionId: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  dob: string;
  gender: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  schoolName: string;
  studentClass: string;
  board: string;
  courseId: string;
  courseName: string;
  batchId: string;
  batchName: string;
  previousMarks: string;
  photoUrl?: string;
  guardianContact: string;
  additionalInfo?: string;
  requestedInfoMessage?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  remarks?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  examTrack?: ExamTrack;
  description: string;
  duration: string;
  fees: number;
  mrpPrice?: number;
  discountPercent?: number;
  statusLabel?: string;
  subjects: string;
  batchAvailability: string;
  liveSchedule?: string;
  teacherName: string;
  syllabus: string[];
  chapters?: string[];
  imageUrl: string;
  published: boolean;
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string;
  timing: string;
  mode: 'Offline' | 'Online' | 'Hybrid';
  courseId: string;
  courseName: string;
  teacherName: string;
  capacity: number;
  enrolledCount: number;
  fees: number;
  days: string;
  posterUrl?: string;
  category?: string;
}

export interface PosterItem {
  id: string;
  title: string;
  category: string;
  targetType: PosterTargetType;
  targetId?: string;
  imageUrl: string;
  published: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaPath?: string;
  imageUrl: string;
  published: boolean;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
  createdAt: string;
}

export interface EnrollmentRecord {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  batchId?: string;
  orderId?: string;
  amountPaid: number;
  status: 'Active' | 'Pending';
  enrolledAt: string;
}

export interface OrderRecord {
  id: string;
  orderId: string;
  cfOrderId?: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  courseId: string;
  courseTitle: string;
  feeRecordId?: string;
  amount: number;
  currency: string;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'PENDING' | 'CANCELLED';
  refundStatus?: 'None' | 'Requested' | 'Refunded';
  paymentSessionId?: string;
  cfPaymentId?: string;
  receiptNo?: string;
  gatewayMode?: 'sandbox' | 'production' | 'offline';
  createdAt: string;
  updatedAt?: string;
}

export interface DownloadRecord {
  id: string;
  studentUid: string;
  materialId: string;
  title: string;
  category: string;
  chapter: string;
  fileUrl: string;
  downloadedAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentUid?: string;
  studentName: string;
  admissionId: string;
  batchId: string;
  batchName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  markedBy: string;
  createdAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentUid?: string;
  studentName: string;
  admissionId: string;
  courseName: string;
  totalFees: number;
  discount: number;
  scholarship: number;
  paidAmount: number;
  lateFee: number;
  installments: number;
  dueDate: string;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  feeRecordId: string;
  orderId?: string;
  cashfreeOrderId?: string;
  cfPaymentId?: string;
  courseId?: string;
  courseTitle?: string;
  studentId: string;
  studentUid?: string;
  studentName: string;
  admissionId: string;
  amount: number;
  mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Online' | 'Cashfree';
  referenceId?: string;
  paymentStatus?: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  refundStatus?: 'None' | 'Requested' | 'Refunded';
  verified: boolean;
  paidAt: string;
  recordedBy: string;
}

export interface LiveClass {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  courseId: string;
  batchId: string;
  batchName: string;
  teacherName: string;
  platform: 'Google Meet' | 'Zoom' | 'YouTube Live' | 'Jitsi';
  joinUrl: string;
  recordedUrl?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'Upcoming' | 'Live' | 'Completed';
}

export interface RecordedLecture {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  batchId: string;
  chapter: string;
  lectureNumber?: number;
  duration: string;
  videoUrl: string;
  thumbnailUrl?: string;
  videoSource?: 'youtube' | 'direct';
  protectedMediaId?: string;
  isFreePreview?: boolean;
  published?: boolean;
  platform: 'YouTube' | 'Vimeo' | 'Direct';
  publishDate: string;
}

export interface LectureProgress {
  id: string;
  studentUid: string;
  lectureId: string;
  completed: boolean;
  progressPercent: number;
  lastPositionSeconds?: number;
  durationSeconds?: number;
  lastWatchedAt: string;
}

export type StudyMaterialCategory =
  | 'Chemistry Notes'
  | 'PDF Notes'
  | 'NCERT Notes'
  | 'Important Questions'
  | 'PYQ'
  | 'Previous Year Questions'
  | 'Assignment'
  | 'Worksheet'
  | 'Test Paper'
  | 'Answer Key'
  | 'DPP'
  | 'Practice Questions'
  | 'Mock Test'
  | 'Revision Material';

export interface StudyMaterial {
  id: string;
  title: string;
  category: StudyMaterialCategory;
  courseId: string;
  courseName: string;
  batchId: string;
  chapter: string;
  description?: string;
  fileUrl: string;
  coverUrl?: string;
  published?: boolean;
  uploadedBy: string;
  createdAt: string;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  courseId: string;
  batchId: string;
  batchName: string;
  chapter: string;
  dueDate: string;
  attachmentUrl?: string;
  assignedBy: string;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  homeworkTitle: string;
  studentId: string;
  studentUid: string;
  studentName: string;
  fileUrl: string;
  notes?: string;
  status: 'Submitted' | 'Reviewed';
  remarks?: string;
  submittedAt: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  chapter: string;
}

export interface TestItem {
  id: string;
  title: string;
  testType: 'Online MCQ' | 'Offline Test' | 'Practice Test' | 'Mock Test';
  subject: string;
  courseId: string;
  batchId: string;
  batchName: string;
  date: string;
  durationMinutes: number;
  maxMarks: number;
  instructions: string;
  posterUrl?: string;
  questions?: MCQQuestion[];
  createdAt: string;
}

export interface TestResult {
  id: string;
  testId: string;
  testTitle: string;
  studentId: string;
  studentUid?: string;
  studentName: string;
  admissionId: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  rank: number;
  weakChapters?: string;
  remarks?: string;
  date: string;
}

export interface Notice {
  id: string;
  title: string;
  category: 'New Admission' | 'Exam Dates' | 'Holidays' | 'Class Timetable' | 'Test Schedule' | 'Results' | 'Important Announcement';
  content: string;
  date: string;
  imageUrl?: string;
  important: boolean;
  published: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'admission' | 'notice' | 'class' | 'test' | 'result' | 'fee' | 'homework' | 'payment' | 'doubt' | 'system';
  targetType: 'all' | 'batch' | 'course' | 'student' | 'teacher';
  targetId?: string;
  targetUid?: string;
  createdBy?: string;
  createdAt: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Institute' | 'Classroom' | 'Teacher' | 'Awards' | 'Events' | 'Banners';
  album: string;
  imageUrl: string;
  published: boolean;
  featured: boolean;
  createdAt: string;
}

export interface InstituteResult {
  id: string;
  studentName: string;
  examName: string;
  achievement: string;
  marksOrRank: string;
  year: string;
  photoUrl: string;
}

export interface TimetableSlot {
  id: string;
  title: string;
  eventType: 'Daily Class' | 'Live Class' | 'Test' | 'Holiday' | 'Event' | 'Admission Date';
  dayOfWeek?: string;
  date?: string;
  startTime: string;
  endTime: string;
  batchId?: string;
  batchName?: string;
  teacherName?: string;
  room?: string;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  studentClass?: string;
  message: string;
  source: 'Contact Form' | 'Admission Enquiry';
  status: 'New' | 'Contacted';
  createdAt: string;
}

export interface DoubtItem {
  id: string;
  studentUid: string;
  studentName: string;
  admissionId?: string;
  courseId: string;
  courseTitle: string;
  batchId?: string;
  chapter: string;
  question: string;
  reply?: string;
  repliedBy?: string;
  status: 'Open' | 'Answered';
  createdAt: string;
  repliedAt?: string;
}

export interface StudentActivityRecord {
  id: string;
  uid: string;
  studentName: string;
  email: string;
  admissionId?: string;
  courseId?: string;
  courseName?: string;
  batchId?: string;
  batchName?: string;
  isOnline: boolean;
  deviceType: string;
  lastActive: string;
  lastLoginAt: string;
  lastLogoutAt?: string;
  totalLoginCount: number;
  studyTimeMinutes: number;
  lastWatchedLectureId?: string;
  lastWatchedLectureTitle?: string;
  videoProgressPercent?: number;
}

export interface LoginSessionRecord {
  id: string;
  uid: string;
  studentName: string;
  email: string;
  courseName?: string;
  batchId?: string;
  batchName?: string;
  deviceType: string;
  loginTime: string;
  logoutTime?: string;
  lastActive: string;
  isOnline: boolean;
}

export interface CertificateRecord {
  id: string;
  certificateNo: string;
  studentUid: string;
  studentName: string;
  admissionId?: string;
  courseId: string;
  courseTitle: string;
  completionPercent: number;
  issuedAt: string;
  directorName: string;
}

export interface DeletionRequest {
  id: string;
  studentUid: string;
  studentName: string;
  email: string;
  reason: string;
  status: 'Pending' | 'Reviewed' | 'Completed';
  createdAt: string;
}

export interface InstituteSettings {
  instituteName: string;
  tagline: string;
  heroHeading: string;
  heroSubheading: string;
  heroBannerUrl: string;
  logoUrl: string;
  directorName: string;
  directorPhotoUrl: string;
  directorExperience: string;
  directorQualification: string;
  directorSubjects: string;
  directorPhilosophy: string;
  aboutText: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  primaryColor: string;
  accentColor: string;
  showSections: {
    about: boolean;
    courses: boolean;
    batches: boolean;
    whyChooseUs: boolean;
    notices: boolean;
    results: boolean;
    gallery: boolean;
    contact: boolean;
  };
}

export interface AdminActivityLog {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  target: string;
  timestamp: string;
}
