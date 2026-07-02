---
name: update-changelog
description: Update this repository's README changelog from the current unstaged Git diff, including choosing and applying a semantic version bump from package.json. Use when the user asks to repeat the changelog/version update workflow, summarize unstaged changes into changelog entries, replace an Unreleased changelog heading with a version, or bump the package version for release notes without committing.
---

# Update Changelog

## Workflow

1. Inspect the working tree before editing:
   - Run `git status --short`.
   - Read the full unstaged diff with `git diff`; group by behavior, feature, documentation, configuration, and developer workflow changes.
   - Do not base entries on filenames alone.

2. Identify meaningful changelog entries:
   - Write one concise line per user-visible or developer-visible change.
   - Combine related edits into one entry when they describe the same behavior.
   - Exclude mechanical, formatting-only, and test-only edits unless they document or verify a real behavior change.
   - Ensure every entry is directly supported by the unstaged diff.

3. Choose the semantic version:
   - Read `package.json` for the current version.
   - Use SemVer intent, with pre-1.0 versions treated conservatively:
     - Patch bump for fixes, documentation corrections, and narrow refinements.
     - Minor bump for new analyzer behavior, new metrics, new configuration, or changed rule semantics.
     - Major bump only when the user explicitly wants a breaking public release or the repo has a clear post-1.0 breaking API change.
   - Keep `package-lock.json` root package versions in sync when present.

4. Update `README.md`:
   - Add or update a `## Changelog` section near the top of the README, before long reference sections.
   - Use a version heading such as `### 0.2.0`; do not leave the heading as `Unreleased` when a version bump is requested.
   - Preserve existing changelog content if it exists; add the new version above older entries.
   - Keep entries short, action-oriented, and grounded in changed behavior.

5. Prepare a commit message:
   - Draft a clear imperative subject that covers the changelog/version update and the behavior summarized from the diff.
   - Include a short optional body when the change has several distinct behavior groups.
   - Keep the subject and body grounded in the same diff evidence used for the changelog.

6. Verify without committing:
   - Run `git diff -- README.md package.json package-lock.json` to review the changelog and version edits.
   - Run `git status --short` to confirm the expected files changed.
   - Do not stage or commit unless the user separately asks.

## Reporting

In the final response, state the selected version, the files updated, whether validation commands or tests were run, and a ready-to-use git commit message. Mention that no commit was made unless the user asked for one.
