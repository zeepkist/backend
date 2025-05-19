const BASE_POINTS = 1_000;

export const clamp = (value: number, min: number, max: number) => {
	if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
		return Number.NaN;
	}

	return Math.max(min, Math.min(max, value));
};

function average(arr: number[]): number {
	return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

export const levelScoreDurationMultiplier = (wrTime: number) => {
	// Gradual increase from 0.1 (at 5s) to 0.9 (at 20s)
	if (wrTime < 20) {
		const interpolationFactor = (wrTime - 5) / 15; // 5s to 20s
		return Math.max(0.1, Math.min(0.9, 0.1 + interpolationFactor * 0.9));
	}

	// No penalisation for ideal level durations
	if (wrTime <= 60) {
		return 1.0;
	}

	// Gradual decrease from 1 (at 60s) to 0.1 (at 150s)
	const interpolationFactor = (wrTime - 60) / 90; // 60s to 150s
	return Math.max(0.1, 1.0 - interpolationFactor * 0.9);
};

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

export const levelScoreRatingModifier = (levelRating: number) => {
	const normalised = clamp(levelRating / 100, 0, 1);
	return 0.5 + normalised * 0.8;
};

export const levelScorePopularityModifier = (personalBests: number) => {
	// gradual increase from 0.5 (1 record) to 2.0 (at 500 personal bests)
	if (personalBests < 1) {
		return 0.9;
	}
	if (personalBests < 500) {
		const interpolationFactor = (personalBests - 1) / 499; // 1 to 500
		return Math.max(0.9, Math.min(2.0, 0.9 + interpolationFactor * 1.1));
	}

	return 2;
};

const normaliseNumber = (value: number) => {
	// If the value is NaN, we want to return 0
	return Number.isNaN(value) ? 0 : value;
};

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
	const competitivenessMultiplier = normaliseNumber(
		levelScoreCompetitivenessMultiplier(wrTime, topTimes, personalBests, totalRecords),
	);
	const ratingModifier = normaliseNumber(levelScoreRatingModifier(levelRating));
	const popularityModifier = normaliseNumber(levelScorePopularityModifier(personalBests));
	const points = Math.round(
		BASE_POINTS *
			durationMultiplier *
			competitivenessMultiplier *
			ratingModifier *
			popularityModifier,
	);

	return {
		points,
		contributions: {
			duration: durationMultiplier,
			competitiveness: competitivenessMultiplier,
			rating: ratingModifier,
			popularity: popularityModifier,
		},
	};
};
