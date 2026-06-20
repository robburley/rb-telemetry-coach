# RB Telemetry Coach User Guide

This guide assumes you have already installed the Chrome extension.

## What It Does

RB Telemetry Coach adds a small coaching panel to Garage 61 analysis pages. It compares two active laps, reads the currently zoomed distance range, and reports priority-sorted coaching findings for that slice.

The current implementation is designed for two-lap comparisons:

- The faster active lap is treated as the reference lap.
- The slower active lap is treated as the target lap.
- Exactly two laps must be active in Garage 61 for analysis to run.

## Open the Coach

1. Open Chrome and go to Garage 61.
2. Open an analysis page that compares laps.
3. Make sure exactly two laps are active in the Garage 61 comparison.
4. Look for the RB logo button in the upper-right corner of the page.
5. Click the RB logo to expand the coach panel.

The panel may show `Waiting` while Garage 61 is still loading analysis metadata and lap telemetry. If the page has just opened, wait a moment or interact with the Garage 61 chart so the telemetry requests complete.

## Run an Analysis

1. In Garage 61, zoom into a corner or short sector on the telemetry chart.
2. Keep the selected range reasonably short. The current analyzer expects a slice between 0.5% and 15% of the lap.
3. Open the Garage 61 coach panel if it is minimized.
4. Click `Analyze`.
5. Review the coaching findings.

Each finding includes:

- A severity indicator.
- A short title describing the issue.
- Why the finding matters.
- Supporting telemetry evidence.
- A practice cue for what to try next.

Each finding starts collapsed with its title visible. Select a finding title to expand its evidence, linked context, and practice cue.

## Using Zoom Updates

After you have generated a report, changing the Garage 61 zoom range can automatically refresh the report for the new slice. This is useful when stepping through a lap corner by corner.

For best results:

- Analyze one braking zone, apex, or exit at a time.
- Avoid full-lap views when looking for detailed coaching feedback.
- Avoid slices that wrap around the start/finish line.

## Minimize the Panel

Click the `-` button in the coach header to minimize the panel back to the RB logo launcher.

## Troubleshooting

### The RB Logo Button Does Not Appear

- Confirm you are on `garage61.net` or `www.garage61.net`.
- Confirm the current page is a Garage 61 analysis page.
- Refresh the page after installing or updating the extension.
- Check that the extension is enabled in Chrome.

### The Panel Says `Waiting`

The coach is waiting for Garage 61 data captured from the page.

- Wait for the Garage 61 analysis page to finish loading.
- Make sure exactly two laps are active.
- Click or scrub the Garage 61 telemetry chart so both lap telemetry responses load.
- Refresh the analysis page if the panel remains stuck.

### The Panel Says to Hide Laps

The current implementation can analyze exactly two active laps. Hide extra laps in Garage 61 until only the two laps you want to compare remain active.

### The Panel Asks for a Shorter or Longer Slice

The selected zoom range is outside the supported range.

- If it says the slice is too large, zoom further into the chart.
- If it says the slice is too short, widen the zoom range slightly.
- Aim for a single corner, braking zone, or short sector.

### No Clear Finding Appears

Some slices do not produce a deterministic finding. Try a different part of the lap, especially a braking zone, throttle application zone, steering transition, or corner exit.
