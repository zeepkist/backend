import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { level, levelMetadata, levelPoints, personalBestGlobal, record, user } from '../db/schema';

type LevelStats = {
	id_level: number;
	wr_time: number;
	top10_times: number[];
	pb_count: number;
	split_stddevs: number[];
};

const BATCH_SIZE = 2_000;

function* batch<T>(items: T[], size: number): Generator<T[]> {
	for (let i = 0; i < items.length; i += size) {
		yield items.slice(i, i + size);
	}
}

async function* generateLevelStats(levelIds: number[]): AsyncGenerator<LevelStats> {
	for (const batchIds of batch(levelIds, BATCH_SIZE)) {
		// Batch top 10 times
		const topTimes = await db
			.select({
				id: record.idLevel,
				time: record.time,
				// splits: record.splits,
				// speeds: record.speeds,
			})
			.from(record)
			.where(inArray(record.idLevel, batchIds))
			.orderBy(record.idLevel, record.time)
			.execute();

		// Group top 10 times per level
		const top10Map = new Map<number, number[]>();
		for (const { id, time } of topTimes) {
			const times = top10Map.get(id) ?? [];
			if (times.length < 10) {
				times.push(time);
				top10Map.set(id, times);
			}
		}

		// Batch PB counts
		const pbCounts = await db
			.select({ id: personalBestGlobal.idLevel, count: sql<number>`COUNT(*)` })
			.from(personalBestGlobal)
			.where(inArray(personalBestGlobal.idLevel, batchIds))
			.groupBy(personalBestGlobal.idLevel)
			.execute();

		const pbCountMap = new Map(pbCounts.map((r) => [r.id, Number(r.count)]));

		for (const id of batchIds) {
			const top10 = top10Map.get(id) ?? [];
			if (top10.length === 0) continue;

			yield {
				id_level: id,
				wr_time: top10[0],
				top10_times: top10,
				pb_count: pbCountMap.get(id) ?? 0,
				split_stddevs: [],
			};
		}
	}
}

/*
const preparedTopTimes = db
	.select({
		time: record.time
	})
	.from(record)
	.where(and(
		eq(record.idLevel, sql.placeholder('id')),
	))
	.orderBy(record.time)
	.limit(10)
	.prepare('topTimes')
*/

const totalUsers = await db
	.select({ count: sql<number>`COUNT(*)` })
	.from(user)
	.then((rows) => Number(rows[0].count));

function computeScore(stats: LevelStats): number {
	// 1. Get WR and top 10 times
	const { wr_time, top10_times, pb_count } = stats;

	// 2. WR gap score
	const lastTime = top10_times.at(-1) ?? wr_time;
	const wrGapScore = Math.min(1, (lastTime - wr_time) / wr_time);

	// 3. Spread score
	const avgSpread = top10_times.slice(1).reduce((sum, t) => sum + (t - wr_time), 0) / 9;
	const spreadScore = Math.min(1, avgSpread / wr_time);

	// 4. PB count score (logarithmic scale based on total users)
	const pbCountScore = Math.min(1, Math.log(pb_count + 1) / Math.log(totalUsers));

	// 5. Checkpoint variance score (stddev of splits)
	/*
	const splitLength = wr.splits?.length || 0
	const splitSums = new Array(splitLength).fill(0)
	const splitSquares = new Array(splitLength).fill(0)

	topTimes.forEach(({ splits }) => {
		splits?.forEach((s, i) => {
			splitSums[i] += s
			splitSquares[i] += s * s
		})
	})

	const splitStdDevs = splitSums.map((sum, i) => {
		const mean = sum / top10.length
		const variance = splitSquares[i] / top10.length - mean ** 2
		return Math.sqrt(variance)
	})

	const checkpointVarianceScore = Math.min(1, splitStdDevs.reduce((a, b) => a + b, 0) / wrTime)
	*/

	// 6. Routing entropy placeholder
	// const routingEntropyScore = 0

	// 7. Apply score to WR time (punish fast levels (e.g < 20s)). ~40 seconds should have
	// a score of 1.0 and should drop off to 0.25 at 90 seconds
	const timePenalty = computeWrTimeScore(wr_time);
	const cutPenalty = detectCutPenalty(wr_time, top10_times, stats.id_level);

	//console.debug(`WR time: ${wr_time}, Time penalty: ${timePenalty}`)
	if (cutPenalty < 1) {
		// console.warn(`Cut detected: ${wr_time} (cut penalty: ${cutPenalty})`)
	}

	const finalScore =
		10_000 *
		((0.4 * wrGapScore + 0.25 * spreadScore + 0.75 * pbCountScore) * // +
			// 0.2 * checkpointVarianceScore +
			// 0.1 * routingEntropyScore
			timePenalty) *
		cutPenalty;

	// round and ensure even number
	const roundedScore = Math.round(finalScore);
	if (roundedScore % 2 !== 0) {
		return roundedScore + 1;
	}

	return roundedScore;
}

