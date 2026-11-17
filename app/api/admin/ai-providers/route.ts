import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole } from '@/lib/portal-auth';
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  testAIProviderConnection,
  ResolvedProvider,
} from '@/lib/ai-provider';

const ADMIN_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN'];

function parseCustomHeaders(raw: string | null | undefined): Record<string, string> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
  } catch {
    // ignore invalid JSON
  }
  return {};
}

function sanitizeProvider(p: {
  id: string;
  displayName: string;
  apiBaseUrl: string;
  apiEndpoint: string;
  keyLast4: string;
  modelName: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
  supportsJsonMode: boolean;
  customHeadersJson: string | null;
  isActive: boolean;
  isDefault: boolean;
  lastTestedAt: Date | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.displayName,
    displayName: p.displayName,
    apiBaseUrl: p.apiBaseUrl,
    apiEndpoint: p.apiEndpoint,
    hasApiKey: Boolean(p.keyLast4),
    keyMasked: maskApiKey(p.keyLast4),
    modelName: p.modelName,
    maxOutputTokens: p.maxOutputTokens,
    temperature: p.temperature,
    timeoutMs: p.timeoutMs,
    supportsJsonMode: p.supportsJsonMode,
    customHeadersJson: p.customHeadersJson,
    isActive: p.isActive,
    isDefault: p.isDefault,
    lastTestedAt: p.lastTestedAt,
    lastTestStatus: p.lastTestStatus,
    lastTestMessage: p.lastTestMessage,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function GET() {
  try {
    const auth = await authorizeRole(ADMIN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const providers = await prisma.aIProviderConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      providers: providers.map(sanitizeProvider),
      hasEnvFallback: Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY),
      envFallbackBaseUrl: process.env.AI_API_BASE_URL || 'https://api.openai.com',
      envFallbackModel: process.env.AI_MODEL_NAME || 'gpt-4o-mini',
    });
  } catch (error) {
    console.error('GET ai-providers error:', error);
    return NextResponse.json({ error: 'Failed to load AI providers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRole(ADMIN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();

    if (body.action === 'test') {
      let id: string | null = body.id || null;
      let displayName = String(body.displayName || body.name || 'Test Provider').trim();
      let apiBaseUrl = String(body.apiBaseUrl || '').trim().replace(/\/+$/, '');
      let apiEndpoint = String(body.apiEndpoint || '/v1/chat/completions').trim();
      let modelName = String(body.modelName || '').trim();
      let apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
      let maxOutputTokens = Number(body.maxOutputTokens) || 256;
      let temperature = body.temperature !== undefined ? Number(body.temperature) : 0.2;
      let timeoutMs = Number(body.timeoutMs) || 30000;
      let supportsJsonMode = body.supportsJsonMode !== false;
      let customHeadersRaw =
        typeof body.customHeadersJson === 'string' ? body.customHeadersJson : null;

      if (id) {
        const existing = await prisma.aIProviderConfig.findUnique({ where: { id } });
        if (!existing) {
          return NextResponse.json({ error: 'AI provider not found' }, { status: 404 });
        }
        displayName = existing.displayName;
        apiBaseUrl = apiBaseUrl || existing.apiBaseUrl;
        apiEndpoint = apiEndpoint || existing.apiEndpoint;
        modelName = modelName || existing.modelName;
        maxOutputTokens = existing.maxOutputTokens;
        temperature = existing.temperature;
        supportsJsonMode =
          body.supportsJsonMode !== undefined
            ? Boolean(body.supportsJsonMode)
            : existing.supportsJsonMode;
        customHeadersRaw =
          body.customHeadersJson !== undefined
            ? body.customHeadersJson
            : existing.customHeadersJson;
        timeoutMs = Number(body.timeoutMs) || existing.timeoutMs;
        if (!apiKey && existing.encryptedApiKey) {
          apiKey = decryptApiKey(existing.encryptedApiKey);
        }
      }

      if (!apiBaseUrl || !modelName) {
        return NextResponse.json(
          { error: 'API Base URL and Model Name are required to test connection.' },
          { status: 400 }
        );
      }

      const resolved: ResolvedProvider = {
        id,
        displayName,
        apiBaseUrl,
        apiEndpoint: apiEndpoint.startsWith('/') ? apiEndpoint : `/${apiEndpoint}`,
        apiKey,
        modelName,
        maxOutputTokens,
        temperature,
        timeoutMs,
        supportsJsonMode,
        customHeaders: parseCustomHeaders(customHeadersRaw),
      };

      const testResult = await testAIProviderConnection(resolved);

      if (id) {
        await prisma.aIProviderConfig.update({
          where: { id },
          data: {
            lastTestedAt: new Date(),
            lastTestStatus: testResult.ok ? 'SUCCESS' : 'FAILED',
            lastTestMessage: testResult.message.slice(0, 500),
          },
        });
      }

      return NextResponse.json(testResult, { status: testResult.ok ? 200 : 400 });
    }

    const displayName = String(body.displayName || body.name || '').trim();
    const apiBaseUrl = String(body.apiBaseUrl || '').trim().replace(/\/+$/, '');
    const apiEndpoint = String(body.apiEndpoint || '/v1/chat/completions').trim();
    const modelName = String(body.modelName || '').trim();
    const plainApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!displayName || !apiBaseUrl || !modelName) {
      return NextResponse.json(
        { error: 'Provider name, API Base URL, and Model Name are required.' },
        { status: 400 }
      );
    }

    const { encryptedApiKey, keyLast4 } = encryptApiKey(plainApiKey || 'local-no-key');
    const isDefault = Boolean(body.isDefault);
    const isActive = body.isActive !== false;

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.aIProviderConfig.updateMany({
          data: { isDefault: false },
        });
      }
      return tx.aIProviderConfig.create({
        data: {
          displayName,
          apiBaseUrl,
          apiEndpoint: apiEndpoint.startsWith('/') ? apiEndpoint : `/${apiEndpoint}`,
          encryptedApiKey,
          keyLast4: plainApiKey ? keyLast4 : 'none',
          modelName,
          maxOutputTokens: Number(body.maxOutputTokens) || 4000,
          temperature: body.temperature !== undefined ? Number(body.temperature) : 0.2,
          timeoutMs: Number(body.timeoutMs) || 45000,
          supportsJsonMode: body.supportsJsonMode !== false,
          customHeadersJson: body.customHeadersJson ? String(body.customHeadersJson) : null,
          isActive,
          isDefault,
        },
      });
    });

    return NextResponse.json({ provider: sanitizeProvider(created) }, { status: 201 });
  } catch (error) {
    console.error('POST ai-providers error:', error);
    return NextResponse.json({ error: 'Failed to save AI provider' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRole(ADMIN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'Provider id is required' }, { status: 400 });
    }

    const existing = await prisma.aIProviderConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'AI provider not found' }, { status: 404 });
    }

    const plainApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    let keyPatch: { encryptedApiKey: string; keyLast4: string } | Record<string, never> = {};
    if (plainApiKey && !plainApiKey.includes('****')) {
      keyPatch = encryptApiKey(plainApiKey);
    }

    const isDefault = body.isDefault !== undefined ? Boolean(body.isDefault) : undefined;
    const nextDisplayName = body.displayName ?? body.name;

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.aIProviderConfig.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.aIProviderConfig.update({
        where: { id },
        data: {
          ...(nextDisplayName !== undefined ? { displayName: String(nextDisplayName).trim() } : {}),
          ...(body.apiBaseUrl !== undefined
            ? { apiBaseUrl: String(body.apiBaseUrl).trim().replace(/\/+$/, '') }
            : {}),
          ...(body.apiEndpoint !== undefined
            ? {
                apiEndpoint: String(body.apiEndpoint).trim().startsWith('/')
                  ? String(body.apiEndpoint).trim()
                  : `/${String(body.apiEndpoint).trim()}`,
              }
            : {}),
          ...(body.modelName !== undefined ? { modelName: String(body.modelName).trim() } : {}),
          ...(body.maxOutputTokens !== undefined
            ? { maxOutputTokens: Number(body.maxOutputTokens) || 4000 }
            : {}),
          ...(body.temperature !== undefined ? { temperature: Number(body.temperature) } : {}),
          ...(body.timeoutMs !== undefined ? { timeoutMs: Number(body.timeoutMs) || 45000 } : {}),
          ...(body.supportsJsonMode !== undefined
            ? { supportsJsonMode: Boolean(body.supportsJsonMode) }
            : {}),
          ...(body.customHeadersJson !== undefined
            ? { customHeadersJson: body.customHeadersJson ? String(body.customHeadersJson) : null }
            : {}),
          ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
          ...(isDefault !== undefined ? { isDefault } : {}),
          ...keyPatch,
        },
      });
    });

    return NextResponse.json({ provider: sanitizeProvider(updated) });
  } catch (error) {
    console.error('PATCH ai-providers error:', error);
    return NextResponse.json({ error: 'Failed to update AI provider' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRole(ADMIN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // ignore empty body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Provider id is required' }, { status: 400 });
    }

    await prisma.aIProviderConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE ai-providers error:', error);
    return NextResponse.json({ error: 'Failed to delete AI provider' }, { status: 500 });
  }
}
