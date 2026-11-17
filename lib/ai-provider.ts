import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/lib/auth';

const ENC_ALGO = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(getJwtSecret()).digest();
}

export function encryptApiKey(plainKey: string): { encryptedApiKey: string; keyLast4: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainKey.trim(), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  const trimmed = plainKey.trim();
  const keyLast4 = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed;
  return { encryptedApiKey: payload, keyLast4 };
}

export function decryptApiKey(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) return payload;
  const [ivHex, tagHex, encHex] = parts;
  const decipher = crypto.createDecipheriv(ENC_ALGO, getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskApiKey(last4: string): string {
  return `••••-••••-${last4 || '****'}`;
}

export interface ResolvedProvider {
  id: string | null;
  displayName: string;
  apiBaseUrl: string;
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
  supportsJsonMode: boolean;
  customHeaders: Record<string, string>;
}

export async function resolveActiveAIProvider(): Promise<ResolvedProvider | null> {
  const dbProvider = await prisma.aIProviderConfig.findFirst({
    where: { isActive: true, isDefault: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (dbProvider) {
    let customHeaders: Record<string, string> = {};
    if (dbProvider.customHeadersJson) {
      try {
        customHeaders = JSON.parse(dbProvider.customHeadersJson);
      } catch {
        customHeaders = {};
      }
    }
    return {
      id: dbProvider.id,
      displayName: dbProvider.displayName,
      apiBaseUrl: dbProvider.apiBaseUrl,
      apiEndpoint: dbProvider.apiEndpoint || '/v1/chat/completions',
      apiKey: decryptApiKey(dbProvider.encryptedApiKey),
      modelName: dbProvider.modelName,
      maxOutputTokens: dbProvider.maxOutputTokens || 4096,
      temperature: dbProvider.temperature ?? 0.2,
      timeoutMs: dbProvider.timeoutMs || 45000,
      supportsJsonMode: dbProvider.supportsJsonMode,
      customHeaders,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      id: null,
      displayName: 'Environment OpenAI-Compatible',
      apiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
      apiEndpoint: process.env.OPENAI_ENDPOINT || '/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxOutputTokens: 4096,
      temperature: 0.2,
      timeoutMs: 45000,
      supportsJsonMode: true,
      customHeaders: {},
    };
  }

  return null;
}

function buildCompletionUrl(baseUrl: string, endpoint: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

function extractJsonPayload<T>(rawText: string): T {
  let cleaned = rawText.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }
  return JSON.parse(cleaned) as T;
}

function classifyProviderError(status: number, bodyText: string): string {
  const lower = bodyText.toLowerCase();
  if (status === 401 || status === 403) return 'Invalid or unauthorized API key.';
  if (status === 402 || lower.includes('insufficient_quota') || lower.includes('credit')) {
    return 'Insufficient provider credits or quota exceeded.';
  }
  if (status === 404) return 'Unsupported model or invalid API endpoint URL (404).';
  if (status === 429) return 'Provider rate limit exceeded (429). Please retry shortly.';
  if (lower.includes('context_length') || lower.includes('maximum context')) {
    return 'Input exceeded model context length limit.';
  }
  return `Provider returned HTTP ${status}: ${bodyText.slice(0, 200)}`;
}

export interface AiCallResult<T> {
  ok: boolean;
  data?: T;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  providerMeta?: { providerId: string | null; providerName: string; apiBaseUrl: string; modelName: string };
  error?: string;
}

export async function callOpenAICompatibleJson<T>(
  systemPrompt: string,
  userPrompt: string,
  providerOverride?: ResolvedProvider | null,
  retriesLeft = 1
): Promise<AiCallResult<T>> {
  const provider = providerOverride ?? (await resolveActiveAIProvider());
  if (!provider) {
    return {
      ok: false,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      error: 'No active AI provider configured.',
    };
  }

  const providerMeta = {
    providerId: provider.id,
    providerName: provider.displayName,
    apiBaseUrl: provider.apiBaseUrl,
    modelName: provider.modelName,
  };

  let url = '';
  try {
    url = buildCompletionUrl(provider.apiBaseUrl, provider.apiEndpoint);
    new URL(url);
  } catch {
    return {
      ok: false,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      providerMeta,
      error: `Invalid API URL: ${provider.apiBaseUrl}${provider.apiEndpoint}`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), provider.timeoutMs || 45000);

  try {
    const payload: Record<string, any> = {
      model: provider.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: provider.temperature ?? 0.2,
      max_tokens: provider.maxOutputTokens || 4096,
    };

    if (provider.supportsJsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
        ...(provider.customHeaders || {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawBody = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        providerMeta,
        error: classifyProviderError(res.status, rawBody),
      };
    }

    const parsedRes = JSON.parse(rawBody);
    const content = parsedRes?.choices?.[0]?.message?.content;
    const usage = {
      inputTokens: Number(parsedRes?.usage?.prompt_tokens || 0),
      outputTokens: Number(parsedRes?.usage?.completion_tokens || 0),
      totalTokens: Number(parsedRes?.usage?.total_tokens || 0),
    };

    if (!content || typeof content !== 'string' || !content.trim()) {
      return {
        ok: false,
        usage,
        providerMeta,
        error: 'Provider returned an empty response.',
      };
    }

    try {
      const jsonData = extractJsonPayload<T>(content);
      return { ok: true, data: jsonData, usage, providerMeta };
    } catch {
      if (retriesLeft > 0) {
        return callOpenAICompatibleJson<T>(
          systemPrompt,
          `${userPrompt}\n\nIMPORTANT: Your previous output was not valid JSON. Return ONLY valid JSON with no markdown or extra commentary.`,
          provider,
          retriesLeft - 1
        );
      }
      return {
        ok: false,
        usage,
        providerMeta,
        error: 'AI response could not be parsed as valid JSON.',
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      ok: false,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      providerMeta,
      error: isTimeout
        ? `Provider request timed out after ${provider.timeoutMs}ms.`
        : `Provider connection error: ${err?.message || 'Unknown error'}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function testAIProviderConnection(provider: ResolvedProvider): Promise<{
  ok: boolean;
  message: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}> {
  const result = await callOpenAICompatibleJson<{ status: string }>(
    'You are a connectivity test responder. Reply with JSON: {"status":"ok"}.',
    'Respond with {"status":"ok"}',
    provider,
    0
  );
  if (result.ok) {
    return {
      ok: true,
      message: `Connected successfully to ${provider.displayName} (${provider.modelName}).`,
      usage: result.usage,
    };
  }
  return {
    ok: false,
    message: result.error || 'Connection test failed.',
  };
}

export async function callStructuredAiJson<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T | null> {
  const res = await callOpenAICompatibleJson<T>(systemPrompt, userPrompt);
  return res.ok && res.data ? res.data : null;
}
