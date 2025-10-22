/**
 * Calculate points for a level based on various factors.
 *
 * Theoretical multipliers are 0.00175x to 3.9x:
 * - Level length: 0.1x to 1.0x
 * - Competitiveness: 0.1x to 2.0x
 * - Community rating: 0.5x to 1.5x
 * - Popularity: 0.7x to 1.3x
 * - Cut penalty: 0.5x to 1.0x
 *
 * This means the final score can range from 2 to 9984 points.
 *
 * If the level has no records, it gets 0 points.
 */

const BASE_POINTS = 2_560;
const MINIMUM_PBS = 5;
const MODIFIERS = {
	LENGTH_SHORT: {
		MIN: 0.1,
		MAX: 1.0,
		MIN_SECONDS: 5,
		MAX_SECONDS: 20,
	},
	LENGTH_LONG: {
		MIN: 0.5,
		MAX: 1.0,
		MIN_SECONDS: 75,
		MAX_SECONDS: 120,
	},
	COMPETITIVENESS: {
		MIN: 0.1,
		MAX: 2.0,
	},
	RATING: {
		MIN: 0.5,
		MAX: 1.5,
	},
	POPULARITY: {
		MIN: 0.7,
		MAX: 1.3,
	},
	CUT_PENALTY: 0.5,
};

/**
 * Restricts a number to a given range.
 * - Returns `min` if value is too low.
 * - Returns `max` if value is too high.
 * - Returns value if within range.
 * - Returns NaN if any input is not a finite number.
 */
export const clamp = (value: number, min: number, max: number): number =>
	Number.isFinite(value) && Number.isFinite(min) && Number.isFinite(max)
		? Math.max(min, Math.min(max, value))
		: Number.NaN;

/**
 * Calculates the average of an array of numbers.
 * Returns NaN for an empty array.
 */
function average(array: number[]): number {
	return array.length ? array.reduce((sum, val) => sum + val, 0) / array.length : Number.NaN;
}

/**
 * Returns 0 if value is NaN, otherwise returns the value.
 */
const normaliseNumber = (value: number) => (Number.isNaN(value) ? 0 : value);

/**
 * Rounds a number to the nearest even integer.
 */
const toEven = (value: number): number => Math.round(value / 2) * 2;

const round = (value: number, precision = 7): number => {
	if (!Number.isFinite(value)) {
		return Number.NaN;
	}

	const factor = 10 ** precision;
	return Math.round(value * factor) / factor;
};

const standardDeviation = (values: number[]): number => {
	const mean = average(values);
	const variance = average(values.map(value => (value - mean) ** 2));

	return Math.sqrt(variance);
}

function modeFrequency<T>(arr: T[]): Map<T, number> {
	const m = new Map<T, number>();
	for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1);
	return m;
}

function uniqueValues<T>(arr: T[]): T[] {
	return Array.from(new Set(arr));
}

/**
 * See `levelScoreLengthMultiplier` for details.
 *
 * If the WR time is shorter than the ideal level duration, then it scales down
 * from 1.0 to 0.1 as the time decreases below the defined short length range.
 *
 * This is to discourage farming very short levels for quick points.
 */
function shortLengthMultiplier(wrTime: number): number {
	const MIN = MODIFIERS.LENGTH_SHORT.MIN;
	const MAX = MODIFIERS.LENGTH_SHORT.MAX - MIN;
	const START = MODIFIERS.LENGTH_SHORT.MIN_SECONDS;
	const END = MODIFIERS.LENGTH_SHORT.MAX_SECONDS;

	if (wrTime < END) {
		const clampedTime = Math.max(0, wrTime - START);
		const progress = clampedTime / (END - START);
		const eased = Math.sqrt(progress);

		return round(MIN + eased * MAX);
	}

	return 1;
}

/**
 * See `levelScoreLengthMultiplier` for details.
 *
 * If the WR time is longer than the ideal level duration, then it scales down
 * from 1.0 to 0.5 as the time increases beyond the defined long length range.
 *
 * This is to discourage very long levels that may not be fun.
 */
function longLengthMultiplier(wrTime: number): number {
	const LONG_START = MODIFIERS.LENGTH_LONG.MIN_SECONDS;
	const LONG_END = MODIFIERS.LENGTH_LONG.MAX_SECONDS;
	const LONG_MIN = MODIFIERS.LENGTH_LONG.MIN;
	const LONG_MAX = MODIFIERS.LENGTH_LONG.MAX - LONG_MIN;

	if (wrTime > LONG_START) {
		const clampedTime = Math.min(wrTime, LONG_END);
		const progress = (clampedTime - LONG_START) / (LONG_END - LONG_START);
		const eased = 1 - Math.sqrt(progress);

		return round(LONG_MIN + eased * LONG_MAX);
	}

	return 1;
}

