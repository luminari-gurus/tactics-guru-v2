## 1. Reproduction and repair

- [x] 1.1 Retain the two matched CI run references and reproduce on the untouched production build. Record case IDs, actual hit targets or bounds and first-attempt outcomes.
- [x] 1.2 Verify an exposed enemy can replace a prepared move with visible invalid-target feedback. Cover invalid and valid Rail switching in the existing Chromium and WebKit scenarios.
- [x] 1.3 Fix the responsible layout so both picking stages show the existing Cancel plan control in bounds. Verify reachability, touch and keyboard cancellation, and unchanged battle state and replay.
- [x] 1.4 Exercise a real board-edge crossing at a fixed viewport. Verify the radial follows it without losing the pending move and that true viewport resize still dismisses the appropriate gestures.

## 2. Integration and delivery

- [x] 2.1 Run the original scenarios on the final production build with one worker and zero retries. Run adjacent profile witnesses, affected battle entry consumers, and `npm run verify:pr` as mapped in the implementation plan.
- [x] 2.2 Record the final evidence and remaining limitations in the plan and validate the OpenSpec change in strict mode.

## Workflow follow-up

- Publish the focused fix for review and share the focused verification result on #208.
