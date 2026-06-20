# Cloudflare Pages Privacy Policy Hosting

Use this flow to publish the RB Telemetry Coach privacy policy as a small static Cloudflare Pages site.

The source of truth remains `docs/privacy-policy.md`. The generator intentionally copies the current policy text into a static HTML page and does not replace `[DATE]`, `[CONTACT EMAIL]`, or `[PRIVACY POLICY URL]`.

## Build the static page

```sh
npm run build:privacy-policy
```

This writes:

```text
privacy-site/index.html
```

## Confirmed Cloudflare Pages setup

- Project name: `rb-telelemtry-coach-privacy-policy`
- Public URL: `https://rb-telelemtry-coach-privacy-policy.rcburley.workers.dev/`
- Production branch: the repository's main release branch
- Build command: `npm run build:privacy-policy`
- Build output directory: `privacy-site`
- Framework preset: none / static HTML
- Environment variables: none

If deploying from the Cloudflare dashboard, create a Pages project from the repository, use the settings above, and deploy. If deploying with Wrangler later, point the Pages deployment at the generated `privacy-site` directory.

Use the public URL above for release handoff notes and later placeholder finalization when the privacy policy values are ready.
