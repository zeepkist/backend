import { db, levelPoints, personalBestGlobal, record } from '../db';
import { eq, sql } from 'drizzle-orm';

export async function updateLevelPoints({
	idLevel,
	points
}: {
	idLevel: number;
	points: number;
}): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.update(levelPoints)
			.set({ points })
			.where(eq(levelPoints.idLevel, idLevel))
			.then(rows => rows[0]);
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
					dateUpdated
				})
				.where(eq(levelPoints.idLevel, idLevel))
			})

		await Promise.all(updates.map(update => update.returning()));
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
			position: sql`ROW_NUMBER() OVER (PARTITION BY ${personalBestGlobal.idLevel} ORDER BY ${record.time} ASC)`.as('row_number'),
		})
		.from(levelPoints)
		.innerJoin(personalBestGlobal, eq(personalBestGlobal.idLevel, levelPoints.idLevel))
		.innerJoin(record, eq(record.id, personalBestGlobal.idRecord))

	return rankedPersonalBests;
}
