import { and, eq, sql } from 'drizzle-orm';
import { db, levelPoints, personalBestGlobal, record } from '../db';
import { addJob, defaultJobOptions } from '../jobs';

interface PersonalBestWithRecord {
	idUser: number;
	idLevel: number;
}

export async function getPersonalBestWithRecord({ idUser, idLevel }: PersonalBestWithRecord) {
	const personalBest = await db
		.select({
			id: personalBestGlobal.id,
			idLevel: personalBestGlobal.idLevel,
			idRecord: personalBestGlobal.idRecord,
			time: record.time,
			idUser: record.idUser,
		})
		.from(personalBestGlobal)
		.leftJoin(record, eq(personalBestGlobal.idRecord, record.id))
		.where(and(eq(personalBestGlobal.idUser, idUser), eq(personalBestGlobal.idLevel, idLevel)))
		.limit(1);

	return personalBest?.[0] ?? null;
}

interface UpsertPersonalBest {
	idUser: number;
	idLevel: number;
	idRecord: number;
	time: number;
}

export async function upsertPersonalBest({ idUser, idLevel, idRecord, time }: UpsertPersonalBest) {
	const result = await db.transaction(async (tx) => {
		const currentPB = await getPersonalBestWithRecord({ idUser, idLevel });
		const now = new Date().toISOString();

		if (!currentPB || (typeof currentPB.time === 'number' && currentPB.time > time)) {
			// Try to update existing personal best
			const [updated] = await tx
				.update(personalBestGlobal)
				.set({
					idLevel,
					idRecord,
					dateUpdated: now,
				})
				.where(
					and(
						eq(personalBestGlobal.idUser, idUser),
						eq(personalBestGlobal.idLevel, idLevel),
					),
				)
				.returning();

			if (updated) {
				console.debug(`Personal best for user ${idUser} on level ${idLevel} updated`);

				addJob(
					'updateLevelScore',
					{
						idLevel,
						idUser,
					},
					defaultJobOptions,
				);

				return updated;
			}

			// If not found, insert new personal best
			const [inserted] = await tx
				.insert(personalBestGlobal)
				.values({
					idUser,
					idLevel,
					idRecord,
					dateCreated: now,
					dateUpdated: now,
				})
				.returning();

			console.debug(`Personal best for user ${idUser} on level ${idLevel} inserted`);

			addJob(
				'updateLevelScore',
				{
					idLevel,
					idUser,
				},
				defaultJobOptions,
			);

			return inserted;
		}

		console.debug(
			`Time ${time} is not better than current personal best ${currentPB.time} for user ${idUser} on level ${idLevel}`,
		);

		return null;
	});

	if (!result && result !== null) {
		throw new Error(`Failed to upsert personal best for user ${idUser} on level ${idLevel}`);
	}

	return result;
}

export async function getUserPersonalBestsWithLevelPointsAndPosition({
	idUser,
}: { idUser: number }) {
	const personalBests = await db
		.select({
			idUser: personalBestGlobal.idUser,
			idLevel: personalBestGlobal.idLevel,
			levelPoints: levelPoints.points,
			position: sql<bigint>`(
				SELECT COUNT(*)
				FROM ${record} AS r
				WHERE r.id_level = ${personalBestGlobal.idLevel}
				AND r.time < ${record.time}
			) + 1`.as('position'),
		})
		.from(personalBestGlobal)
		.innerJoin(levelPoints, eq(levelPoints.idLevel, personalBestGlobal.idLevel))
		.innerJoin(record, eq(record.id, personalBestGlobal.idRecord))
		.where(eq(personalBestGlobal.idUser, idUser))
		.orderBy(personalBestGlobal.idLevel);

	return personalBests;
}
