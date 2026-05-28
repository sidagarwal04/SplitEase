export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

export function currencySymbol(code = 'USD') {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export async function convert(amount, from, to) {
  if (from === to) return amount;
  const res = await fetch(`/api/convert?from=${from}&to=${to}&amount=${amount}`);
  if (!res.ok) throw new Error('Conversion failed');
  const json = await res.json();
  return json.result;
}
