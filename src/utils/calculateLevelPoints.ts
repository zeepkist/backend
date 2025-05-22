const BASE_POINTS = 2_500;
const MINIMUM_PBS = 5;

/**
 * Restricts a number to stay within a given range.
 *
 * - Returns `min` if the value is too low
 * - Returns `max` if the value is too high
 * - Returns the value itself if it's within range
 * - Returns NaN if any input is not a finite number
 */
export const clamp = (value: number, min: number, max: number) => {
	if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
		return Number.NaN;
	}

	return Math.max(min, Math.min(max, value));
};

/**
 * Calculates the average (mean) value of a list of numbers.
 */
function average(arr: number[]): number {
	return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Returns a score multiplier based on the level's world record (WR) time.
 *
 * - Short levels (≤5s) get a low multiplier (min 0.1)
 * - Longer levels (up to 20s) get a higher multiplier (up to 1.0)
 * - Scales smoothly using an ease-out curve between 5s and 20s
 * - Levels longer than 20s always return 1
 */
export const levelScoreLengthMultiplier = (wrTime: number) => {
	const MIN = 0.1;
	const MAX = 1 - MIN;
	const START = 5;
	const END = 20;

	if (wrTime < END) {
		const clamped = Math.max(0, wrTime - START) / (END - START); // normalized [0,1]
		const eased = Math.sqrt(clamped); // ease-out growth
		return MIN + eased * MAX;
	}

	return 1;
};

interface LevelScoreCompetitivenessMultiplierResult {
	modifier: number;
	spreadScore: number;
	pbRatio: number;
	grindinessScore: number;
}

/**
 * EXPERIMENTAL: Calculates a score multiplier based on how competitive a level is.
 *
 * - Uses real player times to estimate how close and grindy the competition is.
 * - More spread between top times → higher multiplier.
 * - More personal bests per record → higher multiplier (less grindy).
 * - Levels with very few times default to a low multiplier (0.25).
 */
export const levelScoreCompetitivenessMultiplier = (
	wrTime: number,
	topTimes: number[],
	personalBests: number,
	totalRecords: number,
): LevelScoreCompetitivenessMultiplierResult => {
	if (topTimes.length <= MINIMUM_PBS) {
		return {
			modifier: 0.25,
			spreadScore: 0,
			pbRatio: 0,
			grindinessScore: 0,
		}
	}

	//const top5 = topTimes.slice(0, 5);
	const top10 = topTimes.slice(0, 10);
	const top50 = topTimes.slice(0, 50);

	//const avgTop5Time = average(top5);
	const avgTop10Time = average(top10);
	const avgTop50Time = average(top50);

	// How far the average of the top 5 is from the WR (tighter is better)
	// const tightnessScore = (avgTop5Time - wrTime) / wrTime;

	// How much the top 50 spreads from the top 10 (larger is better)
	const spreadScore  = (avgTop50Time - avgTop10Time) / avgTop50Time;

	// PB-to-record ratio: How grindy the level is (smaller is worse)
	// Note: Also reflects how popular the level is (possible that it should be flipped?)
	const pbRatio = personalBests > 0 ? personalBests / totalRecords : 0
	const grindinessScore = 1 + Math.log(2 * pbRatio);

	const weightedScore =
		// 0.45 * tightnessScore +
		0.65 * spreadScore +
		0.2 * grindinessScore;

	const modifier = normaliseNumber(clamp(1 + weightedScore, -3, 3));

	return {
		modifier,
		spreadScore,
		pbRatio,
		grindinessScore
	}
};

/**
 * Returns a score multiplier based on the level's community rating (0–100).
 *
 * Set in-game with ++, +, - or -- votes in chat.
 *
 * - Lower rating → lower multiplier (min 0.5)
 * - Higher rating → higher multiplier (up to 1.3)
 * - Linearly scales between 0 and 100
 */
export const levelScoreRatingModifier = (levelRating: number) => {
	const MIN = 0.5;
	const MAX = 1.3 - MIN;
	const normalised = clamp(levelRating / 100, 0, 1);

	return MIN + normalised * MAX;
};

/**
 * Returns a score multiplier based on how many players set a personal best (PB) on a level.
 *
 * - Fewer PBs → lower multiplier (min 0.8)
 * - More PBs → higher multiplier (up to 1.3)
 * - Scales smoothly up to a cap of 250 PBs
 */
export const levelScorePopularityModifier = (personalBests: number) => {
	const MIN = 0.75;
	const MAX = 1.3 - MIN;
	const PB_CAP = 250;

	if (personalBests < MINIMUM_PBS) {
		return MIN + 0.05;
	}

	if (personalBests < PB_CAP) {
		const normalized = (personalBests - 1) / (PB_CAP - 1);
		const eased = Math.sqrt(normalized);

		return MIN + eased * MAX;
	}

	return MIN + MAX;
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
	const { modifier: competitivenessMultiplier } = levelScoreCompetitivenessMultiplier(wrTime, topTimes, personalBests, totalRecords);
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
