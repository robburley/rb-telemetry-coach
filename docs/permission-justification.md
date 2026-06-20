# RB Telemetry Coach Permission Justification

RB Telemetry Coach only runs on `https://garage61.net/*` and `https://www.garage61.net/*`. This host access is required to detect Garage 61 lap analysis pages, inject the coaching panel, read the active comparison state and zoomed distance range, and analyze the two laps already selected by the user.

The extension passively observes Garage 61 fetch/XHR responses made by the active page because lap metadata and telemetry are loaded dynamically by Garage 61. This data is needed to calculate braking, throttle, steering, speed, gear, RPM, and racing-line findings.

RB Telemetry Coach does not access other websites, bypass Garage 61 permissions, make scraping requests, or transmit data externally. All analysis runs locally in the browser. It does not collect, sell, store, or share telemetry, lap metadata, driver names, URLs, analytics, logs, or usage data, and it uses no third-party services or developer backend.
