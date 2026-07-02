# Deterministic Rules Reference

This analyzer compares the selected Garage 61 distance slice from a target lap against a reference lap. The reference is the local baseline for timing, speed, line, gear, and pedal shape; it is not treated as a perfect or absolute driving model.

The pipeline normalizes Garage 61 telemetry, resamples both laps onto the selected distance slice, filters short shift-related throttle blips, smooths noisy channels, detects driving events, derives comparison metrics, then runs deterministic rules. Brake start, peak, and release timing anchors use the filtered unsmoothed brake trace so evidence locations match the visible brake shape; noisier throttle and steering events still use the smoothed comparison trace. Rules stay quiet when their required telemetry channels or derived metrics are unavailable, so missing channels degrade the report instead of crashing analysis.

Most thresholds are intentionally conservative. Distance-based timing checks usually use 8-10 m deltas, speed checks use roughly 3 km/h deltas, pedal depth checks use roughly 0.12-0.15 normalized pedal travel, lateral/path checks use metre-scale deltas, and RPM/gear checks require meaningful strategy differences.

## Analysis Configuration

Developer-facing tuning lives in `src/analysis/config.ts`. Use `defaultAnalysisConfig` for production defaults and `createAnalysisConfig` for focused test or harness overrides so nested settings keep their sibling defaults.

The config is grouped by pipeline purpose:

- `resampling`: distance step and maximum point count for the normalized slice.
- `smoothing`: per-channel distance windows for speed, brake, throttle, and steering.
- `filters`: signal cleanup before event detection, including gear-aware suppression of short isolated throttle blips during shifts.
- `events`: detection thresholds for active brake/throttle, full throttle, throttle lifts, steering noise, and steering unwind.
- `slicing`: minimum and maximum selected-slice length limits.
- `rules.triggers`: thresholds that decide whether a deterministic finding appears.
- `rules.severity`: thresholds that decide high versus medium severity after a finding has already triggered.
- `rules.factors`: rule-specific calculation factors that are tuneable but are not trigger or severity thresholds.

Trigger and severity thresholds are deliberately separate even when their names sound similar. For example, `rules.triggers.brakeTimingDeltaM` controls whether braking timing findings can appear, while `rules.severity.braking.brakeTimingDeltaM` controls how strongly qualifying braking timing findings are labeled. Override only the smallest group needed for a calibration test:

```ts
const config = createAnalysisConfig({
  rules: {
    triggers: { brakeTimingDeltaM: 12 },
    severity: { braking: { brakeTimingDeltaM: 7 } },
  },
});
```

## Core Telemetry And Metrics

The currently decoded channels are speed, brake, throttle, steering, gear, RPM, latitude, longitude, heading, and distance percentage. The deterministic rules use these derived metric groups:

- Speed: entry, average, own-minimum, same-distance minimum, exit speed deltas, and minimum-speed location.
- Braking: brake start, release, duration, peak pressure, pressure area, ramp, release shape, and brake near minimum speed.
- Throttle: first throttle, full throttle, lift count, lift depth, lift duration, coast gap, throttle area, and speed lost while coasting. Short isolated throttle blips near gear changes are filtered before these metrics are derived.
- Steering and rotation: peak steering, correction count, unwind timing, heading change, apex heading, and equivalent heading timing.
- Line and path: heading-aware lateral offset at entry, apex, and exit, maximum path separation, and inferred corner direction.
- Apex and speed shape: relative apex candidate timing, min-speed-to-exit gain, and apex-to-exit gain.
- Pedal coordination: steering while brake is active, throttle rise while brake is active, and brake-entry throttle drop.
- Gear/RPM: average and exit gear/RPM deltas.

## Braking Rules

### `braking-too-early`

- Category: braking
- Required telemetry: brake event detection from both laps.
- Key metrics: brake start delta.
- Trigger logic: the target starts braking more than the brake timing threshold before the reference.
- Primary evidence: `Brake start`.
- Different from: `soft-initial-brake`, which is about pressure build after braking starts.

### `braking-too-late`

- Category: braking
- Required telemetry: brake event detection from both laps.
- Key metrics: brake start delta.
- Trigger logic: the target starts braking materially later than the reference.
- Primary evidence: `Brake start`.
- Different from: `over-driving-entry`, which needs entry speed gain followed by minimum-speed loss.

