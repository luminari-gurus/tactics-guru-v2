import { resolveAppEntry } from './routes';

/** Resolve once before one-shot entry requests are consumed by a game owner. */
export const appEntry = resolveAppEntry(location.pathname, location.search, import.meta.env.BASE_URL);
