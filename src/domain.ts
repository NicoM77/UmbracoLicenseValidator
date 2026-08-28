/**
 * The licensing service compares against a bare hostname. Anything else — a
 * scheme, a port, a path, a trailing dot — makes an otherwise licensed domain
 * look unlicensed, so normalise before sending and show the user what was sent.
 */
export function toHostname(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/\.$/, '').toLowerCase();
  } catch {
    // Not a parseable URL — strip the obvious decorations by hand.
    return trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split('/')[0]!.split(':')[0]!.replace(/\.$/, '').toLowerCase();
  }
}
