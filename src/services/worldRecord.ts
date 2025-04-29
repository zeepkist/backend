import { and, eq } from 'drizzle-orm';
import { db, record, worldRecordGlobal } from '../db';

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

interface UpsertWorldRecord {
	idUser: number;
	idLevel: number;
	idRecord: number;
	time: number;
}

export async function upsertWorldRecord({ idLevel, idRecord, time }: UpsertWorldRecord) {
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
					dateCreated: now,
					dateUpdated: now,
				})
				.returning();

			console.debug(`World record for level ${idLevel} inserted`);

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
