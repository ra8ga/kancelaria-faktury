// Utilities for invoice numbering with monthly reset using localStorage
export type NumberingSettings = {
  prefix: string; // e.g., 'FV'
};

const LS_KEY_PREFIX = "invoiceSeq"; // stored as `${LS_KEY_PREFIX}:${YYYY}-${MM}` -> number

function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getNextSequence(date: Date): number {
  // Tymczasowa sekwencja po stronie klienta bez localStorage — backend powinien nadać finalny numer
  const ms = date.getTime();
  const next = (ms % 1000) + 1; // 001..1000 pseudo-unikalne w czasie
  return next;
}

function padSeq(n: number) {
  return String(n).padStart(3, "0");
}

export function nextInvoiceNumber(
  settings: NumberingSettings = { prefix: "FV" },
  date: Date = new Date()
) {
  const seq = getNextSequence(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${settings.prefix}/${year}/${month}/${padSeq(seq)}`;
}