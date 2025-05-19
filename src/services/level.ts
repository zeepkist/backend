import { eq, gte } from 'drizzle-orm';
import { db, level, record } from '../db';

export async function getOrInsertLevel(hash: string): Promise<typeof level.$inferSelect | null> {
	const existingLevel = await db.query.level.findFirst({
		where: eq(level.hash, hash),
	});

	if (existingLevel) {
		return existingLevel;
	}

	console.debug(`Creating new level with hash ${hash}`);

	const newLevel = await db.transaction(async (tx) => {
		const now = new Date().toISOString();
		const [insertedLevel] = await tx
			.insert(level)
			.values({
				hash,
				dateCreated: now,
				dateUpdated: now,
			})
			.returning();

		return insertedLevel;
	});

	if (!newLevel) {
		console.error(`Failed to insert level with hash ${hash}`);
		return null;
	}

	console.debug(`Level with hash ${hash} inserted (${newLevel.id})`);

	return newLevel;
}

export async function getAllLevelIds(): Promise<number[]> {
	const levels = await db.select({ id: level.id }).from(level);

	return levels.map((level) => level.id);
}

export async function getAllLevelIdsWithRecordsSince(recordsSince: Date): Promise<number[]> {
	const levels = await db
		.select({ id: level.id })
		.from(level)
		.innerJoin(record, eq(level.id, record.idLevel))
		.where(gte(record.dateCreated, recordsSince.toISOString()));

	return levels.map((level) => level.id);
}
