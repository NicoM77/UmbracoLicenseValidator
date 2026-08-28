export interface Product {
  /** The `ProductId` the licensing service expects. */
  readonly id: string;
  readonly name: string;
  /** Distinguishes editions that share a name, e.g. Deploy on-premise. */
  readonly edition?: string;
}

/**
 * The products the Umbraco license-validation endpoint accepts.
 *
 * Umbraco does not publish this list. It was established by probing the
 * endpoint: an unknown product answers `InvalidUnrecognizedProductId`, a known
 * one answers `InvalidUnrecognizedLicenseKey`. Every id below returned the
 * latter; some fifty other plausible ids returned the former.
 *
 * The endpoint matches ids case-insensitively, but the `Umbraco.` prefix is
 * required — a bare `Forms` is not recognised.
 */
export const PRODUCTS: readonly Product[] = [
  { id: 'Umbraco.Forms', name: 'Umbraco Forms' },
  { id: 'Umbraco.Commerce', name: 'Umbraco Commerce' },
  { id: 'Umbraco.Deploy', name: 'Umbraco Deploy' },
  { id: 'Umbraco.Deploy.OnPrem', name: 'Umbraco Deploy', edition: 'on-premise' },
  { id: 'Umbraco.Engage', name: 'Umbraco Engage' },
  { id: 'Umbraco.UIBuilder', name: 'Umbraco UI Builder' },
  { id: 'Umbraco.Workflow', name: 'Umbraco Workflow' },
];

/** Label for the picker, e.g. "Umbraco Deploy (on-premise)". */
export const productLabel = (product: Product): string =>
  product.edition ? `${product.name} (${product.edition})` : product.name;
