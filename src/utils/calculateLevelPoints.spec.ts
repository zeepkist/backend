import { describe, it, expect } from 'bun:test';
import { clamp, levelScoreDurationMultiplier, levelScoreCompetitivenessMultiplier, levelScoreRatingModifier, levelScorePopularityModifier, calculateLevelPoints } from './calculateLevelPoints';

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

describe('levelScoreDurationMultiplier', () => {
	it('should return the correct duration multiplier', () => {
		// Too short level durations
		expect(levelScoreDurationMultiplier(0)).toBe(0.1);
		expect(levelScoreDurationMultiplier(1)).toBe(0.1);
		expect(levelScoreDurationMultiplier(4)).toBe(0.1);

		expect(levelScoreDurationMultiplier(5)).toBe(0.1);
		expect(levelScoreDurationMultiplier(6)).toBe(0.16);
		expect(levelScoreDurationMultiplier(8)).toBe(0.28);
		expect(levelScoreDurationMultiplier(10)).toBe(0.4);
		expect(levelScoreDurationMultiplier(15)).toBe(0.7);
		expect(levelScoreDurationMultiplier(19)).toBe(0.9);

		// Ideal level durations
		expect(levelScoreDurationMultiplier(20)).toBe(1);
		expect(levelScoreDurationMultiplier(30)).toBe(1);
		expect(levelScoreDurationMultiplier(40)).toBe(1);
		expect(levelScoreDurationMultiplier(50)).toBe(1);
		expect(levelScoreDurationMultiplier(60)).toBe(1);

		// Too long level durations
		expect(levelScoreDurationMultiplier(61)).toBe(0.99);
		expect(levelScoreDurationMultiplier(70)).toBe(0.9);
		expect(levelScoreDurationMultiplier(80)).toBe(0.8);
		expect(levelScoreDurationMultiplier(90)).toBe(0.7);
		expect(levelScoreDurationMultiplier(120)).toBe(0.4);
		expect(levelScoreDurationMultiplier(180)).toBe(0.1);
		expect(levelScoreDurationMultiplier(300)).toBe(0.1);
	});
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
			expected: 1.0,
		},
		{
			name: 'B) Very tight top 5 and dense leaderboard — low spread, competitive but not difficult',
			input: {
				wrTime: 30,
				topTimes: [
					30.000000, 30.001393, 30.023092, 30.092322, 30.129403,
					30.200000, 30.250000, 30.300000, 30.350000, 30.400000,
					...Array(40).fill(30.5),
				],
				personalBests: 50,
				totalRecords: 200,
			},
			expected: 0.9590683537880974, // approx: tight and low spread = lower multiplier
		},
		{
			name: 'C) Spread leaderboard (easy WR, more difficult after top 5)',
			input: {
				wrTime: 30,
				topTimes: [
					30.000000, 30.400000, 31.000000, 31.500000, 32.123456,
					32.234567, 33.000000, 34.000000, 35.000000, 36.000000,
					...Array(40).fill(38.5),
				],
				personalBests: 50,
				totalRecords: 200,
			},
			expected: 1.0152469395397634, // higher spread, more room to compete
		},
		{
			name: 'D) Massive spread, sparse PBs — likely grindy or unpopular',
			input: {
				wrTime: 30,
				topTimes: [
					30.000000, 31.000000, 32.500000, 35.000000, 38.000000,
					40.000000, 42.000000, 45.000000, 48.000000, 50.000000,
					...Array(40).fill(60.0),
				],
				personalBests: 5,
				totalRecords: 200,
			},
			expected: 1.3533322258627296, // large spread helps, grindiness slightly penalizes
		},
		{
			name: 'E) Moderate spread, high PB density — well-contested level',
			input: {
				wrTime: 30,
				topTimes: [
					30.000000, 30.300000, 30.600000, 30.900000, 31.200000,
					31.500000, 31.800000, 32.100000, 32.400000, 32.700000,
					...Array(40).fill(34.0),
				],
				personalBests: 50,
				totalRecords: 100,
			},
			expected: 0.8549820836030767,
		},
		{
			name: 'F) Flat top 50 — no spread, very easy level',
			input: {
				wrTime: 30,
				topTimes: Array(50).fill(30.1), // all 30.1
				personalBests: 50,
				totalRecords: 500,
			},
			expected: 1.091036528456901, // extremely tight/flat, very low multiplier
		},
		{
			name: 'G) Wide top 50, loose top 5, sparse PBs — difficult but grindy',
			input: {
				wrTime: 30,
				topTimes: [
					30.000000, 32.000000, 35.000000, 38.000000, 40.000000,
					41.000000, 42.000000, 43.000000, 44.000000, 45.000000,
					...Array(40).fill(60.0),
				],
				personalBests: 5,
				totalRecords: 500,
			},
			expected: 1.4088319200257584,
		},
		{
			name: 'H) Extremely tight top 5, slightly spread top 10, moderate spread top 50 — highly competitive',
			input: {
				wrTime: 30.000000,
				topTimes: [
					30.000000,
					30.000381,
					30.001024,
					30.001768,
					30.002491,
					30.004000,
					30.006500,
					30.010000,
					30.015000,
					30.020000,
					...Array.from({ length: 40 }, (_, i) => 30.020000 + (i + 1) * 0.005), // +5ms steps
				],
				personalBests: 50,
				totalRecords: 200,
			},
			expected: 0.956435908991944, // expected based on very competitive top, some dropoff
		},
		{
			name: 'I) Extremely tight top 5, moderate leaderboard spread, sparse PBs — very grindy',
			input: {
				wrTime: 30.000000,
				topTimes: [
					30.000000,
					30.000200,
					30.000450,
					30.000810,
					30.001100,
					30.003000,
					30.006000,
					30.010000,
					30.020000,
					30.030000,
					...Array.from({ length: 40 }, (_, i) => 30.030000 + (i + 1) * 0.005),
				],
				personalBests: 5,
				totalRecords: 200,
			},
			expected: 1.2004381719054313, // tight top offset by grindiness
		},
		{
			name: 'J) Uniform 200ms spread from WR to 50th — tight overall leaderboard',
			input: {
				wrTime: 30.000000,
				topTimes: Array.from({ length: 50 }, (_, i) => 30.000000 + i * 0.004), // 0.004s (4ms) steps = 200ms spread
				personalBests: 50,
				totalRecords: 200,
			},
			expected: 0.9563865452863075, // flat spread with tight steps, likely a slightly lower multiplier
		},
		{
			name: 'K) Top 5 within microseconds, rest flat — extremely easy leaderboard',
			input: {
				wrTime: 30.000000,
				topTimes: [
					30.000000,
					30.000001,
					30.000002,
					30.000003,
					30.000004,
					...Array(45).fill(30.000010),
				],
				personalBests: 50,
				totalRecords: 300,
			},
			expected: 1.0209273843647828, // very flat = likely near lower bound
		},
	]

	for (const { name, input, expected } of testCases) {
		it(name, () => {
			const result = levelScoreCompetitivenessMultiplier(
				input.wrTime,
				input.topTimes,
				input.personalBests,
				input.totalRecords,
			);
			expect(result).toEqual(expected);
		});
	}
});

