import { eq, sql } from 'drizzle-orm';
import { db, personalBestGlobal, record } from '../db';

interface RecordData {
	idUser: number;
	idLevel: number;
	time: number;
	splits: number[];
	speeds: number[];
	modVersion: string;
	gameVersion: string;
}

export async function insertRecord({
	idUser,
	idLevel,
	time,
	splits,
	speeds,
	modVersion,
	gameVersion,
}: RecordData): Promise<typeof record.$inferSelect | null> {
	const now = new Date().toISOString();

	const result = await db.transaction(async (tx) => {
		const [inserted] = await tx
			.insert(record)
			.values({
				idUser,
				idLevel,
				time,
				//splits, // TODO: Bun.sql doesn't support array types yet
				//speeds, // TODO: Bun.sql doesn't support array types yet
				modVersion,
				gameVersion,
				dateCreated: now,
			})
			.returning();

		return inserted;
	});

	if (!result) {
		console.error(`Failed to insert record for user ${idUser} on level ${idLevel}`);
		return null;
	}

	console.debug(`Record for user ${idUser} on level ${idLevel} inserted (${result.id})`);

	return result;
}

export async function getPersonalBestsWithRecord({
	idLevel,
	limit = 10,
}: {
	idLevel: number;
	limit?: number;
}) {
	const personalBests = await db
		.select({
			id: record.idLevel,
			time: record.time,
			totalCount: sql<number>`COUNT(*) OVER ()`,
		})
		.from(record)
		.innerJoin(personalBestGlobal, eq(personalBestGlobal.idRecord, record.id))
		.where(eq(record.idLevel, idLevel))
		.orderBy(record.time)
		.limit(limit);

	return personalBests;
}
