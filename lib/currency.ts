/**
 * Ghana Regional & Currency Utilities
 * Conforms to Ghana Cedi (GHS / GH₵), locale en-GH, timezone Africa/Accra.
 */

export const CURRENCY_CODE = 'GHS';
export const CURRENCY_SYMBOL = 'GH₵';
export const DEFAULT_LOCALE = 'en-GH';
export const DEFAULT_TIMEZONE = 'Africa/Accra';

/**
 * Format a numeric amount into Ghana Cedis: GH₵1,500.00
 */
export function formatGHS(amount: number | string | null | undefined): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(numeric)) return 'GH₵0.00';

  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(numeric)
    .replace('GHS', 'GH₵')
    .trim();
}

/**
 * Format compact Ghana Cedis: GH₵1.5K, GH₵50K
 */
export function formatGHSCompact(amount: number | string | null | undefined): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(numeric)) return 'GH₵0';

  if (Math.abs(numeric) >= 1_000_000) {
    return `GH₵${(numeric / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(numeric) >= 1_000) {
    return `GH₵${(numeric / 1_000).toFixed(1)}K`;
  }
  return formatGHS(numeric);
}

/**
 * Convert Ghana Cedis to Pesewas (Paystack accepts amounts in pesewas for GHS)
 * e.g., GH₵50.00 -> 5000 pesewas
 */
export function ghsToPesewas(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert Pesewas to Ghana Cedis
 * e.g., 5000 pesewas -> GH₵50.00
 */
export function pesewasToGHS(pesewas: number): number {
  return pesewas / 100;
}

/**
 * Validate and format Ghanaian Phone Numbers
 * Accepts local: 0244123456 or international: +233244123456
 */
export function formatGhanaPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('0')) {
    return `+233 ${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (cleaned.startsWith('+233')) {
    const rest = cleaned.slice(4);
    return `+233 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
  }
  return phone;
}

