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
		{ input: 6, expected: 0.332379000772445 },
		{ input: 8, expected: 0.5024922359499622 },
		{ input: 10, expected: 0.6196152422706631 },
		{ input: 15, expected: 0.8348469228349534 },
		{ input: 19, expected: 0.9694826047713663 },
		// Ideal level durations
		{ input: 20, expected: 1 },
		{ input: 30, expected: 1 },
		{ input: 40, expected: 1 },
		{ input: 50, expected: 1 },
		{ input: 60, expected: 1 },
		{ input: 61, expected: 1 },
		{ input: 70, expected: 1 },
		{ input: 75, expected: 1 },
		{ input: 80, expected: 0.8333333333333334 },
		{ input: 90, expected: 0.7113248654051871 },
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
			expected: 0.25,
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
			expected: 1.7487909015961047, // approx: tight and low spread = lower multiplier
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
			expected: 1.7933351658451604, // higher spread, more room to compete
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
			expected: 1.820298449249771, // large spread helps, grindiness slightly penalizes
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
			expected: 1.8284251637838027,
		},
		{
			name: 'F) Flat top 50 — no spread, very easy level',
			input: {
				wrTime: 30,
				topTimes: Array(50).fill(30.1), // all 30.1
				personalBests: 50,
				totalRecords: 500,
			},
			expected: 1.7016131979231015, // extremely tight/flat, very low multiplier
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
			expected: 1.7961431124900775,
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
			expected: 1.7468594656374874, // expected based on very competitive top, some dropoff
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
			expected: 1.6794775531337063, // tight top offset by grindiness
		},
		{
			name: 'J) Uniform 200ms spread from WR to 50th — tight overall leaderboard',
			input: {
				wrTime: 30.0,
				topTimes: Array.from({ length: 50 }, (_, i) => 30.0 + i * 0.004), // 0.004s (4ms) steps = 200ms spread
				personalBests: 50,
				totalRecords: 200,
			},
			expected: 1.7466920669382755, // flat spread with tight steps, likely a slightly lower multiplier
		},
	];

	for (const { name, input, expected } of testCases) {
		it(name, () => {
			const result = levelScoreCompetitivenessMultiplier(
				input.wrTime,
				[input.wrTime, ...input.topTimes],
				input.personalBests,
				input.totalRecords,
			);
			expect(result.modifier).toEqual(expected);
		});
	}
});

describe('levelScoreRatingModifier', () => {
	const ratings = {
		0.00: 0.7,
		0.05: 0.73,
		0.10: 0.76,
		0.15: 0.7899999999999999,
		0.20: 0.82,
		0.25: 0.85,
		0.30: 0.88,
		0.35: 0.9099999999999999,
		0.40: 0.94,
		0.45: 0.97,
		0.50: 1,
		0.55: 1.03,
		0.60: 1.06,
		0.65: 1.09,
		0.70: 1.12,
		0.75: 1.15,
		0.80: 1.1800000000000002,
		0.85: 1.21,
		0.90: 1.2400000000000002,
		0.95: 1.27,
		1.00: 1.3,
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
		{ personalBests: 5, expected: 0.8732050807568877 },
		{ personalBests: 10, expected: 0.9449489742783178 },
		{ personalBests: 50, expected: 1.247722557505166 },
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
			totalRecords: 0,
			rating: 0,
			personalBestCountPercentile: 30
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
			totalRecords: 100,
			rating: 0.5,
			personalBestCountPercentile: 30
		});
		expect(result).toEqual({
			points: 572,
			modifiers: {
				lengthModifier: 1,
				competitivenessModifier: 0.25,
				ratingModifier: 1,
				popularityModifier: 0.9449489742783178,
				cutPenalty: 0.96875,
			},
		});
	});

	it('should calculate points correctly', () => {
		const result = calculateLevelPoints({
			topTimes: [30, 31, 32, 33, 34, 35],
			personalBests: 10,
			totalRecords: 100,
			rating: 0.5,
			personalBestCountPercentile: 30
		});
		expect(result).toEqual({
			points: 3790,
			modifiers: {
				lengthModifier: 1,
				competitivenessModifier: 1.6804054611334704,
				ratingModifier: 1,
				popularityModifier: 0.9449489742783178,
				cutPenalty: 0.9545454545454546,
			},
		});
	});

	it('should calculate points correctly 2', () => {
		const result = calculateLevelPoints({
			topTimes: [30, 31, 32, 33, 34],
			personalBests: 10,
			totalRecords: 100,
			rating: 0.86,
			personalBestCountPercentile: 30
		});
		expect(result).toEqual({
			points: 696,
			modifiers: {
				lengthModifier: 1,
				competitivenessModifier: 0.25,
				ratingModifier: 1.216,
				popularityModifier: 0.9449489742783178,
				cutPenalty: 0.96875,
			},
		});
	});
});
