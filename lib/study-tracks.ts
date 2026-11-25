export type StudyTrackCode = '6_MONTH' | '12_MONTH';

export interface StudyTrackConfig {
  code: StudyTrackCode;
  label: string;
  shortLabel: string;
  durationMonths: number;
  semestersCount: number;
  semesterLabels: string[];
  moduleRange: string;
  requiredExams: Array<'END_OF_SEMESTER' | 'FINAL'>;
  examScheduleSummary: string;
  description: string;
}

export const STUDY_TRACK_CONFIGS: Record<StudyTrackCode, StudyTrackConfig> = {
  '6_MONTH': {
    code: '6_MONTH',
    label: '6-Month Accelerated Track',
    shortLabel: '6-Month Track',
    durationMonths: 6,
    semestersCount: 1,
    semesterLabels: ['First Semester'],
    moduleRange: 'Modules 1–13 (All in 1 Semester)',
    requiredExams: ['FINAL'],
    examScheduleSummary: 'Single 6-month semester covering Modules 1–13, followed by the Final Comprehensive Examination.',
    description:
      'Accelerated 6-month programme completing all Modules 1–13 in 1 semester, culminating in the Final Examination.',
  },
  '12_MONTH': {
    code: '12_MONTH',
    label: '12-Month Standard Track',
    shortLabel: '12-Month Track',
    durationMonths: 12,
    semestersCount: 2,
    semesterLabels: ['First Semester', 'Second Semester'],
    moduleRange: 'Modules 1–13 across 2 Semesters (Sem 1: Modules 1–6, Sem 2: Modules 7–13)',
    requiredExams: ['END_OF_SEMESTER', 'FINAL'],
    examScheduleSummary:
      'Two 6-month semesters: Semester 1 (Modules 1–6) End-of-Semester Examination + Semester 2 (Modules 7–13) Final Examination.',
    description:
      'Standard 12-month programme completing Modules 1–13 across 2 semesters, with an End-of-Semester Examination and a Final Examination.',
  },
};

export const AVAILABLE_STUDY_TRACKS: StudyTrackConfig[] = [
  STUDY_TRACK_CONFIGS['6_MONTH'],
  STUDY_TRACK_CONFIGS['12_MONTH'],
];

/**
 * Normalize arbitrary track input (e.g. "6-month", "6_MONTH", "12 Months") to StudyTrackCode.
 */
export function normalizeStudyTrack(raw?: string | null): StudyTrackCode {
  const val = String(raw || '').trim().toUpperCase();
  if (
    val === '6_MONTH' ||
    val === '6-MONTH' ||
    val === '6 MONTH' ||
    val === '6_MONTHS' ||
    val === '6M' ||
    val.includes('6 MONTH') ||
    val.includes('6-MONTH')
  ) {
    return '6_MONTH';
  }
  return '12_MONTH';
}

export function getStudyTrackConfig(raw?: string | null): StudyTrackConfig {
  return STUDY_TRACK_CONFIGS[normalizeStudyTrack(raw)];
}

/**
 * Resolve which semester a course belongs to for a given student track.
 * - On 6_MONTH track, all programme courses are taken in the single First Semester.
 * - On 12_MONTH track, courses keep their configured semester (defaulting to First Semester or Second Semester based on course code/order).
 */
export function resolveCourseSemesterForTrack(
  course: { code?: string | null; semester?: string | null },
  track: StudyTrackCode
): string {
  if (track === '6_MONTH') {
    return 'First Semester';
  }
  if (course.semester && course.semester.trim()) {
    // Respect explicit Second Semester; for CGV 102/103 or NAS 103/104/PHE 103 we can also keep DB semester
    return course.semester;
  }
  return 'First Semester';
}

/**
 * Check if a student on a given study track is eligible for an exam's track/examType.
 */
export function checkTrackExamCompatibility(params: {
  studentTrack?: string | null;
  examTrack?: string | null;
  examType?: string | null;
}): { compatible: boolean; reason?: string } {
  const studentTrack = normalizeStudyTrack(params.studentTrack);

  if (params.examTrack) {
    const requiredTrack = normalizeStudyTrack(params.examTrack);
    if (studentTrack !== requiredTrack) {
      const label = STUDY_TRACK_CONFIGS[requiredTrack].shortLabel;
      return {
        compatible: false,
        reason: `This examination is designated for the ${label} only.`,
      };
    }
  }

  return { compatible: true };
}
