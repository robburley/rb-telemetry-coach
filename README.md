# RB Telemetry Coach

RB Telemetry Coach is a private Garage 61 analysis tool. It ships as a Chrome extension that injects a React coaching panel into Garage 61 analysis pages, captures Garage 61 metadata and telemetry responses from the page, compares exactly two active laps, and reports deterministic coaching findings for the currently selected distance slice.

The project is TypeScript-first, uses Vite for both the local development UI and browser extension bundle, and keeps the coaching pipeline deterministic rather than model-driven.

## What It Does

- Adds an RB coach panel to `garage61.net` analysis pages.
- Reads the active Garage 61 two-lap comparison from page network responses.
- Treats the faster active lap as the reference lap and the slower active lap as the target lap.
- Uses the current chart zoom range as the analysis slice.
- Produces priority-sorted findings with evidence and practice cues.
- Runs locally in the browser extension with no declared extension permissions.

For end-user behavior and troubleshooting, see [docs/user-guide.md](docs/user-guide.md).

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/analysis/` | Deterministic telemetry comparison pipeline, report assembly, and rules. |
| `src/analysis/rules/` | Category-specific coaching rule modules and thresholds. |
| `src/domain/` | Shared telemetry, metadata, report, and comparison types. |
| `src/garage61/` | Garage 61 URL parsing, response classification, normalization, and TDF decoding. |
| `src/providers/` | Local fixture and live Garage 61 telemetry providers. |
| `src/extension/` | Extension manifest, content script, page observer, messaging, and live-report wiring. |
| `src/ui/` | React coach panel, shell, formatting helpers, styles, and dev harness. |
| `tests/` | Vitest coverage mirroring the main behavior areas. |
| `example-data/` | Checked-in Garage 61 metadata and raw TDF response fixtures. |
| `docs/` | User guide, rules reference, privacy docs, and smoke-test notes. |
| `scripts/` | Project automation and validation helpers. |
| `planning/` | Planning notes and implementation plans; not runtime source. |

## Requirements

- Node.js 20 or newer is recommended.
- npm, using the checked-in `package-lock.json`.
- Chrome for extension testing.

## Getting Started

Install dependencies:

```powershell
npm install
```

Start the local Vite development UI:

```powershell
npm run dev
```

The dev UI runs on `http://127.0.0.1:5173/` by default and uses local example data rather than a live Garage 61 page.

## Build

Build the local app and extension bundle:

```powershell
npm run build
```

Build only the extension bundle:

```powershell
npm run build:extensions
```

Browser-specific extension builds are also available:

```powershell
npm run build:extension:chrome
npm run build:extension:firefox
```

Generated output belongs in `dist/`.

## Load the Chrome Extension

1. Run `npm run build:extension:chrome`.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer mode.
4. Choose `Load unpacked`.
5. Select the generated Chrome extension directory under `dist/`.
6. Open a Garage 61 analysis page with exactly two active laps.

The extension targets `https://garage61.net/*` and `https://www.garage61.net/*`.

## Test and Verify

Run the TypeScript checker:

```powershell
npm run typecheck
```

Run the Vitest suite once:

```powershell
npm test
```

Run the canonical browser smoke check:

```powershell
npm run smoke:ui
```

The smoke script owns the Vite dev-server lifecycle, verifies the Analyze flow, checks browser console output, and writes screenshots to `output/playwright/`. More detail is in [docs/playwright-smoke.md](docs/playwright-smoke.md).

Validate raw Garage 61 TDF fixture captures:

```powershell
node scripts/convert-garage61-data-url-fixtures.mjs --check
```

## Fixtures

`example-data/*-tdf.txt` files are the canonical raw copied Garage 61 telemetry fixtures. They are stored as `data:application/octet-stream;base64,...` text captures and decoded through the Garage 61 binary decoder. See [example-data/README.md](example-data/README.md) for the fixture map and format notes.

Do not commit personal telemetry exports, Garage 61 account data, secrets, generated decoded scratch files, or machine-specific configuration.

## Documentation

- [User guide](docs/user-guide.md)
- [Rules reference](docs/rules-reference.md)
- [Playwright smoke check](docs/playwright-smoke.md)
- [Permission justification](docs/permission-justification.md)
- [Privacy disclosure](docs/privacy-disclosure.md)
- [Privacy policy](docs/privacy-policy.md)

## Development Notes

Keep analysis changes grounded in the deterministic telemetry pipeline. Rule modules should return `undefined` when evidence is insufficient, normalize Garage 61-specific shapes at the `src/garage61/` boundary, and cover substantive behavior changes with focused tests.

For UI-visible changes, run `npm run smoke:ui` and review the screenshots in `output/playwright/`. For extension entry points, permissions, match patterns, or packaging changes, run `npm run build` before publishing or handing off.