### `holding-brake-too-long`

- Category: braking
- Required telemetry: brake channel from both laps.
- Key metrics: brake duration delta.
- Trigger logic: the target brake phase covers materially more distance than the reference.
- Primary evidence: `Brake duration`.
- Different from: `dragging-brake`, which focuses on brake pressure around the slowest point.

### `over-slowing-entry`

- Category: braking
- Required telemetry: speed from both laps.
- Key metrics: own-minimum speed delta and minimum-speed location.
- Trigger logic: the target's own minimum speed is materially lower than the reference's own minimum speed.
- Primary evidence: `Minimum speed`.
- Different from: `minimum-speed-too-early-or-late`, which diagnoses where the slowest point happens.

### `insufficient-trail-braking`

- Category: braking
- Required telemetry: brake and speed from both laps.
- Key metrics: brake release delta and minimum speed delta.
- Trigger logic: the target releases the brake materially earlier without gaining minimum speed.
- Primary evidence: `Brake release`.
- Different from: `poor-rotation`, which uses early brake release plus extra steering as rotation evidence.

### `soft-initial-brake`

- Category: braking
- Required telemetry: brake from both laps, with speed support when available.
- Key metrics: start-to-peak brake distance delta, brake duration, and minimum speed.
- Trigger logic: target pressure takes longer to reach peak and the corner costs braking distance or minimum speed.
- Primary evidence: `Start to peak`.
- Different from: `under-braking-pressure`, which is about not using enough total or peak pressure.

### `spiking-brake-pressure`

- Category: braking
- Required telemetry: brake, plus speed or steering support.
- Key metrics: start-to-peak brake distance delta, peak brake delta, minimum speed, steering peak, and corrections.
- Trigger logic: target pressure reaches peak much sooner than the reference and the outcome shows speed loss, extra steering, or corrections.
- Primary evidence: `Start to peak`.
- Different from: `dumping-brake-release`, which is about the pressure release phase.

### `dumping-brake-release`

- Category: braking
- Required telemetry: brake and steering.
- Key metrics: brake release distance delta, peak steering delta, and correction count delta.
- Trigger logic: target brake release is materially shorter and rotation evidence shows extra steering or corrections.
- Primary evidence: `Release distance`.
- Different from: `holding-brake-too-long`, which is about the brake phase lasting longer overall.

### `dragging-brake`

- Category: braking
- Required telemetry: brake, throttle, and event timing.
- Key metrics: brake near minimum speed, brake area delta, brake release delta, and first throttle delta.
- Trigger logic: target carries more brake near the slowest point and also shows delayed throttle or a later release.
- Primary evidence: `Brake near apex`.
- Different from: `coasting-mid-corner`, which is about the neutral gap after brake release.

### `under-braking-pressure`

- Category: braking
- Required telemetry: brake and speed.
- Key metrics: peak brake delta, brake area delta, brake duration, and minimum speed.
- Trigger logic: target uses less pressure or brake area while still braking longer or losing minimum speed.
- Primary evidence: `Brake area`.
- Different from: `soft-initial-brake`, which can fire even with enough total pressure if the ramp is too slow.

## Throttle Rules

### `delayed-throttle-pickup`

- Category: throttle
- Required telemetry: throttle event detection from both laps.
- Key metrics: first throttle delta.
- Trigger logic: target first throttle starts materially later than the reference.
- Primary evidence: `First throttle`.
- Different from: `exit-hesitation`, which requires exit speed loss and delayed full throttle or no early full-throttle support.

### `early-throttle-with-lift`

- Category: throttle
- Required telemetry: throttle from both laps.
- Key metrics: first throttle delta and extra target lift count.
- Trigger logic: target picks up throttle earlier than reference but then adds extra lifts.
- Primary evidence: `First throttle`.
- Different from: `throttle-before-steering-unwind`, which requires the throttle to arrive before steering has unwound.

### `exit-hesitation`

- Category: throttle
- Required telemetry: speed, with throttle event timing when available.
- Key metrics: exit speed delta and full throttle delta.
- Trigger logic: target exits materially slower and does not reach full throttle early enough to explain it away.
- Primary evidence: `Exit speed`.
- Different from: `exit-acceleration-deficit`, which compares speed gained after minimum speed or apex, not only final exit speed.

