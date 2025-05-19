import { describe, it, expect } from 'bun:test';
import { calculatePlayerPointsDecayed, calculatePlayerPoints } from './calculatePlayerPoints';

describe('calculatePlayerPointsDecayed', () => {
	it('should calculate decayed points correctly', () => {
		expect(calculatePlayerPointsDecayed(0, 1)).toBe(0);
		expect(calculatePlayerPointsDecayed(0, 10)).toBe(0);

		expect(calculatePlayerPointsDecayed(100, 1)).toBe(100);
		expect(calculatePlayerPointsDecayed(100, 2)).toBe(95);
		expect(calculatePlayerPointsDecayed(100, 3)).toBe(90.25);

		expect(calculatePlayerPointsDecayed(10_000, 1)).toBe(10000);
		expect(calculatePlayerPointsDecayed(10_000, 10)).toBe(6302.494097246093);
		expect(calculatePlayerPointsDecayed(10_000, 100)).toBe(62.321360214042315);
		expect(calculatePlayerPointsDecayed(10_000, 1000)).toBe(5.570339734468424e-19);
		expect(calculatePlayerPointsDecayed(10_000, 10000)).toBe(1.8127139760926918e-219);
	});

	it('should return 0 for invalid inputs', () => {
		expect(calculatePlayerPointsDecayed(100, 0)).toBe(0);
		expect(calculatePlayerPointsDecayed(100, -1)).toBe(0);
		expect(calculatePlayerPointsDecayed(Number.NaN, 1)).toBe(0);
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
		expect(result.points).toBe(2166);
		expect(result.totalPoints).toBe(2254);
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
		expect(result.points).toBe(18);
		expect(result.totalPoints).toBe(19);
	});

	it('should sort personal bests by most valuable', () => {
		const personalBests = [
			{ idLevel: 1, levelPoints: 100, position: BigInt(25) },
			{ idLevel: 2, levelPoints: 4000, position: BigInt(80) },
			{ idLevel: 3, levelPoints: 3000, position: BigInt(2) },
		];

		const result = calculatePlayerPoints(personalBests);
		expect(result.points).toBe(2942);
		expect(result.totalPoints).toBe(2949);
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
