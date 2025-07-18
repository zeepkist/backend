type CacheEntry<T> = {
	value: T;
	expiresAt: number;
};

// biome-ignore lint/suspicious/noExplicitAny: General purpose cache, so using `any` is acceptable here
const STATE: Record<string, CacheEntry<any>> = {};

export const CACHE_KEY = {
	// Cache key for personal best percentile
	personalBestPercentile: 'personalBestPercentile',
} as const;

export const CACHE_TTL_MS = {
	[CACHE_KEY.personalBestPercentile]: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getState = <T>(key: string): T | null => {
	const entry = STATE[key];
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		delete STATE[key];
		return null;
	}
	return entry.value as T;
};

export const setState = <T>(key: string, value: T, ttlMs: number = DEFAULT_CACHE_TTL_MS) => {
	if (value === undefined || value === null) {
		delete STATE[key];
	} else {
		STATE[key] = {
			value,
			expiresAt: Date.now() + ttlMs,
		};
	}
};

export const getCacheExpiration = (key: string): number | null => {
	const entry = STATE[key];
	return entry ? entry.expiresAt : null;
};
