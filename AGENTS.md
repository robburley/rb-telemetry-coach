# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a minimal workspace. As implementation files are added, keep the layout predictable and shallow:

- `src/` for application source code and reusable modules.
- `tests/` for automated tests that exercise public behavior.
- `assets/` for static input files, fixtures, screenshots, or generated examples.
- `docs/` for design notes, API notes, and contributor-facing documentation.

Prefer feature-oriented modules over large catch-all files.

## Build, Test, and Development Commands

No project toolchain is checked in yet. When adding one, document the canonical commands here and in the project README. Common examples:

- `npm install` installs JavaScript dependencies when a `package.json` is introduced.
- `npm run dev` starts a local development server.
- `npm test` runs the automated test suite.
- `npm run build` creates a production build or verifies distributable output.

Avoid multiple equivalent commands for the same workflow.

## Coding Style & Naming Conventions

Use consistent formatting within each language ecosystem. For JavaScript or TypeScript, prefer 2-space indentation, `camelCase` for variables and functions, `PascalCase` for components/classes, and kebab-case filenames for route or utility files unless the framework expects otherwise.

Keep functions small and name them after the behavior they provide. Add comments only for non-obvious decisions, constraints, or external protocol details.

## Testing Guidelines

Add tests with the first substantive code change. Place unit tests in `tests/` or beside modules using a clear suffix such as `.test.ts`, `.spec.ts`, or the equivalent for the chosen language.

Tests should cover normal behavior, error handling, and any parsing or data transformation edge cases. Include fixture files only when inline examples would make tests harder to read.

## Commit & Pull Request Guidelines

This workspace has no Git history available, so use clear, imperative commit messages such as `Add telemetry parser` or `Document setup commands`. Keep each commit focused on one logical change.

Pull requests should include a short summary, testing performed, and any setup or migration notes. Link related issues when available, and include screenshots or sample output for user-visible changes.

## Security & Configuration Tips

Do not commit secrets, personal telemetry exports, or machine-specific configuration. Store local environment values in ignored files such as `.env.local`, and document required variables with safe placeholders.
