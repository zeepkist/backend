import { eq, sql } from 'drizzle-orm';
import { db, levelPoints, personalBestGlobal, record } from '../db';

export async function getTotalLevelPoints() {
	const totalPoints = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(levelPoints)
		.then((rows) => Number(rows[0]?.count));

	return totalPoints ?? 0;
}

export async function getLevelPointsPaginated(offset: number, limit: number) {
	const batch = await db
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
		.limit(limit)
		.offset(offset);

	return batch;
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

export async function updateLevelPoints({
	idLevel,
	points,
	rating,
	lengthModifier,
	competitivenessModifier,
	ratingModifier,
	popularityModifier,
	cutPenalty,
}: UpdateLevelPointsPayload): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.update(levelPoints)
			.set({
				points,
				dateUpdated: new Date().toISOString(),
				rating,
				lengthModifier,
				competitivenessModifier,
				ratingModifier,
				popularityModifier,
				cutPenalty,
			})
			.where(eq(levelPoints.idLevel, idLevel))
			.then((rows) => rows[0]);
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
