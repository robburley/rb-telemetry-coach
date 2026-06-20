# RB Telemetry Coach Permission Justification

RB Telemetry Coach is a local-only browser extension that adds a coaching panel to Garage 61 analysis pages.

## Submission purpose

This is the host access and response-observation justification artifact for browser extension review. Privacy and data-disclosure copy remains separate in `docs/privacy-policy.md` and `docs/privacy-disclosure.md`.

The extension only runs on:

* `https://garage61.net/*`
* `https://www.garage61.net/*`

It does not request broad website access and does not request access to all sites.

## Host access justification

RB Telemetry Coach needs access to Garage 61 pages so it can:

* detect when the user is viewing a Garage 61 lap analysis page
* add the RB Telemetry Coach panel to that page
* observe Garage 61 lap comparison data already loaded by the active page
* observe Garage 61 lap telemetry responses already requested by the active page
* read the currently zoomed distance range from the active analysis view
* calculate local coaching findings from the two active laps

This access is required because the extension’s single purpose is to provide telemetry coaching feedback directly on Garage 61 analysis pages.

## Content script justification

The extension injects a content script into Garage 61 pages to display the coaching panel and connect the page data to the extension UI.

The extension also uses a page-level observer script because the relevant Garage 61 comparison metadata and telemetry are loaded by the Garage 61 page itself. The observer allows the extension to read the responses already loaded by the active page without requiring the user to manually export and upload telemetry files.

The observer does not bypass Garage 61 permissions, does not access data from other websites, and does not make bulk scraping requests.

## Network/data observation justification

RB Telemetry Coach passively observes Garage 61 fetch/XHR responses made by the active Garage 61 page. This is necessary because Garage 61 telemetry data is loaded dynamically by the page and is required to calculate braking, throttle, steering, speed, gear, RPM, and racing line findings.

The extension does not use this access to transmit data externally. All calculations are performed locally in the browser.

## No data collection

RB Telemetry Coach does not collect, transmit, sell, store, or share user data.

The extension does not send telemetry, lap metadata, driver names, Garage 61 URLs, analytics, error logs, or usage data to the developer or any third-party service.

Any Garage 61 data observed by the extension is held temporarily in memory only while needed for local analysis.

## No third-party services

RB Telemetry Coach does not use analytics, remote logging, crash reporting, AI APIs, remote configuration, or developer-controlled backend services.

## No persistent storage

RB Telemetry Coach does not persistently store telemetry data, analysis reports, user preferences, Garage 61 lap IDs, debug logs, or account information.

## Independence from Garage 61

RB Telemetry Coach is an independent extension and is not affiliated with, endorsed by, sponsored by, or officially connected to Garage 61.
