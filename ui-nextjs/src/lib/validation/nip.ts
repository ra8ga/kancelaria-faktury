// Walidacja NIP (10 cyfr, checksum)
export function isValidNIP(input: string): boolean {
  const digits = (input || "").replace(/[^0-9]/g, "");
  if (digits.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const check = sum % 11;
  return check !== 10 && check === Number(digits[9]);
}

// Formatowanie/maskowanie NIP: 123-456-32-18
export function formatNip(input: string): string {
  const digits = (input || "").replace(/[^0-9]/g, "").slice(0, 10);
  const parts: string[] = [];
  if (digits.length >= 3) parts.push(digits.slice(0, 3));
  if (digits.length >= 6) parts.push(digits.slice(3, 6));
  if (digits.length >= 8) parts.push(digits.slice(6, 8));
  if (digits.length >= 10) parts.push(digits.slice(8, 10));
  // If fewer digits, fill last part progressively
  if (digits.length > 6 && digits.length < 8) {
    parts[2] = digits.slice(6);
  } else if (digits.length > 3 && digits.length < 6) {
    parts[1] = digits.slice(3);
  } else if (digits.length < 3 && digits.length > 0) {
    parts[0] = digits.slice(0);
  }
  return parts.join('-');
}