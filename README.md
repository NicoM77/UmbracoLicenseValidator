# Umbraco License Validator

Check an Umbraco license key against a domain, without installing anything.

**→ [nicom77.github.io/UmbracoLicenseValidator](https://nicom77.github.io/UmbracoLicenseValidator/)**

Pick a product from the tree, paste the key, enter the domain, and the page tells
you whether Umbraco recognises that pairing — the same question your installation
asks on startup.

## Your key stays between you and Umbraco

The page posts directly from your browser to
`https://license-validation.umbraco.com/api/ValidateLicense`, Umbraco's own
service. There is no backend here, nothing is logged, nothing is stored, and the
key never appears in a URL.

That is the only external request the page makes. Everything else — the script,
the stylesheet, the Umbraco UI Library, the Lato fonts — is bundled at build time
and served from this origin, so there is no CDN in the loading path and no third
party to trust. A `Content-Security-Policy` naming a single host under
`connect-src` makes it enforceable: the browser blocks a request anywhere else,
so the promise is machine-checked rather than merely stated.

## What this tool knows about the endpoint

Umbraco documents this endpoint only in passing, as a way to validate licenses on
a server without outbound internet access. There is no published schema, no list
of status values, and no list of products. The behaviour below was established by
probing the live service.

### Supported products

An unknown product answers `InvalidUnrecognizedProductId`, a known one answers
`InvalidUnrecognizedLicenseKey`. That gives a clean oracle, and these seven ids
pass it — around fifty other plausible ids do not:

| ProductId | Product |
| --- | --- |
| `Umbraco.Forms` | Umbraco Forms |
| `Umbraco.Commerce` | Umbraco Commerce |
| `Umbraco.Deploy` | Umbraco Deploy |
| `Umbraco.Deploy.OnPrem` | Umbraco Deploy, on-premise |
| `Umbraco.Engage` | Umbraco Engage |
| `Umbraco.UIBuilder` | Umbraco UI Builder |
| `Umbraco.Workflow` | Umbraco Workflow |

Both `Umbraco.Deploy` and `Umbraco.Deploy.OnPrem` are accepted, though only the
latter is documented. Ids are matched case-insensitively, but the `Umbraco.`
prefix is required — a bare `Forms` is rejected. Umbraco Cloud is not covered at
all: its licensing runs on an environment id rather than a key and domain.

### Behaviour worth knowing

- **Every outcome is HTTP 200.** The verdict is in the `result` field. Branching
  on the status code will tell you a rejected key was accepted.
- **The service checks the product first, then the key, then the domain.** A
  response of `InvalidUnrecognizedLicenseKey` says nothing about your domain,
  because the domain was never examined. This tool words its messages
  accordingly.
- **`result` is an open string, not a closed set.** Umbraco has shipped values
  its own client did not recognise, so an unknown value is reported verbatim
  rather than being forced into a familiar case.
- **`failureReason` quotes your input back**, including the key itself. It is
  rendered as text, never as markup, and the raw-response panel carries a warning
  before you share a screenshot.
- **A licensed domain covers more than itself** — `localhost`, subdomains and
  local development variants — but the rules differ between products, and
  Umbraco's own pages contradict each other on the details. Check the licensing
  page for your product.

## Running it locally

```bash
npm install
npm run build
npm run serve
```

Then open `http://localhost:3000`. ES modules need a real origin, so opening
`index.html` from the filesystem will not work.

`npm run watch` rebuilds on change.

## How it is put together

TypeScript with no framework. esbuild bundles the application together with the
Umbraco UI Library web components it uses, and compiles the stylesheet with the
Umbraco design tokens and the Lato fonts alongside it. `tsc` typechecks but emits
nothing.

Components are imported one at a time rather than through the `@umbraco-ui/uui`
barrel. The package marks every component as having side effects, so importing
the barrel would bundle all eighty of them; naming the twelve that are used keeps
the script at about 110 KB instead of 360 KB.

GitHub Actions runs the build and publishes to Pages, so the repository holds
source only.

| File | Role |
| --- | --- |
| `index.html` | The backoffice chrome and the form |
| `src/app.css` | Entry point: Umbraco tokens, then this app's layout |
| `src/styles.css` | Layout, built on the UUI design tokens |
| `src/components.ts` | The UI Library elements to include in the bundle |
| `src/api.ts` | The call to Umbraco |
| `src/products.ts` | The product catalogue |
| `src/domain.ts` | Reducing what you type to a bare hostname |
| `src/verdict.ts` | Turning a status into something readable |
| `src/main.ts` | Wiring and rendering |

The interface deliberately mirrors the Umbraco 17 backoffice, down to the design
tokens: the product tree sits where the content tree sits, and the form is laid
out like a property editor.

## Licence

MIT — see [LICENSE](LICENSE). Not affiliated with or endorsed by Umbraco.
