import { validateLicense, type ValidationResponse } from './api.js';
import { toHostname } from './domain.js';
import { PRODUCTS, productLabel, type Product } from './products.js';
import { interpret, type Verdict } from './verdict.js';

const REQUEST_TIMEOUT_MS = 15_000;

/** Cloud keys are validated by environment identity, not by key and domain. */
const CLOUD_KEY = 'UMBRACO-CLOUD';

function required<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

const ui = {
  tree: required('product-tree'),
  title: required('workspace-title'),
  form: required<HTMLFormElement>('validator'),
  key: required<HTMLElement & { value: string }>('license-key'),
  domain: required<HTMLElement & { value: string }>('domain'),
  submit: required('submit'),
  clear: required('clear'),
  result: required('result'),
  resultTag: required('result-tag'),
  resultIcon: required('result-icon'),
  resultHeadline: required('result-headline'),
  resultDetail: required('result-detail'),
  resultFacts: required('result-facts'),
  resultTables: required('result-tables'),
  resultRaw: required('result-raw'),
  toasts: required('toasts'),
};

let selected: Product = PRODUCTS[0]!;
let inFlight: AbortController | undefined;

// ── product tree ────────────────────────────────────────────────────────────

function buildTree(): void {
  for (const product of PRODUCTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset['productId'] = product.id;
    button.addEventListener('click', () => select(product));

    const icon = document.createElement('uui-icon');
    icon.setAttribute('name', 'document');
    icon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.append(product.name);
    if (product.edition) {
      const edition = document.createElement('span');
      edition.className = 'edition';
      edition.append(` (${product.edition})`);
      label.append(edition);
    }

    button.append(icon, label);
    ui.tree.append(button);
  }
}

function select(product: Product): void {
  selected = product;
  ui.title.textContent = productLabel(product);
  for (const button of ui.tree.querySelectorAll('button')) {
    button.setAttribute('aria-current', String(button.dataset['productId'] === product.id));
  }
  hideResult();
}

// ── field errors ────────────────────────────────────────────────────────────

function setFieldError(field: HTMLElement, message: string | null): void {
  const editor = field.parentElement;
  if (!editor) return;

  editor.querySelector('.field-error')?.remove();
  field.toggleAttribute('error', message !== null);
  if (!message) return;

  const note = document.createElement('p');
  note.className = 'field-error';
  note.textContent = message;
  editor.append(note);
}

function clearFieldErrors(): void {
  setFieldError(ui.key, null);
  setFieldError(ui.domain, null);
}

// ── result rendering ────────────────────────────────────────────────────────

function hideResult(): void {
  ui.result.toggleAttribute('hidden', true);
}

function addFact(list: HTMLElement, term: string, value: string): void {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  list.append(dt, dd);
}

// Individual components rather than dateStyle/timeStyle: the two cannot be
// combined with timeZoneName, and the zone is worth showing on a timestamp
// that came from a server.
const MOMENT_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

function formatMoment(iso: string): string {
  const moment = new Date(iso);
  return Number.isNaN(moment.getTime()) ? iso : MOMENT_FORMAT.format(moment);
}

/** Renders a one- or two-column table, or nothing at all when there is no data. */
function addTable(heading: string, rows: readonly (readonly [string, string?])[]): void {
  if (rows.length === 0) return;

  const section = document.createElement('section');
  const title = document.createElement('h4');
  title.textContent = heading;

  const table = document.createElement('uui-table');
  table.setAttribute('aria-label', heading);
  for (const [name, value] of rows) {
    const row = document.createElement('uui-table-row');
    const first = document.createElement('uui-table-cell');
    first.textContent = name;
    row.append(first);
    if (value !== undefined) {
      const second = document.createElement('uui-table-cell');
      second.textContent = value;
      row.append(second);
    }
    table.append(row);
  }

  section.append(title, table);
  ui.resultTables.append(section);
}

