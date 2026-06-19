# Playwright Smoke Check

Use one command for routine browser verification:

```powershell
npm run smoke:ui
```

The script:

- starts Vite at `http://127.0.0.1:5173/` with `--strictPort`;
- loads the repo-local Playwright dev dependency, so no global install is required;
- verifies the example UI renders, runs the Analyze flow, and checks for browser console errors;
- captures desktop and narrow screenshots in `output/playwright/`;
- stops the Vite process when finished.

If port `5173` is busy, either stop the existing server or run:

```powershell
$env:UI_SMOKE_PORT = "5174"; npm run smoke:ui
```

Only drop to manual Playwright commands when this smoke check does not cover the scenario being tested.
