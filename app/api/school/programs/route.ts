import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  BROCHURE_PROGRAMMES,
  ADDITIONAL_BROCHURE_PROGRAMMES,
  GRADUATION_REQUIREMENTS,
} from '@/lib/school-programs-catalog';
import { AVAILABLE_STUDY_TRACKS } from '@/lib/study-tracks';

export async function GET() {
  try {
    const dbPrograms = await prisma.programme.findMany({
      include: {
        department: { select: { name: true, code: true } },
        courses: {
          where: { status: 'ACTIVE' },
          orderBy: { code: 'asc' },
          include: {
            modules: {
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true, orderIndex: true },
            },
            materials: {
              where: { status: 'PUBLISHED' },
              orderBy: { createdAt: 'asc' },
              select: { id: true, title: true, description: true },
            },
          },
        },
      },
      orderBy: { fee: 'asc' },
    });

    const brochureByCode = new Map(BROCHURE_PROGRAMMES.map((b) => [b.code.toUpperCase(), b]));

    const programs =
      dbPrograms.length > 0
        ? dbPrograms.map((prog) => {
            const brochure = brochureByCode.get(prog.code.toUpperCase());
            return {
              ...prog,
              initialDeposit: brochure?.initialDeposit ?? Math.round(prog.fee / 2),
              installmentNote:
                brochure?.installmentNote ??
                `Flexible half installment plan available (GH₵${Math.round(prog.fee / 2).toLocaleString()} initial deposit)`,
              scholarshipNote:
                brochure?.scholarshipNote ??
                'Eligible for up to 50% Successfield Scholarship consideration on application',
              schedules: brochure?.schedules ?? [
                { label: 'Regular (Mon – Thu)', timing: '8:00 AM – 1:00 PM' },
                { label: 'Weekends (Sat & Sun)', timing: '8:00 AM – 2:00 PM' },
              ],
              venue:
                brochure?.venue ??
                'Action Boat Medical Centre / Homeopathy — Tema Medical Camp (Gbetsile Pure Oil)',
              careerOpportunities: brochure?.careerOpportunities ?? [],
              courseOutline: brochure?.courseOutline ?? [],
              tracks: AVAILABLE_STUDY_TRACKS,
            };
          })
        : BROCHURE_PROGRAMMES.map((b, idx) => ({
            id: `brochure-${b.code.toLowerCase()}-${idx}`,
            ...b,
            courses: [],
            tracks: AVAILABLE_STUDY_TRACKS,
          }));

    return NextResponse.json({
      programs,
      studyTracks: AVAILABLE_STUDY_TRACKS,
      additionalProgrammes: ADDITIONAL_BROCHURE_PROGRAMMES,
      graduationRequirements: GRADUATION_REQUIREMENTS,
    });
  } catch (error) {
    console.error('Failed to fetch programmes:', error);
    return NextResponse.json({
      programs: BROCHURE_PROGRAMMES.map((b, idx) => ({
        id: `brochure-${b.code.toLowerCase()}-${idx}`,
        ...b,
        courses: [],
      })),
      additionalProgrammes: ADDITIONAL_BROCHURE_PROGRAMMES,
      graduationRequirements: GRADUATION_REQUIREMENTS,
    });
  }
}
