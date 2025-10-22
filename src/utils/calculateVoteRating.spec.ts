import { describe, expect, it } from 'bun:test';
import { calculateVoteRating, wilsonLowerBound } from './calculateVoteRating';

describe('wilsonLowerBound', () => {
	it('should calculate wilson lower bound', () => {
		expect(wilsonLowerBound(0, 0)).toBe(0);
		expect(wilsonLowerBound(0, 10)).toBe(0);
		expect(wilsonLowerBound(5, 10)).toBe(0.2692556616014269);
		expect(wilsonLowerBound(10, 10)).toBe(0.7870282011880192);
		expect(wilsonLowerBound(10, 20)).toBe(0.3273902391760559);
		expect(wilsonLowerBound(20, 20)).toBe(0.8808234818732034);
		expect(wilsonLowerBound(30, 30)).toBe(0.9172621864014352);
		expect(wilsonLowerBound(50, 50)).toBe(0.9486581467678504);
		expect(wilsonLowerBound(100, 100)).toBe(0.9736527141421354);
		expect(wilsonLowerBound(1000, 1000)).toBe(0.997301277809715);
	});
});

describe('calculateVoteRating', () => {
	it('should return 0.5 for no votes', () => {
		expect(calculateVoteRating([])).toBe(0.5);
	});

	// all test case should have more than 10 votes with values as -2, -1, 0, 1 or 2
	const testCases = [
		{ case: 1, votes: [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2], expected: 0.087851 },
		{ case: 2, votes: [-2, -2, -2, -2, -1, -1, -1, -1, -1, -1], expected: 0.165579 },
		{ case: 3, votes: [-2, -2, -1, -1, -1, 0, 0, 0, 1, 1], expected: 0.304277 },
		{ case: 4, votes: [-2, -1, -1, 0, 0, 1, 1, 1, 2, 2], expected: 0.442414 },
		{ case: 5, votes: [-1, 0, 0, 1, 1, 2, 2, 2, 2, 2], expected: 0.594226 },
		{ case: 6, votes: [0, 0, 1, 1, 2, 2, 2, 2, 2, 2], expected: 0.65561 },
		{ case: 7, votes: [1, 1, 2, 2, 2, 2, 2, 2, 2, 2], expected: 0.743202 },
		{ case: 8, votes: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], expected: 0.790885 },
		{ case: 9, votes: Array.from({ length: 16 }, () => 2), expected: 0.840712 },
		{ case: 9, votes: Array.from({ length: 32 }, () => 2), expected: 0.890459 },
		{ case: 9, votes: Array.from({ length: 64 }, () => 2), expected: 0.918836 },
	];

	it.each(testCases)('should return $expected for case $case', ({ votes, expected }) => {
		expect(calculateVoteRating(votes)).toBe(expected);
	});
});
