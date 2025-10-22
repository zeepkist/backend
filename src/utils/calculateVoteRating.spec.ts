import { describe, expect, it } from 'bun:test';
import { calculateVoteRating, wilsonLowerBound } from './calculateVoteRating';

describe('wilsonLowerBound', () => {
	it('should calculate wilson lower bound', () => {
		expect(wilsonLowerBound(0, 0)).toBe(0);
		expect(wilsonLowerBound(0, 10)).toBe(0);
		expect(wilsonLowerBound(5, 10)).toBe(0.3492443277111182);
		expect(wilsonLowerBound(10, 10)).toBe(0.9090909090909091);
		expect(wilsonLowerBound(10, 20)).toBe(0.39089105488200376);
		expect(wilsonLowerBound(20, 20)).toBe(0.9523809523809522);
		expect(wilsonLowerBound(30, 30)).toBe(0.9677419354838708);
		expect(wilsonLowerBound(50, 50)).toBe(0.9803921568627451);
		expect(wilsonLowerBound(100, 100)).toBe(0.99009900990099);
		expect(wilsonLowerBound(1000, 1000)).toBe(0.9990009990009991);
	});
});

describe('calculateVoteRating', () => {
	it('should return 0.5 for no votes', () => {
		expect(calculateVoteRating([])).toBe(0.5);
	});

	// all test case should have more than 10 votes with values as -2, -1, 0, 1 or 2
	const testCases = [
		{ case: 1, votes: [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2], expected: 0 },
		{ case: 2, votes: [-2, -2, -2, -2, -1, -1, -1, -1, -1, -1], expected: 0.069554 },
		{ case: 3, votes: [-2, -2, -1, -1, -1, 0, 0, 0, 1, 1], expected: 0.239953 },
		{ case: 4, votes: [-2, -1, -1, 0, 0, 1, 1, 1, 2, 2], expected: 0.418976 },
		{ case: 5, votes: [-1, 0, 0, 1, 1, 2, 2, 2, 2, 2], expected: 0.621636 },
		{ case: 6, votes: [0, 0, 1, 1, 2, 2, 2, 2, 2, 2], expected: 0.705917 },
		{ case: 7, votes: [1, 1, 2, 2, 2, 2, 2, 2, 2, 2], expected: 0.831685 },
		{ case: 8, votes: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], expected: 0.909091 },
		{ case: 9, votes: Array.from({ length: 16 }, () => 2), expected: 0.941176 },
		{ case: 9, votes: Array.from({ length: 32 }, () => 2), expected: 0.969697 },
		{ case: 9, votes: Array.from({ length: 64 }, () => 2), expected: 0.984615 },
	];

	it.each(testCases)('should return $expected for case $case', ({ votes, expected }) => {
		expect(calculateVoteRating(votes)).toBe(expected);
	});
});
