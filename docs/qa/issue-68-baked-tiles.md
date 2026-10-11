# Issue #68 baked tile experiment

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/68. Caller dubstylee approved plan 523e50e on 2026-10-11; approval recorded in 3f647bd. Branch work/issue-68-baked-tiles. Implementation and evidence collection are in progress; no adoption decision yet.

## Baseline

Exact merged main e955e9d9f182a76f057ea69057c7a1ac6c0bd682, clean production build. Corrected #65 v3 collector produced 18 battle and 18 proof samples with no capture failures or errors. Raw captures: [battle](issue-68/baseline-battle.json), [proof](issue-68/baseline-proof.json). Cold/warm, three repetitions of Desktop Chrome and Pixel 7 portrait/landscape; unchanged legal selection/pan/zoom/move workload and startup movement before controls usability. Host/browser/build/resources/seed conditions are retained in raw captures.

Task-specific [profiler](issue-68/profile.mjs) retains WebGL calls and level-zero nominal RGBA texture bytes, CPU profiles, GPU trace categories, fitted/overlay/movement/max-zoom screenshots and six restarts per profile. Isolated GPU elapsed timing is unavailable; model and renderer limits are captured. Offscreen canvas draw-operation time is a lower-bound generation cost that excludes orchestration and driver work. Instrumentation is outside uninstrumented v3 measurements.

Prototype, resource comparison, visual review, acceptance disposition and final validation results will be added after measurement.
