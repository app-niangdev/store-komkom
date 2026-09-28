const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** 240000 -> « 240 000 F CFA » (XOF). */
export function formatMoney(value: number, currency = 'XOF'): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(value).replace(/ /g, ' ');
}

/** 221771111111 -> +221 77 111 11 11 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const sn = /^(?:221)?(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(digits);
  if (sn) {
    return `${digits.startsWith('221') ? '+221 ' : ''}${sn.slice(1).join(' ')}`;
  }
  return value;
}

/** Initiales pour les visuels sans image. */
export function initials(name: string): string {
  const words = name.split(/[\s\-_/]+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  // Les petits mots (« à », « de », « la ») ne font pas de bonnes initiales
  const meaningful = words.filter((w) => w.length > 2);
  return (meaningful.length ? meaningful : words)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
