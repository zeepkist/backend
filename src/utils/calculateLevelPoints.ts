const BASE_POINTS = 1_000;

/**
 * Clamps a number between a minimum and maximum value.
 */
export const clamp = (value: number, min: number, max: number) => {
	if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
		return Number.NaN;
	}

	return Math.max(min, Math.min(max, value));
};

/**
 * Calculates the average of an array of numbers.
 */
function average(arr: number[]): number {
	return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculates the level score duration multiplier based on the WR time.
 * The multiplier is a gradual increase from 0.1 (at 5s) to 1 (at 20s).
 *
 * After 20s, the multiplier is always 1.
 */
export const levelScoreLengthMultiplier = (wrTime: number) => {
	const MIN = 0.1;
	const MAX = 1 - MIN;

	if (wrTime < 20) {
		const interpolationFactor = (wrTime - 5) / 15; // 5s to 20s
		return Math.max(MIN, Math.min(1, MIN + interpolationFactor * MAX));
	}

	return 1;
};

/**
 * EXPERIMENTAL: Calculates the competitiveness based on the WR time and the
 * top times (top 5, top 10, top 50).
 *
 * The competitiveness is a combination of:
 * - How far the average of the top 5 is from the WR (tighter is better)
 * - How much the top 50 spreads from the top 10 (larger is better)
 * - PB-to-record ratio: How grindy the level is (smaller is worse)
 */
export const levelScoreCompetitivenessMultiplier = (
	wrTime: number,
	topTimes: number[],
	personalBests: number,
	totalRecords: number,
) => {
	if (topTimes.length === 1) {
		return 1.0;
	}

	const top5 = topTimes.slice(0, 5);
	const top10 = topTimes.slice(0, 10);
	const top50 = topTimes.slice(0, 50);

	const avgTop5Time = average(top5);
	const avgTop10Time = average(top10);
	const avgTop50Time = average(top50);

	// How far the average of the top 5 is from the WR (tighter is better)
	const tightnessScore = (avgTop5Time - wrTime) / wrTime;

	// How much the top 50 spreads from the top 10 (larger is better)
	const spreadScore  = (avgTop50Time - avgTop10Time) / avgTop50Time;

	// PB-to-record ratio: How grindy the level is (smaller is worse)
	// Note: Also reflects how popular the level is (possible that it should be flipped?)
	const pbRatio = personalBests > 0 ? personalBests / totalRecords : 0
	const grindinessScore = 1 - Math.log(1 + 9 * pbRatio);

	const weightedScore =
		0.45 * tightnessScore +
		0.35 * spreadScore +
		0.25 * grindinessScore;

	return clamp(1 + weightedScore, 0.1, 3)
};

/**
 * Calculates the level score rating modifier based on the level rating.
 * The modifier is a range between 0.5 (at 0%) to 1.3 (at 100).
 *
 * Poorly rated levels are worth less, while well-rated levels gain a boost.
 */
export const levelScoreRatingModifier = (levelRating: number) => {
	const MIN = 0.5;
	const MAX = 1.3 - MIN;
	const normalised = clamp(levelRating / 100, 0, 1);

	return MIN + normalised * MAX;
};

/**
 * Calculates the level score popularity modifier based on the number of
 * personal bests.
 *
 * The modifier is a gradual increase from 0.9 (1 record) to 3 (at 500
 * personal bests).
 */
export const levelScorePopularityModifier = (personalBests: number) => {
	const MIN = 0.9;
	const MAX = 3 - MIN;
	const PB_CAP = 500;

	if (personalBests < 1) {
		return MIN;
	}

	if (personalBests < PB_CAP) {
		const factor = (personalBests - 1) / (PB_CAP - 1);
		return Math.max(MIN, Math.min(3, MIN + factor * MAX));
	}

	return 3;
};

/**
 * Normalises a number to 0 if it is NaN.
 */
const normaliseNumber = (value: number) => {
	return Number.isNaN(value) ? 0 : value;
};

interface CalculateLevelScore {
	topTimes: number[];
	personalBests: number;
	totalRecords: number;
	levelRating: number;
}

interface LevelScoreContributions {
	length: number;
	competitiveness: number;
	rating: number;
	popularity: number;
}

interface CalculateLevelPointsResult {
	points: number;
	contributions: LevelScoreContributions;
}

export const calculateLevelPoints = ({
	topTimes,
	personalBests,
	totalRecords,
	levelRating,
}: CalculateLevelScore): CalculateLevelPointsResult => {
	if (totalRecords === 0) {
		return {
			points: 0,
			contributions: {
				length: 0,
				competitiveness: 0,
				rating: 0,
				popularity: 0,
			},
		};
	}

	const wrTime = topTimes[0] ?? 0;
	const lengthMultiplier = normaliseNumber(levelScoreLengthMultiplier(wrTime));
	const competitivenessMultiplier = normaliseNumber(
		levelScoreCompetitivenessMultiplier(wrTime, topTimes, personalBests, totalRecords),
	);
	const ratingModifier = normaliseNumber(levelScoreRatingModifier(levelRating));
	const popularityModifier = normaliseNumber(levelScorePopularityModifier(personalBests));
	const points = Math.round(
		BASE_POINTS *
		lengthMultiplier *
		competitivenessMultiplier *
		ratingModifier *
		popularityModifier,
	);

	return {
		points,
		contributions: {
			length: lengthMultiplier,
			competitiveness: competitivenessMultiplier,
			rating: ratingModifier,
			popularity: popularityModifier,
		},
	};
};
