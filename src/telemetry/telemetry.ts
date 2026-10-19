/** Application-only telemetry. No domain imports, save payloads, or gameplay RNG. */
export const events = ['app_entered', 'battle_started', 'battle_continued', 'battle_outcome', 'run_started',
  'run_continued', 'encounter_started', 'encounter_outcome', 'reward_chosen', 'run_outcome', 'save_recovery_failed'] as const;
export type TelemetryEvent = typeof events[number];
export type Failure = 'application_load' | 'scene_load' | 'battle_resolution' | 'encounter_start' | 'run_boundary' | 'save_read' | 'save_write' | 'save_remove' | 'save_reset' | 'runtime_error' | 'unhandled_rejection' | 'verification';
export interface Context { visibility?: 'visible' | 'hidden'; route?: 'battle' | 'run' | 'map'; phase?: 'entry' | 'player' | 'enemy' | 'presenting' | 'ended' | 'error' | 'disposed' | 'battle' | 'reward' | 'victory' | 'defeat'; encounter?: number }
export interface Properties extends Context { outcome?: 'victory' | 'defeat'; choice?: 'healing_draught' | 'warding_charm' | 'aiming_charm'; operation?: 'read' | 'write' | 'remove' | 'reset' }
export interface Sink { event(name: TelemetryEvent, properties: Properties, boundary?: string): void; error(error: unknown, failure: Failure, context: Context): void }
let sink: Sink | undefined;
let context: Context = {};
export function setTelemetryContext(value: Context) { context = { ...context, ...value }; }
export function telemetryContext(): Context { return { ...context }; }
export function bindTelemetry(value?: Sink) { sink = value; }
export function track(name: TelemetryEvent, properties: Properties = {}, boundary?: string) {
  try { sink?.event(name, properties, boundary); } catch { /* Telemetry never owns gameplay. */ }
}
export function reportFailure(failure: Failure, context: Context = {}, error?: unknown) {
  try { sink?.error(error, failure, context); } catch { /* Do not report a reporting failure. */ }
}
