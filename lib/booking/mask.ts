/** "ada.obi@example.com" becomes "a******@e*****.com". Shown until the guest has verified. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  const star = (s: string) =>
    s.length <= 1 ? s : s[0] + '*'.repeat(Math.min(s.length - 1, 6));
  return `${star(local)}@${star(host)}${tld}`;
}

/** "+2348012345678" becomes "+234 ••• ••• 5678". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const country = phone.startsWith('+')
    ? `+${digits.slice(0, Math.max(1, digits.length - 10))}`
    : '';
  return `${country} ••• ••• ${digits.slice(-4)}`.trim();
}
