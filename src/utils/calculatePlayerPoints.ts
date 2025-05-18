interface PersonalBest {
	idLevel: number;
	levelPoints: number;
	position: bigint;
}

interface CalculatePlayerPointsResult {
	points: number;
	totalPoints: number;
}

export const calculatePlayerPointsDecayed = (points: number, position: number) => {
	const decay = 0.95 ** (position - 1);
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

	// Step 1: Calculate the user's points for each level
	for (const { levelPoints, position } of personalBests) {
		const index = Number(position);

		if (!Number.isFinite(index) || index < 1 || levelPoints === 0) {
			continue;
		}

		pointsList.push(calculatePlayerPointsDecayed(levelPoints, index));
	}

	// Step 2: Calculate the decayed points (highest to lowest)
	for (const [index, points] of pointsList.sort((a, b) => b - a).entries()) {
		totals.points += calculatePlayerPointsDecayed(points, index);
		totals.totalPoints += points;
	}

	return {
		points: Math.round(totals.points),
		totalPoints: Math.round(totals.totalPoints),
	};
};
