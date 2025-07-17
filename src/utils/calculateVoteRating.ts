import { DEFAULT_VOTE_RATING } from '../config';

/**
 * Calculates a Wilson lower bound for a given number of upvotes and total votes.
 */
export function wilsonLowerBound(upVotes: number, totalVotes: number, z = 1.645): number {
	if (totalVotes === 0) return 0;

	const p = upVotes / totalVotes;
	const z2 = z * z;
	const denominator = 1 + z2 / totalVotes;
	const centre = p + z2 / (2 * totalVotes);
	const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * totalVotes)) / totalVotes);

	return (centre - margin) / denominator;
}

/**
 * Calculates a vote rating based on the votes received.
 *
 * This function maps the votes to a scale of 0.0 to 1.0 and then calculates a
 * Wilson lower bound to provide a confidence interval.
 */
export function calculateVoteRating(votes: number[]): number {
	if (votes.length === 0) return DEFAULT_VOTE_RATING;

	/**
	 * Map -2 to 0.0 (--)
	 * Map -1 to 0.25 (-)
	 * Map 0 to 0.5 (-+ / +-)
	 * Map 1 to 0.75 (+)
	 * Map 2 to 1.0 (++)
	 */
	const mapped = votes.map(value => (value + 2) / 4);
	const average = mapped.reduce((sum, value) => sum + value, 0) / mapped.length;

	console.debug(`Vote average: ${average} for votes: ${votes}`);

	const upvotes = average * votes.length;
	const totalVotes = votes.length;

	const lowerBound = wilsonLowerBound(upvotes, totalVotes);
	const clamped = lowerBound.toFixed(6);

	return clamped === 'NaN' ? DEFAULT_VOTE_RATING : Number.parseFloat(clamped);
}
