interface PersonalBest {
	idLevel: number;
	levelPoints: number;
	position: bigint;
	totalPersonalBests: number;
}

interface CalculatePlayerPointsResult {
	points: number;
	totalPoints: number;
}

export const calculatePlayerPoints = (personalBests: PersonalBest[]): CalculatePlayerPointsResult => {
	const pointsList: number[] = [];
	const totals = {
		points: 0,
		totalPoints: 0,
	}

	// Step 1: Calculate the user's points for each level
	for (const { levelPoints, position, totalPersonalBests } of personalBests) {
		const safePosition = Number(position);

		if (!Number.isFinite(safePosition) || safePosition < 1  || levelPoints === 0) {
			continue;
		}

		//const decay = Math.pow(0.95, safePosition - 1);
		//const points = levelPoints * decay;
		// make the log proportional to the total number of PBs on the level (so levels with fewer PBs decrease in value faster)
		const normalisedPosition = (Number(safePosition) + 1) / (Number(totalPersonalBests) + 1);
		const points = levelPoints / (1 + Math.log(normalisedPosition));
		// const points = levelPoints / (1 + Math.log(safePosition + 1));
		pointsList.push(points);
	}

	// Step 2: Calculate the decayed points (highest to lowest)
	for (const [index, points] of pointsList.sort((a, b) => b - a).entries()) {
		const decay = Math.pow(0.95, index);

		totals.points += points * decay;
		totals.totalPoints += points;
	}

	return totals;
}
