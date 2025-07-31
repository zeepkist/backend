import { describe, expect, it } from 'bun:test';
import {
	calculateLevelPoints,
	clamp,
	levelScoreCompetitivenessMultiplier,
	levelScoreLengthMultiplier,
	levelScorePopularityModifier,
	levelScoreRatingModifier,
} from './calculateLevelPoints';

describe('clamp', () => {
	it('should clamp a value between min and max', () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(-5, 0, 10)).toBe(0);
		expect(clamp(15, 0, 10)).toBe(10);
		expect(clamp(5, 5, 10)).toBe(5);
		expect(clamp(5, 0, 5)).toBe(5);
	});

	it('should return NaN for non-numeric values', () => {
		expect(clamp(Number.NaN, 0, 10)).toBeNaN();
		expect(clamp(1, Number.NaN, 10)).toBeNaN();
		expect(clamp(1, 0, Number.NaN)).toBeNaN();
		expect(clamp(1, Number.NaN, Number.NaN)).toBeNaN();
		expect(clamp(Number.NaN, Number.NaN, Number.NaN)).toBeNaN();
		expect(clamp(Number.POSITIVE_INFINITY, 0, 10)).toBeNaN();
		expect(clamp(Number.NEGATIVE_INFINITY, 0, 10)).toBeNaN();
		// @ts-expect-error
		expect(clamp('5', 0, 10)).toBeNaN();
		// @ts-expect-error
		expect(clamp(true, 0, 10)).toBeNaN();
		// @ts-expect-error
		expect(clamp(false, 0, 10)).toBeNaN();
		// @ts-expect-error
		expect(clamp({}, 0, 10)).toBeNaN();
		// @ts-expect-error
		expect(clamp([], 0, 10)).toBeNaN();
		// @ts-expect-error
		expect(clamp(() => {}, 0, 10)).toBeNaN();
		// @ts-expect-error
		expect(clamp(Symbol(), 0, 10)).toBeNaN();
		// @ts-expect-error
		expect(clamp(BigInt(5), 0, 10)).toBeNaN();
	});
});

describe('levelScoreLengthMultiplier', () => {
	const testCases = [
		// Too short level durations
		{ input: 0, expected: 0.1 },
		{ input: 1, expected: 0.1 },
		{ input: 4, expected: 0.1 },
		{ input: 5, expected: 0.1 },
		{ input: 6, expected: 0.332379 },
		{ input: 8, expected: 0.5024922 },
		{ input: 10, expected: 0.6196152 },
		{ input: 15, expected: 0.8348469 },
		{ input: 19, expected: 0.9694826 },
		// Ideal level durations
		{ input: 20, expected: 1 },
		{ input: 30, expected: 1 },
		{ input: 40, expected: 1 },
		{ input: 50, expected: 1 },
		{ input: 60, expected: 1 },
		{ input: 61, expected: 1 },
		{ input: 70, expected: 1 },
		{ input: 75, expected: 1 },
		{ input: 80, expected: 0.8333333 },
		{ input: 90, expected: 0.7113249 },
		{ input: 120, expected: 0.5 },
		{ input: 180, expected: 0.5 },
		{ input: 300, expected: 0.5 },
	];

	for (const { input, expected } of testCases) {
		it(`should return ${expected} for WR time of ${input} seconds`, () => {
			const result = levelScoreLengthMultiplier(input);
			expect(result).toEqual(expected);
		});
	}
});

