// Polish street and number validation & formatting
// Accepts strings like: "Dąbrowskiego 12", "Grunwaldzka 12A/3", "al. Jana Pawła II 15"

export function formatStreetNumber(input: string): string {
  const s = (input || "").replace(/\s+/g, " ").trim();
  return s;
}

export function isValidStreetNumber(input: string): boolean {
  const s = formatStreetNumber(input);
  if (!s) return false;
  if (s.length < 3) return false;
  // Must contain at least one letter and at least one digit
  if (!/\p{L}/u.test(s)) return false;
  const firstDigitIdx = s.search(/[0-9]/);
  if (firstDigitIdx === -1) return false;
  // Ensure some letter content before the number (street name before number)
  if (!/\p{L}/u.test(s.slice(0, firstDigitIdx))) return false;
  // Allow characters: letters, digits, spaces, '.', '-', '/', apostrophes
  if (!/^[- .'/\p{L}0-9]+$/u.test(s)) return false;
  return true;
}