### `coasting-mid-corner`

- Category: throttle
- Required telemetry: brake, throttle, and speed.
- Key metrics: brake-to-throttle coast gap delta, target coast distance, speed lost during coast, minimum speed, and exit speed.
- Trigger logic: target spends materially longer between brake release and throttle pickup while losing speed.
- Primary evidence: `Coast gap`.
- Different from: `delayed-throttle-pickup`, which can fire without a measured neutral-pedal gap.

### `rushed-brake-to-throttle`

- Category: throttle
- Required telemetry: brake, throttle, plus speed, lift, or steering support.
- Key metrics: brake-entry throttle overlap, throttle drop while braking, lift count delta, correction count delta, and exit speed.
- Trigger logic: target carries throttle into brake entry and then drops that throttle while braking, with an unstable or costly outcome.
- Primary evidence: `Throttle into braking`.
- Different from: `throttle-reapplied-while-braking`: this rule is specifically throttle carried into brake entry and dropped while braking, not throttle added after braking has already begun.

### `throttle-before-steering-unwind`

- Category: throttle
- Required telemetry: throttle, steering, and outcome support from speed, lifts, or corrections.
- Key metrics: first throttle delta, steering unwind delta, lift count delta, correction count delta, and exit speed.
- Trigger logic: target starts throttle earlier while steering unwind happens later, then shows lift, correction, or exit speed cost.
- Primary evidence: `Throttle before unwind`.
- Different from: `early-throttle-with-lift`, which does not require late steering unwind.

### `throttle-reapplied-while-braking`

- Category: throttle
- Required telemetry: brake and throttle, with speed, lift, or steering support.
- Key metrics: throttle rise while braking, peak and average brake during that rise, overlap distance, lift count delta, correction count delta, and exit speed.
- Trigger logic: target throttle rises while brake pressure is already active, and the corner also shows a lift, correction, or exit speed cost.
- Primary evidence: `Throttle rise while braking`.
- Different from: `rushed-brake-to-throttle`: this rule is specifically throttle rising after brake application has begun. It should not fire for simply failing to close throttle before braking and then dropping it during the brake phase.

### `exit-acceleration-deficit`

- Category: throttle
- Required telemetry: speed, and apex/min-speed comparison when available.
- Key metrics: min-speed-to-exit gain delta and apex-to-exit gain delta.
- Trigger logic: target gains materially less speed from the slowest point or apex to exit.
- Primary evidence: `Exit acceleration`.
- Different from: `exit-hesitation`, which is based on exit speed and full-throttle timing.

### `unnecessary-throttle-lift`

- Category: throttle
- Required telemetry: throttle and speed from both laps.
- Key metrics: target lift count, reference lift count, target lift depth, average speed delta, and exit speed delta.
- Trigger logic: reference stays committed while target lifts deeply enough to cost average or exit speed.
- Primary evidence: `Lift depth`.
- Different from: `deep-throttle-lift`, which compares lift depth against the reference even when the reference also lifts.

### `deep-throttle-lift`

- Category: throttle
- Required telemetry: throttle from both laps.
- Key metrics: maximum lift depth delta and target maximum lift depth.
- Trigger logic: target's deepest throttle reset closes the pedal materially more than the reference's deepest reset.
- Primary evidence: `Extra lift depth`.
- Different from: `long-throttle-lift`, which is about lift duration rather than depth.

### `long-throttle-lift`

- Category: throttle
- Required telemetry: throttle and lap length.
- Key metrics: longest lift duration delta, target longest lift duration, and reference longest lift duration.
- Trigger logic: target longest throttle lift lasts materially farther down the road than the reference.
- Primary evidence: `Pause vs reference`.
- Secondary evidence: `Your throttle pause`, `Reference throttle pause`.
- Different from: `unnecessary-throttle-lift`, which requires the reference to avoid lifts and speed to suffer.

## Steering And Rotation Rules

### `excessive-steering`

- Category: steering
- Required telemetry: steering from both laps.
- Key metrics: peak steering delta.
- Trigger logic: target peak steering exceeds the reference by more than the steering threshold.
- Primary evidence: `Peak steering`.
- Different from: `poor-rotation`, which uses extra steering together with early brake release.

