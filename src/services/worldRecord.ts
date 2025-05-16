import { sql, eq } from 'drizzle-orm';
import { db, record, worldRecordGlobal, userPoints } from '../db';

export async function getWorldRecordWithRecord(idLevel: number) {
	const worldRecord = await db
		.select({
			id: worldRecordGlobal.id,
			idLevel: worldRecordGlobal.idLevel,
			idRecord: worldRecordGlobal.idRecord,
			time: record.time,
			idUser: record.idUser,
		})
		.from(worldRecordGlobal)
		.leftJoin(record, eq(worldRecordGlobal.idRecord, record.id))
		.where(eq(worldRecordGlobal.idLevel, idLevel))
		.limit(1);

	return worldRecord?.[0] ?? null;
}

export async function getTotalWorldRecordsByUser(idUser: number) {
	const totalWorldRecords = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(worldRecordGlobal)
		.where(eq(worldRecordGlobal.idUser, idUser))
		.then((rows) => Number(rows[0]?.count));

	return totalWorldRecords;
}

interface UpsertWorldRecord {
	idUser: number;
	idLevel: number;
	idRecord: number;
	time: number;
}

export async function upsertWorldRecord({ idLevel, idRecord, idUser, time }: UpsertWorldRecord) {
	const result = await db.transaction(async (tx) => {
		const currentWR = await getWorldRecordWithRecord(idLevel);
		const now = new Date().toISOString();

		// If there is no world record or the new record is better, upsert the new world record
		if (!currentWR || (typeof currentWR.time === 'number' && currentWR.time > time)) {
			// Try to update existing world record
			const [updated] = await tx
				.update(worldRecordGlobal)
				.set({
					idLevel,
					idRecord,
					idUser,
					dateUpdated: now,
				})
				.where(eq(worldRecordGlobal.idLevel, idLevel))
				.returning();

			if (updated) {
				console.debug(`World record for level ${idLevel} updated`);
				return updated;
			}

			// If not found, insert new world record
			const [inserted] = await tx
				.insert(worldRecordGlobal)
				.values({
					idLevel,
					idRecord,
					idUser,
					dateCreated: now,
					dateUpdated: now,
				})
				.returning();

			console.debug(`World record for level ${idLevel} inserted`);

			// set old WR record holder and new WR record holder's "userPoints"'s world_records to
			// the count of world records by each user
			const oldRecordHolder = currentWR?.idUser;

			if (typeof oldRecordHolder === "number" && oldRecordHolder !== idUser) {
				const worldRecords = await getTotalWorldRecordsByUser(oldRecordHolder)
				// Update the old record holder's world records count
				await tx
					.update(userPoints)
					.set({
						worldRecords,
						dateUpdated: now,
					})
					.where(eq(userPoints.idUser, oldRecordHolder))
			}

			// update the new record holder's world records count
			const worldRecords = await getTotalWorldRecordsByUser(idUser);
			await tx
				.update(userPoints)
				.set({
					worldRecords,
					dateUpdated: now,
				})
				.where(eq(userPoints.idUser, idUser));

			return inserted;
		}

		console.debug(
			`Time ${time} is not better than current world record ${currentWR.time} for level ${idLevel}`,
		);

		return null;
	});

	if (!result && result !== null) {
		throw new Error(`Failed to upsert world record for level ${idLevel}`);
	}

	return result;
}