describe('levelScoreCompetitivenessMultiplier', () => {
	const testCases = [
		{
			name: 'A) Single top time — default multiplier',
			input: {
				wrTime: 30,
				topTimes: [30],
				personalBests: 1,
				totalRecords: 10,
			},
			expected: {
				modifier: 0.1,
				spreadScore: 0,
				tightnessScore: 0,
				easinessFactor: 0,
			},
		},
		{
			name: 'B) Very tight top 5 and dense leaderboard — low spread, competitive but not difficult',
			input: {
				wrTime: 30,
				topTimes: [
					30.0,
					30.001393,
					30.023092,
					30.092322,
					30.129403,
					30.2,
					30.25,
					30.3,
					30.35,
					30.4,
					...Array(40).fill(30.5),
				],
				personalBests: 50,
				totalRecords: 200,
			},
			expected: {
				modifier: 0.9457183,
				spreadScore: 0.9903665,
				tightnessScore: 0.9992213,
				easinessFactor: 0,
			},
		},
		{
			name: 'C) Spread leaderboard (easy WR, more difficult after top 5)',
			input: {
				wrTime: 30,
				topTimes: [
					30.0,
					30.4,
					31.0,
					31.5,
					32.123456,
					32.234567,
					33.0,
					34.0,
					35.0,
					36.0,
					...Array(40).fill(38.5),
				],
				personalBests: 50,
				totalRecords: 200,
			},
			expected: {
				modifier: 1.7240984,
				spreadScore: 0.8368292,
				tightnessScore: 0.9806667,
				easinessFactor: 1,
			},
		},
		{
			name: 'D) Massive spread, sparse PBs — likely grindy or unpopular',
			input: {
				wrTime: 30,
				topTimes: [
					30.0,
					31.0,
					32.5,
					35.0,
					38.0,
					40.0,
					42.0,
					45.0,
					48.0,
					50.0,
					...Array(40).fill(60.0),
				],
				personalBests: 5,
				totalRecords: 200,
			},
			expected: {
				modifier: 1.5741631,
				spreadScore: 0.5133244,
				tightnessScore: 0.9433333,
				easinessFactor: 1,
			},
		},
		{
			name: 'E) Moderate spread, high PB density — well-contested level',
			input: {
				wrTime: 30,
				topTimes: [
					30.0,
					30.3,
					30.6,
					30.9,
					31.2,
					31.5,
					31.8,
					32.1,
					32.4,
					32.7,
					...Array(40).fill(34.0),
				],
				personalBests: 50,
				totalRecords: 100,
			},
			expected: {
				modifier: 1.7636703,
				spreadScore: 0.9256757,
				tightnessScore: 0.988,
				easinessFactor: 1,
			},
		},
		{
			name: 'F) Flat top 50 — no spread, very easy level',
			input: {
				wrTime: 30,
				topTimes: Array(50).fill(30.1), // all 30.1
				personalBests: 50,
				totalRecords: 500,
			},
			expected: {
				modifier: 0.948427,
				spreadScore: 0.9997341,
				tightnessScore: 0.9973333,
				easinessFactor: 0,
			},
		},
		{
			name: 'G) Wide top 50, loose top 5, sparse PBs — difficult but grindy',
			input: {
				wrTime: 30,
				topTimes: [
					30.0,
					32.0,
					35.0,
					38.0,
					40.0,
					41.0,
					42.0,
					43.0,
					44.0,
					45.0,
					...Array(40).fill(60.0),
				],
				personalBests: 5,
				totalRecords: 500,
			},
			expected: {
				modifier: 1.5562,
				spreadScore: 0.528,
				tightnessScore: 0.9,
				easinessFactor: 1,
			},
		},
		{
			name: 'H) Extremely tight top 5, slightly spread top 10, moderate spread top 50 — highly competitive',
			input: {
				wrTime: 30.0,
				topTimes: [
					30.0,
					30.000381,
					30.001024,
					30.001768,
					30.002491,
					30.004,
					30.0065,
					30.01,
					30.015,
					30.02,
					...Array.from({ length: 40 }, (_, i) => 30.02 + (i + 1) * 0.005), // +5ms steps
				],
				personalBests: 50,
				totalRecords: 200,
			},
			expected: {
				modifier: 0.9487791,
				spreadScore: 0.9969769,
				tightnessScore: 0.9999788,
				easinessFactor: 0,
			},
		},
		{
			name: 'I) Extremely tight top 5, moderate leaderboard spread, sparse PBs — very grindy',
			input: {
				wrTime: 30.0,
				topTimes: [
					30.0,
					30.0002,
					30.00045,
					30.00081,
					30.0011,
					30.003,
					30.006,
					30.01,
					30.02,
					30.03,
					...Array.from({ length: 40 }, (_, i) => 30.03 + (i + 1) * 0.005),
				],
				personalBests: 5,
				totalRecords: 200,
			},
			expected: {
				modifier: 0.9486792,
				spreadScore: 0.9967113,
				tightnessScore: 0.9999903,
				easinessFactor: 0,
			},
		},
		{
			name: 'J) Uniform 200ms spread from WR to 50th — tight overall leaderboard',
			input: {
				wrTime: 30.0,
				topTimes: Array.from({ length: 50 }, (_, i) => 30.0 + i * 0.004), // 0.004s (4ms) steps = 200ms spread
				personalBests: 50,
				totalRecords: 200,
			},
			expected: {
				modifier: 0.9488501,
				spreadScore: 0.9973453,
				tightnessScore: 0.99984,
				easinessFactor: 0,
			},
		},
		{
			name: 'REAL 1) 30 Second AFK Level (All times practically identical)',
			input: {
				wrTime: 30.454699,
				topTimes: [
					30.454699, 30.454699, 30.454699, 30.454699, 30.454699, 30.454699, 30.454699,
					30.454699, 30.454699, 30.454699, 30.454699, 30.454699,
				],
				personalBests: 12,
				totalRecords: 26,
			},
			expected: {
				modifier: 0.95,
				spreadScore: 1,
				tightnessScore: 1,
				easinessFactor: 0,
			},
		},
	];

	for (const { name, input, expected } of testCases) {
		it(name, () => {
			const result = levelScoreCompetitivenessMultiplier(input.wrTime, [
				input.wrTime,
				...input.topTimes,
			]);
			expect(result).toEqual(expected);
		});
	}
});