function detectCutPenalty(wrTime: number, topTimes: number[], levelId: number): number {
	const mean = topTimes.reduce((a, b) => a + b, 0) / topTimes.length;
	const stddev = Math.sqrt(topTimes.reduce((a, b) => a + (b - mean) ** 2, 0) / topTimes.length);

	const zScore = (wrTime - mean) / stddev;
	const threshold = -2; // 2.5?
	//const wrRatio = wrTime / authorValidationTime

	const suspiciousWR = zScore < threshold; // || wrRatio < 0.5

	if (suspiciousWR) {
		// console.warn(`Suspicious WR detected: ${wrTime} (z-score: ${zScore.toFixed(2)})`)
	}

	if (levelId === 15996) {
		console.debug(`Level 15996 WR: ${wrTime} (z-score: ${zScore.toFixed(2)})`);
	}

	if (!suspiciousWR) return 1;

	// z-score below -1 is suspicious. Multiply the distance from the threshold by 0.5
	const severity = Math.abs(zScore - threshold);
	const minimumPenalty = 0.2; // 20% penalty
	const penaltyScale = 0.5; // Higher = more severe penalty
	const penalty = Math.max(minimumPenalty, 1 - severity * penaltyScale);

	//console.debug(`Severity: ${severity.toFixed(2)}, Penalty: ${penalty.toFixed(2)}`)

	return penalty; // Apply 50% penalty if suspicious
}

function computeWrTimeScore(wrTime: number): number {
	const clampedTime = Math.min(wrTime, 90); // Clamp to 90 seconds
	const peak = 40; // 40 seconds
	const minTime = 10; // 10 seconds
	const minDropoff = 20; // 20 seconds
	const maxScore = 1.2;

	// Below minTime, score is 0
	if (clampedTime < minTime) return 0;

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
}

//console.log('Computing level score...')
//const levelId = 9 // Replace with actual level ID
//const score = await computeLevelScore(levelId)
//console.log(`Level ID: ${levelId}, Score: ${score}`)

// Get all level IDs
const levelIds = await db
	.select({ id: level.id })
	.from(level)
	.then((rows) => rows.map((row) => row.id));

const levelScores = new Map<number, number>();

console.log(`Computing scores for ${levelIds.length} levels...`);

const startTime = performance.now();
let count = 0;
let lastTime = startTime;

for await (const stats of generateLevelStats(levelIds)) {
	const score = computeScore(stats);
	levelScores.set(stats.id_level, score);
	count++;

	if (count % 1000 === 0) {
		const now = performance.now();
		const elapsed = (now - lastTime) / 1000;
		lastTime = now;
		const percentage = Math.round((count / levelIds.length) * 100);
		console.log(
			`Processed ${count} levels... (${percentage}%) ~${elapsed.toFixed(2)} ms/level`,
		);
	}
}

// save to ./levelScores.json
Bun.write(
	'./src/experiments/levelScores.json',
	JSON.stringify(Object.fromEntries(levelScores), null, 2),
);

console.log('Level scores saved to ./levelScores.json');
console.log(`Total time: ${(performance.now() - startTime).toFixed(2)} ms`);
