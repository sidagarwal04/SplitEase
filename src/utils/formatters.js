import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { currencySymbol, DEFAULT_CURRENCY } from './currency.js';

// Map currency to the locale we want number-grouping to follow. INR uses the
// Indian numbering system (1,00,000 instead of 100,000).
const LOCALE_BY_CURRENCY = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
  SGD: 'en-SG',
};

export function formatMoney(amount, currency = DEFAULT_CURRENCY, { showSign = false } = {}) {
  const n = Number(amount) || 0;
  const sym = currencySymbol(currency);
  const locale = LOCALE_BY_CURRENCY[currency] ?? 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  const sign = showSign ? (n > 0 ? '+' : n < 0 ? '−' : '') : n < 0 ? '−' : '';
  return `${sign}${sym}${formatted}`;
}

export function formatDate(date) {
  const d = new Date(date);
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, yyyy');
}

export function fromNow(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function categoryEmoji(category = 'general') {
  const map = {
    general: '🧾',
    food: '🍜',
    drinks: '🍷',
    groceries: '🛒',
    transport: '🚕',
    travel: '✈️',
    rent: '🏠',
    utilities: '💡',
    entertainment: '🎬',
    shopping: '🛍️',
    health: '💊',
    gifts: '🎁',
  };
  return map[category] ?? '🧾';
}

export const CATEGORIES = [
  'general',
  'food',
  'drinks',
  'groceries',
  'transport',
  'travel',
  'rent',
  'utilities',
  'entertainment',
  'shopping',
  'health',
  'gifts',
];
