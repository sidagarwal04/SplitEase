import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { currencySymbol } from './currency.js';

export function formatMoney(amount, currency = 'USD', { showSign = false } = {}) {
  const n = Number(amount) || 0;
  const sym = currencySymbol(currency);
  const formatted = new Intl.NumberFormat('en-US', {
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