describe('levelScoreRatingModifier', () => {
	const ratings = {
		0: 0.5,
		5: 0.54,
		10: 0.5800000000000001,
		15: 0.62,
		20: 0.66,
		25: 0.7,
		30: 0.74,
		35: 0.78,
		40: 0.8200000000000001,
		45: 0.8600000000000001,
		50: 0.9,
		55: 0.9400000000000001,
		60: 0.98,
		65: 1.02,
		70: 1.06,
		75: 1.1,
		80: 1.1400000000000001,
		85: 1.1800000000000002,
		90: 1.2200000000000002,
		95: 1.26,
		100: 1.3,
	}

	for (const [rating, expected] of Object.entries(ratings)) {
		it(`should return ${expected} for rating ${rating}`, () => {
			const result = levelScoreRatingModifier(Number(rating));
			expect(result).toEqual(expected);
		});
	};
});

describe('levelScorePopularityModifier', () => {
	const testCases = [
		{ personalBests: 0, expected: 0.9 },
		{ personalBests: 1, expected: 0.9 },
		{ personalBests: 5, expected: 0.9088176352705412 },
		{ personalBests: 10, expected: 0.9198396793587175 },
		{ personalBests: 50, expected: 1.0080160320641283 },
		{ personalBests: 100, expected: 1.1182364729458918 },
		{ personalBests: 250, expected: 1.4488977955911824 },
		{ personalBests: 500, expected: 2 },
		{ personalBests: 750, expected: 2 },
		{ personalBests: 1000, expected: 2 },
	];

	for (const { personalBests, expected } of testCases) {
		it(`should return ${expected} for ${personalBests} personal bests`, () => {
			const result = levelScorePopularityModifier(personalBests);
			expect(result).toEqual(expected);
		});
	}
});

describe('calculateLevelPoints', () => {
	it('should return 0 points for no records', () => {
		const result = calculateLevelPoints({
			topTimes: [],
			personalBests: 0,
			totalRecords: 0,
			levelRating: 0,
		});
		expect(result).toEqual({
			points: 0,
			contributions: {
				duration: 0,
				competitiveness: 0,
				rating: 0,
				popularity: 0,
			},
		});
	});

	it('should calculate points correctly', () => {
		const result = calculateLevelPoints({
			topTimes: [30, 31, 32, 33, 34],
			personalBests: 10,
			totalRecords: 100,
			levelRating: 50,
		});
		expect(result).toEqual({
			points: 927,
			contributions: {
				duration: 1,
				competitiveness: 1.1195365284569014,
				rating: 0.9,
				popularity: 0.9198396793587175,
			},
		});
	});


	it('should calculate points correctly 2', () => {
		const result = calculateLevelPoints({
			topTimes: [30, 31, 32, 33, 34],
			personalBests: 10,
			totalRecords: 100,
			levelRating: 86,
		});
		expect(result).toEqual({
			points: 1223,
			contributions: {
				duration: 1,
				competitiveness: 1.1195365284569014,
				rating: 1.1880000000000002,
				popularity: 0.9198396793587175,
			},
		});
	});
});
