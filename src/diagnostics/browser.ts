import { FitMeasurements } from './measurements';

export interface BoardDiagnostics {
  transform: { x: number; y: number; scale: number };
  selected: { x: number; y: number; elevation: number } | null;
  tileCount: number;
  elevations: number[];
  scale: number;
  bounds: { left: number; top: number; right: number; bottom: number };
}
export interface ProofDiagnostics { fixture: string; relation: 'behind' | 'front'; propElevation: number; heroTile: { x: number; y: number; elevation: number }; heroPosition: { x: number; y: number }; heroDepth: number; propDepth: number; propAlpha: number; assetCount: number; objectCount: number; surfaceCornerError: number | null; }
let proof: ProofDiagnostics | null = null;
export function setProofDiagnostics(value: ProofDiagnostics | null): void { proof = value; }
let board: BoardDiagnostics | null = null;
export function setBoardDiagnostics(value: BoardDiagnostics | null): void { board = value; }

export const measurements = new FitMeasurements();
export const FIT_MARKS = ['fit:scene-start', 'fit:scene-ready', 'fit:controls-usable'] as const;

export function diagnosticsSnapshot() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const sizes = [navigation, ...resources].filter((entry): entry is PerformanceResourceTiming => Boolean(entry)).map(entry => ({
    url: entry.name,
    transferBytes: entry.transferSize,
    encodedBodyBytes: entry.encodedBodySize,
    decodedBodyBytes: entry.decodedBodySize,
    durationMs: entry.duration,
  }));
  return {
    ...measurements.snapshot(),
    board: board ? { ...board, elevations: [...board.elevations], bounds: { ...board.bounds } } : null,
    proof: proof ? { ...proof } : null,
    capturedAt: new Date().toISOString(),
    build: __BUILD_INFO__,
    userAgent: navigator.userAgent,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    visibility: document.visibilityState,
    navigationType: navigation?.type ?? null,
    sampleLimit: 600,
    resources: sizes,
    totalTransferBytes: sizes.reduce((sum, entry) => sum + entry.transferBytes, 0),
  };
}

declare global {
  const __BUILD_INFO__: { commit: string; dirty: boolean };
  interface Window { fitDiagnostics: typeof diagnosticsSnapshot; }
}
