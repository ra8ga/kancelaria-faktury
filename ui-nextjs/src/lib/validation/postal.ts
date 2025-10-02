// Kod pocztowy Polska: NN-NNN
export function formatPostalPL(input: string): string {
  const digits = (input || '').replace(/\D+/g, '').slice(0, 5);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '-' + digits.slice(2);
}

export function isValidPostalPL(input: string): boolean {
  return /^\d{2}-\d{3}$/.test(input || '');
}