/**
 * Calculates a multiplier based on the level's world record (WR) time.
 * - Short levels (≤5s) get a low multiplier (min 0.1).
 * - WR times between 5s–20s scale up to 1.0.
 * - WR times 20s–75s get 1.0.
 * - WR times >75s scale down to 0.5 by 120s.
 *
 * This rewards levels that are neither too short nor too long.
 */
export const levelScoreLengthMultiplier = (wrTime: number): number => {
	if (wrTime < MODIFIERS.LENGTH_SHORT.MAX_SECONDS) {
		return shortLengthMultiplier(wrTime);
	}

	if (wrTime > MODIFIERS.LENGTH_LONG.MIN_SECONDS) {
		return longLengthMultiplier(wrTime);
	}

	return 1;
};

interface LevelScoreCompetitivenessMultiplierResult {
	modifier: number;
	tightness: number;
	logTimeDispersion: number;
	difficultyFactor: number;
	informationScore: number;
}

/**
 * EXPERIMENTAL: Calculates a multiplier based on how competitive a level is.
 * - Considers how close top times are (tightness).
 * - Considers how much top 50 times differ from top 10 (spread).
 * - Considers how many PBs per record (grindiness).
 * - If few times (< MINIMUM_PBS), returns a low modifier.
 *
 * This rewards levels where top times are hard to achieve and many players try.
 */
export const levelScoreCompetitivenessMultiplier = (
	wrTime: number,
	topTimes: number[],
): LevelScoreCompetitivenessMultiplierResult => {
	const MIN = MODIFIERS.COMPETITIVENESS.MIN;
	const MAX = MODIFIERS.COMPETITIVENESS.MAX;

	const numPlayers = topTimes.length;
	if (!Number.isFinite(wrTime) || numPlayers <= MINIMUM_PBS) {
		return {
			modifier: MIN,
			tightness: 0,
			logTimeDispersion: 0,
			difficultyFactor: 0,
			informationScore: 0,
		};
	}

	const avgTimes = average(topTimes);

	// Logarithmic dispersion to measure leaderboard tightness
	const safeWrTime = Math.max(wrTime, 1e-9);
	const logTimeRatios = topTimes.map((t) => Math.log(Math.max(t, 1e-9) / safeWrTime));
	const logTimeStdDev = standardDeviation(logTimeRatios);
	const tightnessScoreBase = 1 / (1 + 12 * logTimeStdDev); // higher = more competitive

	// Uniqueness and clustering
	const numUniqueTimes = uniqueValues(topTimes).length;
	const uniquenessRatio = numUniqueTimes / numPlayers;

	const frequencyMap = modeFrequency(topTimes);
	let maxTimeFrequency = 0;
	for (const freq of frequencyMap.values()) maxTimeFrequency = Math.max(maxTimeFrequency, freq);
	const modeFrequencyRatio = maxTimeFrequency / numPlayers;

	// Near-WR duplicates
	const relativeEpsilon = 1e-6;
	const nearWrCount = topTimes.filter(
		(t) => Math.abs(t - wrTime) <= Math.max(relativeEpsilon * wrTime, 1e-9),
	).length;
	const nearWrRatio = nearWrCount / numPlayers;

	// Near-mode duplicates
	const modeValue = Array.from(frequencyMap.entries()).reduce(
		(currentMode, [val, count]) => (count > (frequencyMap.get(currentMode as number) ?? 0) ? val : currentMode),
		topTimes[0],
	) as number;
	const nearModeCount = topTimes.filter(
		(t) => Math.abs(t - modeValue) <= Math.max(1e-6 * modeValue, 1e-9),
	).length;
	const nearModeRatio = nearModeCount / numPlayers;

	// Information score: penalizes low-information / AFK levels
	const informationScore = clamp(
		uniquenessRatio ** 0.6 *
		(1 - modeFrequencyRatio) ** 0.7 *
		(1 - nearWrRatio) ** 0.8 *
		(1 - nearModeRatio) ** 0.5,
		0,
		1,
	);

	// Difficulty factor: reward maps where average top 10 is slower than WR
	const difficultyRaw = avgTimes / wrTime - 1;
	const difficultyFactor = clamp(difficultyRaw / 0.05, 0, 1);

	// Combine into final competitiveness
	const weightTightness = 0.6;
	const weightDifficulty = 0.5;

	const rawModifier =
		1.0 +
		weightTightness * (tightnessScoreBase - 0.5) * informationScore +
		weightDifficulty * difficultyFactor * informationScore;

	const modifier = clamp(rawModifier, MIN, MAX);

	return {
		modifier: Number(modifier.toFixed(6)),
		tightness: Number(tightnessScoreBase.toFixed(6)),
		logTimeDispersion: Number(logTimeStdDev.toFixed(6)),
		difficultyFactor: Number(difficultyFactor.toFixed(6)),
		informationScore: Number(informationScore.toFixed(6)),
	};
};

