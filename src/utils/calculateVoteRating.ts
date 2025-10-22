import { DEFAULT_VOTE_RATING } from '../config';

const Z = 1; // 85% confidence interval
const Z2 = Z * Z;

/**
 * Calculates a Wilson lower bound for a given number of upvotes and total votes.
 */
export function wilsonLowerBound(upVotes: number, totalVotes: number): number {
	if (totalVotes === 0) return 0;

	const p = upVotes / totalVotes;
	const denominator = 1 + Z2 / totalVotes;
	const centre = p + Z2 / (2 * totalVotes);
	const margin = Z * Math.sqrt((p * (1 - p) + Z2 / (4 * totalVotes)) / totalVotes);

	return (centre - margin) / denominator;
}

/**
 * Calculates a vote rating based on the votes received, skewed towards positive votes.
 *
 * This function maps the votes to a scale of 0.0 to 1.0 and then calculates a
 * Wilson lower bound to provide a confidence interval.
 *
 * -- (-2)
 * -  (-1)
 * -+  (0)
 * +-  (0)
 * +   (1)
 * ++  (2)
 */
export function calculateVoteRating(votes: number[]): number {
	const totalVotes = votes.length;
	if (totalVotes === 0) return DEFAULT_VOTE_RATING;

	let sum = 0;
	for (let i = 0; i < totalVotes; i++) {
		const vote = votes[i] ?? 0;
		sum += (vote + 2) / 4;
	}

	const avg = sum / totalVotes;
	const upvotes = avg * totalVotes;
	const lowerBound = wilsonLowerBound(upvotes, totalVotes);

	return Number.isFinite(lowerBound) ? Number(Math.max(0, Math.min(1, lowerBound)).toFixed(6)) : DEFAULT_VOTE_RATING;
}
