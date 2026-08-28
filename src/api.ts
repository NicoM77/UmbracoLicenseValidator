/**
 * Client for Umbraco's public license-validation service — the same service an
 * Umbraco installation calls on startup and periodically thereafter.
 *
 * It allows any origin (`Access-Control-Allow-Origin: *`), so the browser talks
 * to it directly: the license key travels from this page to Umbraco and nowhere
 * else.
 */
const ENDPOINT = 'https://license-validation.umbraco.com/api/ValidateLicense';

export interface ValidationRequest {
  productId: string;
  licenseKey: string;
  domain: string;
}

/**
 * The service's payload. Umbraco publishes no schema for it; this mirrors the
 * models in `Umbraco.Licenses` and what live responses actually contain.
 *
 * `result` is deliberately a plain string. Umbraco's service has returned values
 * that its own client did not know about, so a closed union would turn a new
 * status into a crash instead of a message.
 *
 * Everything optional is genuinely absent rather than null when it does not
 * apply, so read it defensively.
 */
export interface ValidationResponse {
  /** The verdict, e.g. `Valid` or `InvalidUnrecognizedLicenseKey`. */
  result: string;
  validatedOn: string;
  /** Domains the key covers. Empty unless the key was accepted. */
  domains?: string[];
  features?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  /** Prose explanation, present when the key was rejected. Quotes the key back. */
  failureReason?: string;
  expiresOn?: string;
  tier?: string;
  signature?: { version: number; signedHash: string };
}

/**
 * Validates a key against the licensing service.
 *
 * The service answers HTTP 200 for rejected keys too — the verdict lives in the
 * `result` field, never in the status code. Only transport failures and
 * malformed responses reject.
 */
export async function validateLicense(
  { productId, licenseKey, domain }: ValidationRequest,
  signal?: AbortSignal,
): Promise<ValidationResponse> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ProductId: productId, LicenseKey: licenseKey, Domain: domain }),
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`The licensing service answered ${response.status} ${response.statusText}.`);
  }

  const payload = (await response.json()) as ValidationResponse | null;
  if (!payload || typeof payload.result !== 'string') {
    throw new Error('The licensing service returned an unexpected response.');
  }
  return payload;
}
