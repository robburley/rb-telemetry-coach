# Repository Guidelines

## Project Context

RB Telemetry Coach is a private Garage 61 analysis. It ships as a Chrome extension that injects a React coaching panel into Garage 61 pages, captures Garage 61 analysis and telemetry responses, compares exactly two active laps, and reports deterministic coaching findings for the currently selected distance slice.

The app is TypeScript-first and uses Vite for both the local development UI and extension bundle. Keep changes grounded in the current deterministic telemetry pipeline rather than adding unrelated product surfaces.

## Project Structure & Module Organization

- `src/analysis/` contains the comparison pipeline: slicing, resampling, smoothing, event detection, evidence, report assembly, and deterministic rules.
- `src/analysis/rules/` contains category-specific rule modules. Threshold constants live in `src/analysis/rules/constants/`.
- `src/domain/` contains shared domain types and unit helpers.
- `src/garage61/` contains Garage 61-specific URL parsing, network response classification, metadata normalization, telemetry normalization, and binary TDF decoding.
- `src/providers/` contains telemetry providers for local example data and live Garage 61 page-network data.
- `src/extension/` contains the Chrome extension manifest, content script, injected page observer, messaging, and live-report wiring.
- `src/ui/` contains the React coach panel, shell, formatting helpers, styles, and the Vite dev harness under `src/ui/dev/`.
- `tests/` mirrors the main behavior areas with Vitest coverage for analysis, Garage 61 parsing/decoding/normalization, providers, extension code, and UI.
- `example-data/` stores checked-in Garage 61 response fixtures. Raw TDF captures are canonical as copied `data:application/octet-stream;base64,...` text files.
- `docs/` contains user-facing and contributor-facing documentation, including `docs/rules-reference.md` and `docs/playwright-smoke.md`.
- `assets/` stores visual assets such as the RB coach logo.
- `scripts/` contains project automation, including the canonical UI smoke test.
- `planning/` contains implementation plans and product notes. Treat it as planning/reference material, not runtime source.
- `output/`, `dist/`, `.scratch/`, and `node_modules/` are generated or local working directories.

Prefer feature-oriented modules and keep imports flowing through existing index files where that is already the local pattern.

## Build, Test, and Development Commands

- `npm install` installs the project dependencies from `package-lock.json`.
- `npm run dev` starts the local Vite development UI on `127.0.0.1`.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm test` runs the Vitest suite once.
- `npm run build` type-checks, builds the Vite app, and builds the Chrome extension with `vite.extension.config.ts`.
- `npm run preview` serves the production build locally.
- `npm run smoke:ui` starts Vite on `127.0.0.1:5173`, runs the canonical Playwright browser smoke check, writes screenshots to `output/playwright/`, and shuts the server down.
- `node scripts/convert-garage61-data-url-fixtures.mjs --check` validates raw Garage 61 TDF fixture captures.

For browser verification, prefer `npm run smoke:ui` before ad hoc Playwright commands because it owns the dev-server lifecycle. Run `npm test` and `npm run typecheck` for substantive logic changes; run `npm run build` before changes that affect packaging, extension entry points, or Vite config.

## Coding Style & Naming Conventions

Use TypeScript with 2-space indentation, `camelCase` for variables and functions, `PascalCase` for React components and types/classes, and descriptive kebab-case or camelCase filenames that match the surrounding folder convention.

Keep deterministic analysis code small, pure where practical, and covered by focused tests. Rule modules should return `undefined` when evidence is insufficient rather than throwing or manufacturing weak findings. UI code should preserve the extension panel ergonomics and avoid coupling presentation details back into analysis or Garage 61 parsing modules.

Add comments only for non-obvious protocol details, telemetry quirks, or threshold rationale. Do not commit personal telemetry exports, secrets, or machine-specific configuration.

## Testing Guidelines

Add or update tests with every substantive behavior change. Follow the existing test organization:

- Analysis and rules behavior in `tests/analysis/`.
- Garage 61 URL, network, decoding, metadata, and normalization behavior in `tests/garage61/`.
- Provider behavior in `tests/providers/`.
- Extension behavior in `tests/extension/`.
- React/UI and formatting behavior in `tests/ui/`.

Cover normal behavior, error handling, missing-channel degradation, parsing edge cases, and rule-threshold boundaries. For UI-visible changes, run `npm run smoke:ui` and review the screenshots in `output/playwright/`.

## Fixture & Telemetry Data Guidance

Treat `example-data/*-tdf.txt` files as the canonical raw copied Garage 61 telemetry fixtures. They should be trimmed, prefix-checked, base64-decoded, and passed through the Garage 61 binary decoder. Generated decoded files, binary scratch output, and temporary captures belong in `.scratch/` or another ignored location unless they are intentionally added as golden fixtures.

When adding Garage 61-specific behavior, prefer normalizing external shapes at the `src/garage61/` boundary so downstream analysis code works with domain types instead of raw API payloads.

## Commit & Pull Request Guidelines

Use clear, imperative commit messages such as `Add braking rule coverage` or `Document extension smoke test`. Keep each commit focused on one logical change.

Pull requests should include a short summary, testing performed, setup or migration notes, and screenshots or sample output for user-visible changes. Mention whether changes affect the Chrome extension bundle, local dev UI, telemetry fixtures, or deterministic rule output.

## Security & Configuration Tips

Do not commit secrets, Garage 61 account data, personal telemetry exports, or machine-specific configuration. Store local environment values in ignored files such as `.env.local` and document required variables with safe placeholders.

The extension currently targets `https://garage61.net/*` and `https://www.garage61.net/*` with no declared permissions. Be cautious when changing match patterns, script worlds, or permissions, and verify extension behavior with a production build when those files change.
