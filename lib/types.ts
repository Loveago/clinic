export type Role =
  | 'SUPER_ADMIN'
  | 'CLINIC_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'ADMISSIONS_OFFICER'
  | 'FINANCE_OFFICER'
  | 'LECTURER'
  | 'EXAM_OFFICER'
  | 'STUDENT';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  avatar?: string | null;
  studentProfile?: {
    id: string;
    studentId: string;
    programmeId: string;
    intake: string;
    currentSemester: string;
    programme: {
      name: string;
      code: string;
    };
  } | null;
}

export interface AppointmentData {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string | null;
  serviceId?: string | null;
  departmentName?: string | null;
  preferredDate: string;
  preferredTime: string;
  message?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED' | 'DECLINED';
  createdAt: string;
}

export interface ExamQuestion {
  id: string;
  orderIndex: number;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  marks: number;
}

