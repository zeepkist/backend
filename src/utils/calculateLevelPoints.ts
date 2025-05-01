const BASE_POINTS = 10_000;

export const calculateLevelRatingScore = (levelRating: number): number => {
	// levelRating is a number between -100 and 100,
	// where -100 is the worst and 100 is the best
	// we want it to be a number between 0 and 1
	const clampedLevelRating = Math.max(-100, Math.min(100, levelRating));
	const normalizedLevelRating = (clampedLevelRating + 100) / 200;
	const levelRatingScore = Math.min(1, normalizedLevelRating);

	return levelRatingScore;
};

export const calculateWrGapScore = (lastTime: number, wrTime: number): number => {
	const wrGap = lastTime - wrTime;
	const wrGapScore = Math.min(1, wrGap / wrTime);

	return wrGapScore;
};

const calculatePersonalBestCountScore = (pbCount: number, totalUsers: number): number => {
	const pbCountScore = Math.min(1, Math.log(pbCount + 1) / Math.log(totalUsers));

	return pbCountScore;
};

const calculateSpreadScore = (topTimes: number[], wrTime: number): number => {
	const avgSpread =
		topTimes.slice(1).reduce((sum, time) => sum + (time - wrTime), 0) / (topTimes.length - 1);
	const spreadScore = Math.min(1, avgSpread / wrTime);

	return spreadScore;
};

/*
const calculateSpreadStddevScore = (topTimes: number[], wrTime: number): number => {
	const avgSpread =
		topTimes.slice(1).reduce((sum, time) => sum + (time - wrTime), 0) / (topTimes.length - 1);
	const spreadStddev = Math.sqrt(
		topTimes.slice(1).reduce((sum, time) => sum + Math.pow(time - avgSpread, 2), 0) /
			(topTimes.length - 1),
	);
	const spreadScoreStddev = Math.min(1, spreadStddev / wrTime);

	return spreadScoreStddev
};
*/

/**
 * Calculate the time penalty based on WR time to penalise levels with short or
 * very long WR times. The penalty is a sigmoid function that drops off
 * to 0.25 at 90 seconds and peaks at 40 seconds.
 *
 * Levels with WR times below 10 seconds are penalised to 0 points.
 *
 * The penalty is applied to the final score.
 */
const calculateWorldRecordTimePenalty = (wrTime: number): number => {
	const clampedTime = Math.min(wrTime, 90); // Clamp to 90 seconds
	const peak = 40; // 40 seconds
	const minTime = 10; // 10 seconds
	const minDropoff = 20; // 20 seconds
	const maxScore = 1.2;

	// Below minTime, score is 0
	if (clampedTime < minTime) {
		return 0;
	}

	// Left side (penalise too short WRs)
	if (clampedTime < peak) {
		const steepness = 0.2;
		const logistic = 1 / (1 + Math.exp(-steepness * (clampedTime - minDropoff)));

		return maxScore * logistic;
	}

	// Right side (penalise too long WRs)
	const decaySteepness = 0.05;
	const decay = 1 / (1 + Math.exp(decaySteepness * (clampedTime - peak)));

	return maxScore * decay;
};

/**
 * Calculate the cut penalty based on WR time and top times to penalise levels
 * with suspiciously low WR times, so they don't get inflated scores.
 */
const calculateCutPenalty = (wrTime: number, topTimes: number[]): number => {
	const mean = topTimes.reduce((a, b) => a + b, 0) / topTimes.length;
	const stddev = Math.sqrt(topTimes.reduce((a, b) => a + (b - mean) ** 2, 0) / topTimes.length);
	const zScore = (wrTime - mean) / stddev;
	const threshold = -1.5; // 2.5?

	const suspiciousWR = zScore < threshold;

	if (!suspiciousWR) return 1;

	const severity = Math.abs(zScore - threshold);
	const minimumPenalty = 0.2; // 20% penalty
	const penaltyScale = 0.5; // Higher = more severe penalty
	const penalty = Math.max(minimumPenalty, 1 - severity * penaltyScale);

	return penalty;
};

interface CalculateLevelScore {
	topTimes: number[];
	personalBests: number;
	totalUsers: number;
	levelRating: number;
}

export const calculateLevelPoints = ({
	topTimes,
	personalBests,
	totalUsers,
	levelRating,
}: CalculateLevelScore) => {
	const wrTime = topTimes[0] ?? 0;
	const lastTime = topTimes.at(-1) ?? wrTime;

	const levelRatingScore = calculateLevelRatingScore(levelRating);
	const gapScore = calculateWrGapScore(lastTime, wrTime);
	const pbCountScore = calculatePersonalBestCountScore(personalBests, totalUsers);

	const spreadScore = calculateSpreadScore(topTimes, wrTime); // TODO: Check which one is better
	// const spreadStddevScore = calculateSpreadStddevScore(topTimes, wrTime); // TODO: Check which one is better

	const wrTimePenalty = calculateWorldRecordTimePenalty(wrTime);
	const cutPenalty = calculateCutPenalty(wrTime, topTimes);

	const weightedLevelRatingScore = 0.2 * levelRatingScore;
	const weightedGapScore = 0.4 * gapScore;
	const weightedPbCountScore = 2 * pbCountScore;
	const weightedSpreadScore = 0.5 * spreadScore;
	// const weightedSpreadStddevScore = spreadStddevScore * 0.25;

	/*
	const scoreContributions = weightedGapScore + weightedPbCountScore + weightedSpreadScore + weightedLevelRatingScore;
	const finalScore = Math.round(BASE_POINTS * scoreContributions * wrTimePenalty * cutPenalty);
	*/

	const scoreContributions =
		weightedGapScore + weightedSpreadScore + weightedPbCountScore + weightedLevelRatingScore;

	const finalScore = 10_000 * (scoreContributions * wrTimePenalty) * cutPenalty;

	// round finalScore to the nearest even number
	const points = finalScore % 2 === 0 ? finalScore : finalScore + 1;

	return {
		points: Number.isNaN(points) ? 0 : points,
		contributions: {
			worldRecordTimeGap: weightedGapScore,
			timeSpread: weightedSpreadScore,
			// timeSpreadStddev: weightedSpreadStddevScore,
			personalBests: weightedPbCountScore,
			worldRecordTimePenalty: wrTimePenalty,
			cutPenalty,
			levelRating: weightedLevelRatingScore,
		},
	};
};
