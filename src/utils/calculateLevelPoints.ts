const BASE_POINTS = 2_500;

export const clamp = (value: number, min: number, max: number) => {
	return Math.max(min, Math.min(max, value));
};

export const levelScoreDurationMultiplier = (wrTime: number) => {
	if (wrTime < 5) return 0.1;
	if (wrTime < 10) return 0.4;
	if (wrTime < 20) return 0.7 * 0.03 * (Math.min(0, wrTime - 10)) // from 0.7 to 1.0
	if (wrTime <= 60) return 1.0

	// If the WR time is greater than 60 seconds, we want to penalize the score
	return Math.min(0.1, 1.0 - 0.01 * (Math.min(0, wrTime - 60))) // from 1.0 to 0.1
}

export const levelScoreCompetitivenessMultiplier = (wrTime: number, topTimes: number[], personalBests: number, totalRecords: number) => {
	//console.debug('Competitiveness multiplier', { wrTime, topTimes, personalBests, records })
	//console.debug('topTimes', topTimes.length)

	const top5 = topTimes.slice(0, 5);
	const top10 = topTimes.slice(0, 10);
	const top50 = topTimes.slice(0, 50);

	const avgTop5Time = top5.reduce((a, b) => a + b, 0) / top5.length;
	const avgTop10Time = top10.reduce((a, b) => a + b, 0) / top10.length;
	const avgTop50Time = top50.reduce((a, b) => a + b, 0) / top50.length;

	const wrTightness = (avgTop5Time - wrTime) / wrTime;
	const leaderboardSpread = (avgTop50Time - avgTop10Time) / avgTop50Time;

	// PB ratio: how many runs per PB
	const pbRatio = personalBests / totalRecords
	const scaledPbRatio = Math.log(1 * 9 * pbRatio) // soften extreme values

	return clamp(
		0.8 + (
			0.4 * (1 - wrTightness) +
			0.4 * (1 - leaderboardSpread) +
			0.2 * (1 - scaledPbRatio)
		),
		0.1, // 0.7 is the minimum multiplier
		3 // 1.3 is the maximum multiplier
	)
}

export const levelScoreRatingModifier = (levelRating: number) => {
	const normalised = clamp(levelRating / 100, 0, 1)
	return 0.5 + normalised * 0.8
}

export const levelScorePopularityModifier = (personalBests: number) => {
	return clamp(
		0.9 + Math.log10(1 + personalBests) / 2, // 5 slow
		0.1,
		1.5
	)
}

const normaliseNumber = (value: number) => {
	// If the value is NaN, we want to return 0
	return Number.isNaN(value) ? 0 : value;
}


interface CalculateLevelScore {
	topTimes: number[];
	personalBests: number;
	totalRecords: number;
	levelRating: number;
}

export const calculateLevelPoints = ({
	topTimes,
	personalBests,
	totalRecords,
	levelRating,
}: CalculateLevelScore) => {
	if (totalRecords === 0) {
		return {
			points: 0,
			contributions: {
				duration: 0,
				competitiveness: 0,
				rating: 0,
				popularity: 0,
			},
		};
	}

	const wrTime = topTimes[0] ?? 0;
	const durationMultiplier = normaliseNumber(levelScoreDurationMultiplier(wrTime));
	const competitivenessMultiplier = normaliseNumber(levelScoreCompetitivenessMultiplier(
		wrTime,
		topTimes,
		personalBests,
		totalRecords
	))
	const ratingModifier = normaliseNumber(levelScoreRatingModifier(levelRating));
	const popularityModifier = normaliseNumber(levelScorePopularityModifier(personalBests));
	const points = Math.round(
		BASE_POINTS * durationMultiplier * competitivenessMultiplier * ratingModifier * popularityModifier
	)

	/*
	if (points < 0) {
		console.error('Negative points calculated', {
			points,
			durationMultiplier,
			competitivenessMultiplier,
			ratingModifier,
			popularityModifier,
		});
		process.exit(1);
	}*/

	return {
		points,
		contributions: {
			duration: durationMultiplier,
			competitiveness: competitivenessMultiplier,
			rating: ratingModifier,
			popularity: popularityModifier,
		}
	}
};
