export function normalizeNationalPhoneInput(value: string, callingCode: string, length: number): string {
  const digits = value.replace(/\D/g, "");
  const countryPrefix = callingCode.replace(/\D/g, "");
  const nationalDigits = digits.length === length + countryPrefix.length && digits.startsWith(countryPrefix)
    ? digits.slice(countryPrefix.length)
    : digits;
  return nationalDigits.slice(0, length);
}