### `too-much-steering-while-braking`

- Category: steering
- Required telemetry: brake and steering, with speed, correction, or rotation support.
- Key metrics: peak and average steering while braking deltas, correction count, minimum speed, and heading rotation.
- Trigger logic: target carries more steering while brake pressure is active and the outcome shows corrections, speed loss, or unfinished rotation.
- Primary evidence: `Steering while braking`.
- Different from: `excessive-steering`, which can fire on peak steering anywhere in the slice.

### `late-steering-unwind`

- Category: steering
- Required telemetry: steering event detection from both laps.
- Key metrics: steering unwind delta.
- Trigger logic: target steering stays loaded materially longer than the reference.
- Primary evidence: `Steering unwind`.
- Different from: `throttle-before-steering-unwind`, which requires throttle to arrive before the delayed unwind.

### `poor-rotation`

- Category: rotation
- Required telemetry: steering and brake timing.
- Key metrics: peak steering delta and brake release delta.
- Trigger logic: target uses extra steering and releases brake earlier than the reference, suggesting rotation was not finished by brake release.
- Primary evidence: `Peak steering`.
- Different from: `under-rotated-at-apex`, which uses heading and apex evidence.

### `under-rotated-at-apex`

- Category: rotation
- Required telemetry: heading or GPS-derived heading, plus steering or line support.
- Key metrics: apex or min-speed heading delta, peak steering delta, and apex lateral offset.
- Trigger logic: target has materially less heading change around apex/minimum speed and steering or line evidence supports unfinished rotation.
- Primary evidence: `Apex rotation`.
- Different from: `delayed-rotation`, which is about reaching comparable heading later rather than never reaching it by apex.

### `delayed-rotation`

- Category: rotation
- Required telemetry: heading/GPS and line direction, with steering, speed, or line support.
- Key metrics: equivalent heading distance delta, final heading change delta, steering unwind, exit speed, and apex offset.
- Trigger logic: target reaches the reference apex heading materially later while final rotation is comparable, and a supporting cost is present.
- Primary evidence: `Rotation timing`.
- Different from: `under-rotated-at-apex`, which fires when the target is still under-rotated at apex or minimum speed.

### `minimum-speed-too-early-or-late`

- Category: rotation
- Required telemetry: speed from both laps.
- Key metrics: minimum-speed location delta, own-minimum speed delta, exit speed delta, and exit acceleration gain.
- Trigger logic: target minimum speed occurs materially earlier with over-slowing, or materially later with exit speed or acceleration cost.
- Primary evidence: `Minimum-speed location`.
- Different from: `over-slowing-entry`, which only diagnoses how slow the minimum speed is.

## Line And Path Rules

### `over-driving-entry`

- Category: line
- Required telemetry: speed and brake timing.
- Key metrics: entry speed delta, minimum speed delta, and brake start delta.
- Trigger logic: target arrives faster, then falls below reference minimum speed, without simply braking early.
- Primary evidence: `Entry speed`.
- Different from: `braking-too-late`, which directly compares brake start timing.

### `unused-track-on-entry-relative-to-reference`

- Category: line
- Required telemetry: GPS/heading-derived line usage and speed or steering support.
- Key metrics: entry lateral offset, inferred corner direction, minimum speed, and peak steering.
- Trigger logic: target starts farther inside than the reference and pays with speed loss or extra steering.
- Primary evidence: `Entry offset`.
- Different from: `missed-apex-relative-to-reference`, which checks the apex window.

### `missed-apex-relative-to-reference`

- Category: line
- Required telemetry: GPS/heading-derived line usage and speed, steering, or rotation support.
- Key metrics: apex lateral offset, minimum speed, peak steering, and apex heading delta.
- Trigger logic: target apex window stays farther outside than the reference and the corner shows a speed, steering, or rotation cost.
- Primary evidence: `Apex offset`.
- Different from: `late-apex`, which is about when apex evidence occurs.

### `late-apex`

- Category: line
- Required telemetry: apex metrics, direction-aware line metrics, and speed, steering, or throttle support.
- Key metrics: apex distance delta, exit speed, steering unwind, and full throttle timing.
- Trigger logic: target apex evidence arrives materially later than reference and the exit shows speed, unwind, or throttle cost.
- Primary evidence: `Apex timing`.
- Different from: `delayed-rotation`, which compares equivalent heading timing instead of apex candidate timing.