describe('levelScoreRatingModifier', () => {
	const ratings = {
		0.0: 0.6,
		0.05: 0.64,
		0.1: 0.68,
		0.15: 0.72,
		0.2: 0.76,
		0.25: 0.8,
		0.3: 0.84,
		0.35: 0.88,
		0.4: 0.92,
		0.45: 0.96,
		0.5: 1,
		0.55: 1.04,
		0.6: 1.08,
		0.65: 1.12,
		0.7: 1.16,
		0.75: 1.2,
		0.8: 1.24,
		0.85: 1.28,
		0.9: 1.32,
		0.95: 1.36,
		1.0: 1.4,
	};

	for (const [rating, expected] of Object.entries(ratings)) {
		it(`should return ${expected} for rating ${rating}`, () => {
			const result = levelScoreRatingModifier(Number(rating));
			expect(result).toEqual(expected);
		});
	}
});

describe('levelScorePopularityModifier', () => {
	const testCases = [
		{ personalBests: 0, expected: 0.7 },
		{ personalBests: 1, expected: 0.7 },
		{ personalBests: 5, expected: 0.8414214 },
		{ personalBests: 10, expected: 0.9 },
		{ personalBests: 50, expected: 1.1472136 },
		{ personalBests: 100, expected: 1.3 },
		{ personalBests: 250, expected: 1.3 },
		{ personalBests: 400, expected: 1.3 },
		{ personalBests: 450, expected: 1.3 },
		{ personalBests: 499, expected: 1.3 },
		{ personalBests: 500, expected: 1.3 },
		{ personalBests: 750, expected: 1.3 },
		{ personalBests: 1000, expected: 1.3 },
	];

	for (const { personalBests, expected } of testCases) {
		it(`should return ${expected} for ${personalBests} personal bests`, () => {
			const result = levelScorePopularityModifier(personalBests, 30);
			expect(result).toEqual(expected);
		});
	}
});

describe('calculateLevelPoints', () => {
	it('should return 0 points for no records', () => {
		const result = calculateLevelPoints({
			topTimes: [],
			personalBests: 0,
			rating: 0,
			personalBestCountPercentile: 30,
		});
		expect(result).toEqual({
			points: 0,
			modifiers: {
				lengthModifier: 0,
				competitivenessModifier: 0,
				ratingModifier: 0,
				popularityModifier: 0,
				cutPenalty: 0,
			},
		});
	});

	it('should set competitive modifier to minimum with not enough PBs', () => {
		const result = calculateLevelPoints({
			topTimes: [30, 31, 32, 33, 34],
			personalBests: 10,
			rating: 0.5,
			personalBestCountPercentile: 30,
		});
		expect(result).toEqual({
			points: 226,
			modifiers: {
				lengthModifier: 1,
				competitivenessModifier: 0.1,
				ratingModifier: 1,
				popularityModifier: 0.9,
				cutPenalty: 1,
			},
		});
	});

	it('should calculate points correctly', () => {
		const result = calculateLevelPoints({
			topTimes: [30, 31, 32, 33, 34, 35],
			personalBests: 10,
			rating: 0.5,
			personalBestCountPercentile: 30,
		});
		expect(result).toEqual({
			points: 3968,
			modifiers: {
				lengthModifier: 1,
				competitivenessModifier: 1.7633333,
				ratingModifier: 1,
				popularityModifier: 0.9,
				cutPenalty: 1,
			},
		});
	});

	it('should calculate points correctly for levels with 5 or fewer PBs', () => {
		const result = calculateLevelPoints({
			topTimes: [30, 31, 32, 33, 34],
			personalBests: 10,
			rating: 0.86,
			personalBestCountPercentile: 30,
		});
		expect(result).toEqual({
			points: 290,
			modifiers: {
				lengthModifier: 1,
				competitivenessModifier: 0.1,
				ratingModifier: 1.288,
				popularityModifier: 0.9,
				cutPenalty: 1,
			},
		});
	});
});
