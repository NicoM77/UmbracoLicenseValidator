import type { ValidationResponse } from './api.js';

export type Tone = 'positive' | 'danger' | 'warning' | 'default';

export interface Verdict {
  /** True only for an outright `Valid`. Anything else is not a licensed state. */
  readonly licensed: boolean;
  readonly tone: Tone;
  /** An icon from `uui-icon-registry-essential`. */
  readonly icon: string;
  readonly headline: string;
  readonly detail: string;
}

/** What the user asked about — used to phrase the explanation. */
export interface Context {
  readonly productName: string;
  readonly productId: string;
  readonly hostname: string;
}

type Outcome = Omit<Verdict, 'detail'> & { detail: (context: Context) => string };

/**
 * The service evaluates the product first, then the key, and only then the
 * domain and expiry. So a rejected key says nothing about the domain — the
 * wording below never blames a field the service had not yet looked at.
 */
const OUTCOMES: Readonly<Record<string, Outcome>> = {
  Valid: {
    licensed: true,
    tone: 'positive',
    icon: 'check',
    headline: 'License is valid',
    detail: ({ productName, hostname }) =>
      `This key licenses ${productName}${hostname ? ` for ${hostname}` : ''}.`,
  },
  InvalidExpired: {
    licensed: false,
    tone: 'danger',
    icon: 'alert',
    headline: 'License has expired',
    detail: () => 'The key was issued but its term has run out. Renew the subscription with Umbraco, then check again.',
  },
  InvalidNotMatchingDomain: {
    licensed: false,
    tone: 'danger',
    icon: 'forbidden',
    headline: 'Domain is not covered',
    detail: ({ productName, hostname }) =>
      `The key is a genuine ${productName} license, but ${hostname || 'the domain given'} is not among the domains it covers.`,
  },
  InvalidUnrecognizedLicenseKey: {
    licensed: false,
    tone: 'danger',
    icon: 'wrong',
    headline: 'Key not recognised',
    detail: ({ productName }) =>
      `Umbraco has no ${productName} license under this key. Check for a truncated paste or stray whitespace, and make sure the key was issued for this product — the domain was not examined.`,
  },
  InvalidBlocked: {
    licensed: false,
    tone: 'danger',
    icon: 'lock',
    headline: 'License is blocked',
    detail: () => 'The key exists but has been blocked, which usually points at a billing problem. Contact Umbraco.',
  },
  InvalidUnrecognizedProductId: {
    licensed: false,
    tone: 'warning',
    icon: 'alert',
    headline: 'Unknown product',
    detail: ({ productId }) =>
      `Umbraco does not know a product called ${productId}. If you see this, the product list in this tool has gone stale.`,
  },
  UnexpectedError: {
    licensed: false,
    tone: 'warning',
    icon: 'alert',
    headline: 'Umbraco reported an error',
    detail: () => 'Something went wrong on the licensing service, not with the key. Try again in a moment.',
  },
};

/**
 * Turns a response into something to show.
 *
 * `result` is treated as an open string on purpose: Umbraco has shipped values
 * its own client did not know about, so an unrecognised one is reported as
 * unrecognised rather than quietly mapped onto a familiar case.
 */
export function interpret(response: ValidationResponse, context: Context): Verdict {
  const outcome = OUTCOMES[response.result];
  if (outcome) {
    return { ...outcome, detail: outcome.detail(context) };
  }
  return {
    licensed: false,
    tone: 'danger',
    icon: 'alert',
    headline: `Unrecognised result: ${response.result}`,
    detail: 'The licensing service answered with a status this tool does not know. Treat the license as unverified and read the raw response below.',
  };
}
