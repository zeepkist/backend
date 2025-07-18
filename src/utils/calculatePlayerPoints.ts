interface PersonalBest {
	idLevel: number;
	levelPoints: number;
	position: bigint;
}

interface CalculatePlayerPointsResult {
	points: number;
	totalPoints: number;
}

const GLOBAL_DECAY_FACTOR = 0.95;
const LEVEL_DECAY_FACTOR = 0.985;

/**
 * Calculate a player's points based on their position in the leaderboard.
 */
export const calculatePlayerPointsDecayed = (points: number, position: number, decayFactor: number) => {
	if (position < 1 || !Number.isFinite(points)) {
		return 0;
	}

	const decay = decayFactor ** (position - 1);
	return points * decay;
}

export const calculatePlayerPoints = (
	personalBests: PersonalBest[],
): CalculatePlayerPointsResult => {
	const pointsList: number[] = [];
	const totals = {
		points: 0,
		totalPoints: 0,
	};

	/**
	 * Step 1: Calculate the user's points for each level, decaying the points
	 * based on their position in the level leaderboard.
	 */
	// Step 1: Calculate the user's points for each level
	for (const { levelPoints, position } of personalBests) {
		const index = Number(position);

		if (!Number.isFinite(index) || index < 1 || levelPoints === 0) {
			continue;
		}

		pointsList.push(calculatePlayerPointsDecayed(levelPoints, index, LEVEL_DECAY_FACTOR));
	}

	/**
	 * Step 2: Calculate the total ranked points for the user, given all of
	 * their calculated personal bests.
	 *
	 * Nth personal bests are worth less than the previous ones, so we sort
	 * the points in descending order and decay them based on their index.
	 * This means that the first personal best is worth the most, and the
	 * last personal best is worth the least.
	 */
	for (const [index, points] of pointsList.sort((a, b) => b - a).entries()) {
		totals.points += calculatePlayerPointsDecayed(points, index + 1, GLOBAL_DECAY_FACTOR);
		totals.totalPoints += points;
	}

	return {
		points: Math.round(totals.points),
		totalPoints: Math.round(totals.totalPoints),
	};
};