function show(response: ValidationResponse, hostname: string): void {
  const verdict = interpret(response, {
    productName: selected.name,
    productId: selected.id,
    hostname,
  });

  paintVerdict(verdict);

  ui.resultFacts.replaceChildren();
  addFact(ui.resultFacts, 'Product', `${productLabel(selected)} — ${selected.id}`);
  addFact(ui.resultFacts, 'Domain checked', hostname || 'none sent');
  addFact(ui.resultFacts, 'Status', response.result);
  addFact(ui.resultFacts, 'Checked at', formatMoment(response.validatedOn));
  if (response.expiresOn) addFact(ui.resultFacts, 'Expires', formatMoment(response.expiresOn));
  if (response.tier) addFact(ui.resultFacts, 'Tier', response.tier);
  if (response.signature) {
    addFact(ui.resultFacts, 'Signature', `present (version ${response.signature.version})`);
  }
  // Echoed verbatim by Umbraco and it quotes the submitted key, so it is set as
  // text and never as markup.
  if (response.failureReason) {
    addFact(ui.resultFacts, 'Umbraco says', response.failureReason);
  }

  ui.resultTables.replaceChildren();
  addTable('Licensed domains', (response.domains ?? []).map((domain) => [domain] as const));
  addTable(
    'Features',
    Object.entries(response.features ?? {}).map(([name, on]) => [name, on ? 'yes' : 'no'] as const),
  );
  addTable(
    'Variables',
    Object.entries(response.variables ?? {}).map(([name, value]) => [name, String(value)] as const),
  );

  ui.resultRaw.textContent = JSON.stringify(response, null, 2);
  ui.result.toggleAttribute('hidden', false);
  ui.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function paintVerdict(verdict: Verdict): void {
  const container = ui.resultHeadline.closest('.verdict');
  container?.setAttribute('data-tone', verdict.tone);

  ui.resultIcon.setAttribute('name', verdict.icon);
  ui.resultHeadline.textContent = verdict.headline;
  ui.resultDetail.textContent = verdict.detail;

  ui.resultTag.setAttribute('color', verdict.tone === 'default' ? 'default' : verdict.tone);
  ui.resultTag.setAttribute('look', 'primary');
  ui.resultTag.textContent = verdict.licensed ? 'Valid' : 'Not valid';
}

function toast(headline: string, message: string): void {
  const notification = document.createElement('uui-toast-notification');
  notification.setAttribute('color', 'danger');
  (notification as HTMLElement & { autoClose: number }).autoClose = 8000;

  const layout = document.createElement('uui-toast-notification-layout');
  layout.setAttribute('headline', headline);
  layout.textContent = message;

  notification.append(layout);
  ui.toasts.append(notification);
}

// ── submission ──────────────────────────────────────────────────────────────

function collect(): { licenseKey: string; hostname: string } | null {
  clearFieldErrors();

  const licenseKey = ui.key.value.trim();
  const hostname = toHostname(ui.domain.value);
  let valid = true;

  if (!licenseKey) {
    setFieldError(ui.key, 'Paste the license key you want to check.');
    valid = false;
  } else if (licenseKey.toUpperCase() === CLOUD_KEY) {
    setFieldError(
      ui.key,
      'Umbraco Cloud licenses are tied to an environment id rather than to a key and domain, so this service cannot check them.',
    );
    valid = false;
  }

  if (!hostname) {
    setFieldError(ui.domain, 'Enter the domain the license should cover, for example mysite.com.');
    valid = false;
  }

  return valid ? { licenseKey, hostname } : null;
}

async function run(): Promise<void> {
  const input = collect();
  if (!input) return;

  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  ui.submit.setAttribute('state', 'waiting');
  ui.domain.value = input.hostname;

  // The call and the rendering are kept apart so that a fault in one is never
  // reported as the other — telling someone the network failed when it did not
  // sends them looking in the wrong place.
  let response: ValidationResponse;
  try {
    response = await validateLicense(
      { productId: selected.id, licenseKey: input.licenseKey, domain: input.hostname },
      controller.signal,
    );
  } catch (error) {
    if (controller.signal.aborted && inFlight !== controller) return; // superseded
    hideResult();
    ui.submit.setAttribute('state', 'failed');
    toast(
      'Could not reach the licensing service',
      controller.signal.aborted
        ? `No answer within ${REQUEST_TIMEOUT_MS / 1000} seconds. Your key was not sent anywhere else.`
        : `${error instanceof Error ? error.message : String(error)} Your key was not sent anywhere else.`,
    );
    return;
  } finally {
    clearTimeout(timeout);
    if (inFlight === controller) inFlight = undefined;
  }

  show(response, input.hostname);
  ui.submit.setAttribute('state', response.result === 'Valid' ? 'success' : 'failed');
}

// ── wiring ──────────────────────────────────────────────────────────────────

// uui-form never calls preventDefault, so submission is handled here outright.
ui.form.addEventListener('submit', (event) => {
  event.preventDefault();
  run().catch((error: unknown) => {
    ui.submit.setAttribute('state', 'failed');
    toast(
      'Could not show the result',
      `The service answered, but this page failed to render it: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
});

ui.clear.addEventListener('click', () => {
  ui.key.value = '';
  ui.domain.value = '';
  clearFieldErrors();
  hideResult();
  ui.submit.removeAttribute('state');
  ui.key.focus();
});

buildTree();
select(selected);
