import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';

export async function GET() {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const [totalPdfsProcessed, jobs] = await Promise.all([
      prisma.learningMaterial.count({
        where: {
          fileType: 'PDF',
          processedAt: { not: null },
        },
      }),
      prisma.pDFProcessingJob.findMany({
        include: {
          material: {
            select: {
              id: true,
              title: true,
              pdfVersion: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let successfulJobs = 0;
    let failedJobs = 0;
    let regenerationJobs = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;
    let totalEstimatedCostUsd = 0;

    const breakdownMap = new Map<
      string,
      {
        providerName: string;
        modelName: string;
        jobs: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        estimatedCostUsd: number;
      }
    >();

    for (const job of jobs) {
      if (job.status === 'COMPLETED' || job.status === 'REVIEW_REQUIRED') {
        successfulJobs += 1;
      } else if (job.status === 'FAILED') {
        failedJobs += 1;
      }
      if (job.isRegeneration) {
        regenerationJobs += 1;
      }

      const inTok = job.inputTokens || 0;
      const outTok = job.outputTokens || 0;
      const totTok = job.totalTokens || inTok + outTok;
      const cost = job.estimatedCostUsd || 0;

      totalInputTokens += inTok;
      totalOutputTokens += outTok;
      totalTokens += totTok;
      totalEstimatedCostUsd += cost;

      const providerName = job.providerName || 'Deterministic Local';
      const modelName = job.modelName || 'local-parser';
      const key = `${providerName}::${modelName}`;
      const existing = breakdownMap.get(key) || {
        providerName,
        modelName,
        jobs: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      };
      existing.jobs += 1;
      existing.inputTokens += inTok;
      existing.outputTokens += outTok;
      existing.totalTokens += totTok;
      existing.estimatedCostUsd += cost;
      breakdownMap.set(key, existing);
    }

    return NextResponse.json({
      summary: {
        totalPdfsProcessed,
        totalJobs: jobs.length,
        successfulJobs,
        failedJobs,
        regenerationJobs,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(6)),
      },
      byProviderModel: Array.from(breakdownMap.values()),
      recentJobs: jobs.slice(0, 15).map((j) => ({
        id: j.id,
        materialId: j.materialId,
        materialTitle: j.material?.title || 'Unknown Material',
        pdfVersion: j.pdfVersion,
        status: j.status,
        stage: j.currentStage,
        isRegeneration: j.isRegeneration,
        regenerationScope: j.regenerationScope,
        providerName: j.providerName || 'Deterministic Local',
        modelName: j.modelName || 'local-parser',
        inputTokens: j.inputTokens,
        outputTokens: j.outputTokens,
        totalTokens: j.totalTokens,
        estimatedCostUsd: j.estimatedCostUsd,
        errorMessage: j.errorMessage,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
      })),
    });
  } catch (error) {
    console.error('GET ai-usage error:', error);
    return NextResponse.json({ error: 'Failed to load AI usage metrics' }, { status: 500 });
  }
}
