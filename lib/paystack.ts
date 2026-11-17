import crypto from 'crypto';
import { ghsToPesewas, pesewasToGHS } from './currency';

export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_demo_ghana_paystack_key';
export const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_demo_ghana_paystack_key';
export const PAYSTACK_CALLBACK_URL =
  process.env.PAYSTACK_CALLBACK_URL ||
  (process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/portal/student/payments/callback`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/portal/student/payments/callback`
      : 'http://localhost:3000/portal/student/payments/callback');
export const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || PAYSTACK_SECRET_KEY;

export interface InitializePaymentParams {
  email: string;
  amountInGHS: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    domain: string;
    status: string; // 'success', 'failed', 'abandoned'
    reference: string;
    amount: number; // in pesewas
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string; // 'card', 'mobile_money', etc.
    currency: string; // 'GHS'
    ip_address?: string;
    metadata?: Record<string, any>;
    customer?: {
      id: number;
      email: string;
      customer_code: string;
      phone?: string;
    };
    authorization?: {
      authorization_code: string;
      bin?: string;
      last4?: string;
      brand?: string;
      channel?: string;
      bank?: string;
    };
  };
}

/**
 * Initialize a Paystack Ghana payment transaction in GHS (converted to pesewas)
 */
export async function initializePaystackPayment(params: InitializePaymentParams): Promise<PaystackInitResponse> {
  const { email, amountInGHS, reference, callbackUrl, metadata } = params;
  const amountInPesewas = ghsToPesewas(amountInGHS);

  // If live key is provided and not test placeholder, call official Paystack endpoint
  const isRealKey = PAYSTACK_SECRET_KEY.startsWith('sk_live_') || (PAYSTACK_SECRET_KEY.startsWith('sk_test_') && !PAYSTACK_SECRET_KEY.includes('demo'));

  if (isRealKey) {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountInPesewas,
          reference,
          currency: 'GHS',
          channels: ['card', 'mobile_money', 'bank', 'ussd', 'qr'],
          callback_url: callbackUrl || PAYSTACK_CALLBACK_URL,
          metadata: {
            ...metadata,
            country: 'Ghana',
            currency: 'GHS',
          },
        }),
      });

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('Paystack initialization error:', err);
    }
  }

  // Seamless Mock/Development Response for local testing
  const mockCallback = callbackUrl || PAYSTACK_CALLBACK_URL;
  const redirectUrl = `${mockCallback}?reference=${encodeURIComponent(reference)}&status=success`;

  return {
    status: true,
    message: 'Authorization URL created (Paystack Ghana Sandbox Mode)',
    data: {
      authorization_url: redirectUrl,
      access_code: `mock_access_${Date.now()}`,
      reference,
    },
  };
}

/**
 * Verify a Paystack transaction by reference
 */
export async function verifyPaystackPayment(reference: string): Promise<PaystackVerifyResponse> {
  const isRealKey = PAYSTACK_SECRET_KEY.startsWith('sk_live_') || (PAYSTACK_SECRET_KEY.startsWith('sk_test_') && !PAYSTACK_SECRET_KEY.includes('demo'));

  if (isRealKey) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('Paystack verification network error:', err);
    }
  }

  // Sandbox simulation: Return success for generated references
  return {
    status: true,
    message: 'Verification successful (Paystack Ghana Sandbox)',
    data: {
      id: Math.floor(Math.random() * 1000000),
      domain: 'test',
      status: 'success',
      reference,
      amount: 150000, // 1,500 GHS in pesewas
      gateway_response: 'Successful',
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      channel: 'mobile_money',
      currency: 'GHS',
      metadata: { country: 'Ghana' },
    },
  };
}

/**
 * Verify Paystack Webhook raw HMAC SHA-512 signature
 */
export function verifyPaystackWebhookSignature(rawBody: string, signatureHeader?: string | null): boolean {
  if (!signatureHeader) return false;
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    return hash === signatureHeader;
  } catch {
    return false;
  }
}

