export function buildDialableUssdCode(template: string, amount: string, recipient?: string | null): string | null {
  let code = template;
  if (/MONTANT|AMOUNT/i.test(code)) {
    if (!amount || !/^\d+$/.test(amount)) return null;
    code = code.replace(/MONTANT|AMOUNT/gi, amount);
  }
  if (/NUM[EÉ]RO/i.test(code)) {
    if (!recipient) return null;
    code = code.replace(/NUM[EÉ]RO(?:\s+DESTINATAIRE)?/gi, recipient.replace(/\D/g, ''));
  }
  code = code.replace(/\*?\s*(?:CODE\s+SECRET|PIN)\s*#?/gi, '*').replace(/\s+/g, '');
  return /^[*#][*#\d]*$/.test(code) ? code : null;
}
