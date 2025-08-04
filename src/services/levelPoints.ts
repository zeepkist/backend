import { eq, ne, sql } from 'drizzle-orm';
import { db, levelPoints, levelPointsHistory, personalBestGlobal, record } from '../db';

export async function getTotalLevelPoints() {
	const totalPoints = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(levelPoints)
		.then((rows) => Number(rows[0]?.count));

	return totalPoints ?? 0;
}

export async function getChangedLevelPointsPaginated(offset: number, limit: number) {
	// Step 1: Subquery to get the latest history entry per level
	const latestHistory = db
		.select({
			idLevel: levelPointsHistory.idLevel,
			points: levelPointsHistory.points,
		})
		.from(levelPointsHistory)
		.where(sql`
			(${levelPointsHistory.idLevel}, ${levelPointsHistory.dateCreated}) IN (
				SELECT ${levelPointsHistory.idLevel}, MAX(${levelPointsHistory.dateCreated})
				FROM ${levelPointsHistory}
				GROUP BY ${levelPointsHistory.idLevel}
			)
		`)
		.as('latest_history');

	const result = await db
		.select({
			idLevel: levelPoints.idLevel,
			points: levelPoints.points,
			rating: levelPoints.rating,
			lengthModifier: levelPoints.lengthModifier,
			competitivenessModifier: levelPoints.competitivenessModifier,
			ratingModifier: levelPoints.ratingModifier,
			popularityModifier: levelPoints.popularityModifier,
			cutPenalty: levelPoints.cutPenalty,
		})
		.from(levelPoints)
		.innerJoin(latestHistory, eq(levelPoints.idLevel, latestHistory.idLevel))
		.where(ne(levelPoints.points, latestHistory.points))
		.offset(offset)
		.limit(limit);

	console.debug(
		`Fetched ${result.length} changed level points from offset ${offset} with limit ${limit}`,
	);

	return result;
}

interface UpdateLevelPointsPayload {
	idLevel: number;
	points: number;
	rating: number;
	lengthModifier: number;
	competitivenessModifier: number;
	ratingModifier: number;
	popularityModifier: number;
	cutPenalty: number;
}

export async function upsertLevelPoints({
	idLevel,
	points,
	rating,
	lengthModifier,
	competitivenessModifier,
	ratingModifier,
	popularityModifier,
	cutPenalty,
}: UpdateLevelPointsPayload): Promise<void> {
	const dateUpdated = new Date().toISOString();

	await db.transaction(async (tx) => {
		const existing = await tx
			.select({ idLevel: levelPoints.idLevel })
			.from(levelPoints)
			.where(eq(levelPoints.idLevel, idLevel))
			.limit(1);

		if (existing.length > 0) {
			await tx
				.update(levelPoints)
				.set({
					points,
					dateUpdated,
					rating,
					lengthModifier,
					competitivenessModifier,
					ratingModifier,
					popularityModifier,
					cutPenalty,
				})
				.where(eq(levelPoints.idLevel, idLevel));
		} else {
			await tx.insert(levelPoints).values({
				idLevel,
				points,
				dateUpdated,
				rating,
				lengthModifier,
				competitivenessModifier,
				ratingModifier,
				popularityModifier,
				cutPenalty,
			});
		}
	});
}

export async function batchUpdateLevelPoints(levelScores: Map<number, number>) {
	const dateUpdated = new Date().toISOString();

	await db.transaction(async (tx) => {
		const updates = Array.from(levelScores.entries()).map(([idLevel, points]) => {
			return tx
				.update(levelPoints)
				.set({
					points,
					dateUpdated,
				})
				.where(eq(levelPoints.idLevel, idLevel));
		});

		await Promise.all(updates.map((update) => update.returning()));
	});
}

export async function getAllRankedPersonalBests() {
	const rankedPersonalBests = await db
		.select({
			idLevel: personalBestGlobal.idLevel,
			levelPoints: levelPoints.points,
			idUser: personalBestGlobal.idUser,
			idRecord: personalBestGlobal.idRecord,
			time: record.time,
			position:
				sql`ROW_NUMBER() OVER (PARTITION BY ${personalBestGlobal.idLevel} ORDER BY ${record.time} ASC)`.as(
					'row_number',
				),
		})
		.from(levelPoints)
		.innerJoin(personalBestGlobal, eq(personalBestGlobal.idLevel, levelPoints.idLevel))
		.innerJoin(record, eq(record.id, personalBestGlobal.idRecord));

	return rankedPersonalBests;
}
