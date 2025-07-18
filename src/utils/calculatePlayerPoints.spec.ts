import { describe, expect, it } from 'bun:test';
import { calculatePlayerPoints, calculatePlayerPointsDecayed } from './calculatePlayerPoints';

describe('calculatePlayerPointsDecayed', () => {
	describe('should calculate decayed points correctly (0.95 decay factor)', () => {
		const decayFactor = 0.95;

		const testCases = [
			{ points: 0, position: 1, expected: 0 },
			{ points: 0, position: 10, expected: 0 },
			{ points: 1000, position: 1, expected: 1000 },
			{ points: 1000, position: 2, expected: 950 },
			{ points: 1000, position: 3, expected: 902.5 },
			{ points: 1000, position: 10, expected: 630.2494097246093 },
			{ points: 1000, position: 50, expected: 80.99471081759295 },
			{ points: 1000, position: 100, expected: 6.232136021404232 },
			{ points: 1000, position: 150, expected: 0.4795315520880631 },
			{ points: 1000, position: 250, expected: 0.0028390805662095024 },
			{ points: 1000, position: 500, expected: 7.657359538357046e-9 },
			{ points: 1000, position: 750, expected: 2.0652867621137033e-14 },
			{ points: 10_000, position: 1, expected: 10000 },
			{ points: 10_000, position: 10, expected: 6302.494097246093 },
			{ points: 10_000, position: 100, expected: 62.321360214042315 },
			{ points: 10_000, position: 1000, expected: 5.570339734468424e-19 },
			{ points: 10_000, position: 10000, expected: 1.8127139760926918e-219 },
		];

		for (const { points, position, expected } of testCases) {
			it(`Given ${points}pts at position ${position}, returns ${expected}`, () => {
				const result = calculatePlayerPointsDecayed(points, position, decayFactor);
				expect(result).toBe(expected);
			});
		}
	});
	describe('should calculate decayed points correctly (0.995 decay factor)', () => {
		const decayFactor = 0.995;

		const testCases = [
			{ points: 0, position: 1, expected: 0 },
			{ points: 0, position: 10, expected: 0 },
			{ points: 1000, position: 1, expected: 1000 },
			{ points: 1000, position: 2, expected: 995 },
			{ points: 1000, position: 3, expected: 990.0250000000001 },
			{ points: 1000, position: 10, expected: 955.8895783575597 },
			{ points: 1000, position: 50, expected: 782.2236754458717 },
			{ points: 1000, position: 100, expected: 608.8145090359083 },
			{ points: 1000, position: 150, expected: 473.8479773082279 },
			{ points: 1000, position: 250, expected: 287.04309604425407 },
			{ points: 1000, position: 500, expected: 81.9817702917375 },
			{ points: 1000, position: 750, expected: 23.41463965791055 },
			{ points: 10_000, position: 1, expected: 10000 },
			{ points: 10_000, position: 10, expected: 9558.895783575597 },
			{ points: 10_000, position: 100, expected: 6088.145090359083 },
			{ points: 10_000, position: 1000, expected: 66.87405606866382 },
			{ points: 10_000, position: 10000, expected: 1.709953799391181e-18 },
		];

		for (const { points, position, expected } of testCases) {
			it(`Given ${points}pts at position ${position}, returns ${expected}`, () => {
				const result = calculatePlayerPointsDecayed(points, position, decayFactor);
				expect(result).toBe(expected);
			});
		}
	});

	it('should return 0 for invalid inputs', () => {
		const testCases = [
			{ points: -1, position: 1 },
			{ points: 100, position: 0 },
			{ points: 100, position: -1 },
			{ points: Number.NaN, position: 1 },
			{ points: Number.NaN, position: 0 },
			{ points: Number.NaN, position: -1 },
		];

		for (const decayFactor of [0.95, 0.995]) {
			for (const { points, position } of testCases) {
				it(`Given ${points} at position ${position}, returns 0`, () => {
					const result = calculatePlayerPointsDecayed(points, position, decayFactor);
					expect(result).toBe(0);
				});
			}
		}
	});
});

describe('calculatePlayerPoints', () => {
	it('should calculate points correctly', () => {
		const personalBests = [
			{ idLevel: 1, levelPoints: 1000, position: BigInt(1) },
			{ idLevel: 2, levelPoints: 750, position: BigInt(2) },
			{ idLevel: 3, levelPoints: 600, position: BigInt(3) },
		];

		const result = calculatePlayerPoints(personalBests);
		expect(result.points).toBe(2245);
		expect(result.totalPoints).toBe(2340);
	});

	it('should make nth personal best worth less, even if they have the same base value (1st)', () => {
		const personalBests = [
			{ idLevel: 1, levelPoints: 1000, position: BigInt(1) },
			{ idLevel: 2, levelPoints: 1000, position: BigInt(1) },
			{ idLevel: 3, levelPoints: 1000, position: BigInt(1) },
		];

		const result = calculatePlayerPoints(personalBests);
		expect(result.points).toBe(2853);
		expect(result.totalPoints).toBe(3000);
	});

	it('should make nth personal best worth less, even if they have the same base value (100th)', () => {
		const personalBests = [
			{ idLevel: 1, levelPoints: 1000, position: BigInt(100) },
			{ idLevel: 2, levelPoints: 1000, position: BigInt(100) },
			{ idLevel: 3, levelPoints: 1000, position: BigInt(100) },
		];

		const result = calculatePlayerPoints(personalBests);
		expect(result.points).toBe(1737);
		expect(result.totalPoints).toBe(1826);
	});

	it('should sort personal bests by most valuable', () => {
		const personalBests = [
			{ idLevel: 1, levelPoints: 100, position: BigInt(25) },
			{ idLevel: 2, levelPoints: 4000, position: BigInt(80) },
			{ idLevel: 3, levelPoints: 3000, position: BigInt(2) },
		];

		const result = calculatePlayerPoints(personalBests);
		expect(result.points).toBe(5622);
		expect(result.totalPoints).toBe(5766);
	});

	it('should handle empty personal bests', () => {
		const personalBests: never[] = [];
		const result = calculatePlayerPoints(personalBests);
		expect(result.points).toBe(0);
		expect(result.totalPoints).toBe(0);
	});

	it('should handle invalid inputs', () => {
		const personalBests = [
			{ idLevel: 1, levelPoints: 100, position: BigInt(-1) },
			{ idLevel: 2, levelPoints: 0, position: BigInt(2) },
			{ idLevel: 3, levelPoints: Number.NaN, position: BigInt(3) },
		];

		const result = calculatePlayerPoints(personalBests);
		expect(result.points).toBe(0);
		expect(result.totalPoints).toBe(0);
	});
});