### `early-apex-pinched-exit`

- Category: line
- Required telemetry: apex metrics, direction-aware line metrics, and speed or steering support.
- Key metrics: apex distance delta, exit lateral offset, exit speed, and steering unwind.
- Trigger logic: target apex evidence arrives materially earlier and the exit is tighter, slower, or held on steering.
- Primary evidence: `Apex timing`.
- Different from: `pinched-exit-relative-to-reference`, which can fire without an early apex.

### `pinched-exit-relative-to-reference`

- Category: line
- Required telemetry: GPS/heading-derived line usage, speed, and throttle timing.
- Key metrics: exit lateral offset, exit speed, and full throttle delta.
- Trigger logic: target remains farther inside on exit and exits slower or reaches full throttle later.
- Primary evidence: `Exit offset`.
- Different from: `early-apex-pinched-exit`, which adds early-apex timing as the likely cause.

### `path-deviation-hotspot`

- Category: line
- Required telemetry: GPS path from both laps, direction-aware line usage, and speed or steering support.
- Key metrics: maximum path delta, path delta location, line offset, speed loss, and peak steering.
- Trigger logic: target's largest path separation exceeds the path threshold, direction-aware line evidence supports it, and the alternate path has speed or steering cost.
- Primary evidence: `Path delta`.
- Different from: `wide-without-benefit`, which specifically diagnoses a wider apex line without speed gain.

### `wide-without-benefit`

- Category: line
- Required telemetry: GPS/heading-derived line usage and speed.
- Key metrics: apex lateral offset, average speed, exit speed, and minimum speed.
- Trigger logic: target runs wider than reference at apex but does not gain speed and may lose minimum or exit speed.
- Primary evidence: `Apex offset`.
- Different from: `missed-apex-relative-to-reference`, which treats being outside at apex as a miss when it has a speed, steering, or rotation cost.

## Stability Rule

### `instability-correction`

- Category: stability
- Required telemetry: steering event detection from both laps.
- Key metrics: correction count delta.
- Trigger logic: target adds more steering corrections than the reference.
- Primary evidence: `Extra corrections`.
- Different from: steering-load rules, because it flags settling inputs rather than the load that may have caused them.

## Gearing Rules

### `wrong-gear-on-exit`

- Category: gearing
- Required telemetry: gear or RPM, with speed or RPM-backed cost support.
- Key metrics: exit gear delta, exit RPM delta, exit speed, and average speed.
- Trigger logic: target exit gear differs materially from reference and exit speed loss or RPM direction supports a cost. Delayed full throttle alone is treated as an exit symptom, not enough evidence for a gearing finding. Faster alternate strategies stay quiet.
- Primary evidence: `Exit gear`.
- Different from: `short-shift-costing-exit`, which focuses on taller/lower-RPM strategy with worse exit drive.

### `over-revving-without-speed-gain`

- Category: gearing
- Required telemetry: RPM and speed.
- Key metrics: average or exit RPM delta, average speed delta, and exit speed delta.
- Trigger logic: target runs materially higher RPM without an average-speed or exit-speed benefit.
- Primary evidence: `RPM delta`.
- Different from: `wrong-gear-on-exit`, which requires a material exit gear difference.

### `short-shift-costing-exit`

- Category: gearing
- Required telemetry: gear or RPM, speed, and speed-shape metrics when available.
- Key metrics: exit/average gear delta, exit/average RPM delta, exit speed, and exit acceleration gain.
- Trigger logic: target uses a taller or lower-RPM strategy while exit speed or acceleration build suffers.
- Primary evidence: `Exit RPM`.
- Different from: `over-revving-without-speed-gain`, which is the opposite RPM direction: extra RPM without speed return.

## Rule Linking

After rules run, findings are sorted by priority and linked when both sides are present. Links are cause/effect hints, not suppression. Examples include late braking feeding over-driving entry, coasting feeding delayed throttle, early apex feeding a pinched exit, mixed pedals feeding instability, path deviation feeding late unwind, and gearing symptoms feeding exit acceleration loss.
