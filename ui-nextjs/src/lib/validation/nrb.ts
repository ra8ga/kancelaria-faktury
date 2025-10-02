// Polish IBAN/NRB validation and formatting
// IBAN (Poland) format: PL + 26 digits (total length 28)
// NRB: 26 digits; we accept raw digits and validate as IBAN by prefixing PL

function toIbanNumericString(iban: string): string {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let out = '';
  for (const ch of rearranged) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
    } else {
      const code = ch.toUpperCase().charCodeAt(0) - 55; // A=10, B=11, ... Z=35
      out += String(code);
    }
  }
  return out;
}

function mod97(str: string): number {
  let remainder = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    // remainder = (remainder * 10 + digit) % 97
    remainder = (remainder * 10 + (ch.charCodeAt(0) - 48)) % 97;
  }
  return remainder;
}

export function normalizeIbanPL(input: string): string {
  const raw = (input || '').replace(/\s+/g, '').toUpperCase();
  if (raw.startsWith('PL')) return raw;
  if (/^\d{26}$/.test(raw)) return 'PL' + raw;
  return raw;
}

export function isValidIbanPL(input: string): boolean {
  const iban = normalizeIbanPL(input);
  if (!/^PL\d{26}$/.test(iban)) return false;
  const numeric = toIbanNumericString(iban);
  return mod97(numeric) === 1;
}

export function formatIbanPL(input: string): string {
  const iban = normalizeIbanPL(input);
  if (!iban) return '';
  const grouped = iban.replace(/(.{4})/g, '$1 ').trim();
  return grouped;
}

export function formatNipDisplay(input: string): string {
  const digits = (input || '').replace(/\D+/g, '');
  // Format: XXX-XXX-XX-XX (common display)
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean);
  return parts.join('-');
}