/**
 * Calculates a multiplier based on the community rating of the level.
 * - Rating is between 0.0 and 1.0.
 * - Low rating (0.0) gets 0.7, high rating (1.0) gets 1.3.
 * - Scales linearly.
 *
 * This rewards levels that are liked by the community.
 */
export const levelScoreRatingModifier = (rating: number): number => {
	const MIN = MODIFIERS.RATING.MIN;
	const MAX = MODIFIERS.RATING.MAX - MIN;

	return round(MIN + clamp(rating, 0, 1) * MAX);
};

/**
 * Calculates a multiplier based on how many players set a personal best (PB).
 * - Very low PBs (< MINIMUM_PBS) get 0.7.
 * - Up to twice the 90th percentile PB count, scales up to 1.3.
 * - Above that, gets max multiplier.
 *
 * This rewards levels that are popular and played by many.
 */
export const levelScorePopularityModifier = (
	personalBests: number,
	countPercentile: number,
): number => {
	const MIN = MODIFIERS.POPULARITY.MIN;
	const MAX = MODIFIERS.POPULARITY.MAX - MIN;
	const CAP = countPercentile * 3;

	if (personalBests < MINIMUM_PBS) {
		return MIN;
	}

	if (personalBests < CAP) {
		const eased = Math.sqrt(clamp(personalBests / CAP, 0, 1));
		return round(MIN + eased * MAX);
	}

	return MIN + MAX;
};

/**
 * Applies a penalty only if the world record (WR) is less than or equal to half the average of the
 * top 5 times after the WR (1st place).
 * - If WR > 0.5 × avg top, no penalty.
 * - Penalty scales down from 1.0 to 0.5 as suspicion increases.
 *
 * This discourages exploit farming, without punishing players for improving the WR time.
 */
export const levelScoreCutPenalty = (topTimes: number[], wrTime: number): number => {
	const times = topTimes.slice(1, 6); // Exclude WR and take next 5 times
	const averageTimes = times.length ? average(times) : 0;

	if (averageTimes === 0 || wrTime > averageTimes * 0.5) {
		return 1;
	}

	const cutSuspicion = clamp((averageTimes * 0.5 - wrTime) / (averageTimes * 0.5), 0, 1);

	return round(1 - MODIFIERS.CUT_PENALTY * cutSuspicion);
};

interface CalculateLevelScore {
	topTimes: number[];
	personalBests: number;
	rating: number;
	personalBestCountPercentile: number;
}

interface LevelScoreModifiers {
	lengthModifier: number;
	competitivenessModifier: number;
	ratingModifier: number;
	popularityModifier: number;
	cutPenalty: number;
}

interface CalculateLevelPointsResult {
	points: number;
	modifiers: LevelScoreModifiers;
}

/**
 * Calculates the final score for a level using several factors:
 * 1. Level length: Rewards levels that are not too short or long.
 * 2. Competitiveness: Rewards levels where top times are hard to achieve and many players try.
 * 3. Community rating: Rewards levels liked by players.
 * 4. Popularity: Rewards levels played by many.
 * 5. Cut penalty: Discourages levels with suspicious shortcuts.
 *
 * Each factor is a multiplier. All are multiplied with a base value to get the final score.
 * The result includes the score and a breakdown of each modifier.
 *
 * This method ensures that levels are scored fairly, rewarding those that are fun, competitive, and popular,
 * while penalizing those with exploits or little competition.
 */
export const calculateLevelPoints = ({
	topTimes,
	personalBests,
	rating,
	personalBestCountPercentile,
}: CalculateLevelScore): CalculateLevelPointsResult => {
	if (!topTimes.length) {
		return {
			points: 0,
			modifiers: {
				lengthModifier: 0,
				competitivenessModifier: 0,
				ratingModifier: 0,
				popularityModifier: 0,
				cutPenalty: 0,
			},
		};
	}

	const wrTime = topTimes[0] ?? 0;
	const lengthModifier = normaliseNumber(levelScoreLengthMultiplier(wrTime));
	const { modifier: competitivenessModifier } = levelScoreCompetitivenessMultiplier(
		wrTime,
		topTimes,
	);
	const ratingModifier = normaliseNumber(levelScoreRatingModifier(rating));
	const popularityModifier = normaliseNumber(
		levelScorePopularityModifier(personalBests, personalBestCountPercentile),
	);
	const cutPenalty = normaliseNumber(levelScoreCutPenalty(topTimes, wrTime));

	const points = toEven(
		BASE_POINTS *
			lengthModifier *
			competitivenessModifier *
			ratingModifier *
			popularityModifier *
			cutPenalty,
	);

	return {
		points,
		modifiers: {
			lengthModifier,
			competitivenessModifier,
			ratingModifier,
			popularityModifier,
			cutPenalty,
		},
	};
};
