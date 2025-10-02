// Utilities for invoice numbering with monthly reset using localStorage
export type NumberingSettings = {
  prefix: string; // e.g., 'FV'
};

const LS_KEY_PREFIX = 'invoiceSeq'; // stored as `${LS_KEY_PREFIX}:${YYYY}-${MM}` -> number

function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getNextSequence(date: Date): number {
  if (typeof window === 'undefined') return 1; // SSR safeguard
  const key = `${LS_KEY_PREFIX}:${monthKey(date)}`;
  const current = Number(localStorage.getItem(key) || '0');
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return next;
}

function padSeq(n: number) {
  return String(n).padStart(3, '0');
}

export function nextInvoiceNumber(settings: NumberingSettings = { prefix: 'FV' }, date: Date = new Date()) {
  const seq = getNextSequence(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${settings.prefix}/${year}/${month}/${padSeq(seq)}`;
}