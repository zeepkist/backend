import { and, eq, gt, lt, sql } from 'drizzle-orm';
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

interface SubmittedRecordData extends Omit<RecordData, 'splits' | 'speeds'> {
	splits?: number[];
	speeds?: number[];
	dateCreated: string;
	dateUpdated: string;
}

interface GetRecordFromZsl {
	idLevel: number;
	idUser: number;
	time: number;
}

/**
 * Attempt to match a ZSL record to an existing GTR record.
 *
 * Loosely match by time to account for differences in decimal place precision.
 * (if a time is within 5 decimal places of the ZSL time, it is considered a match)
 */
export async function getRecordFromZsl({
	idLevel,
	idUser,
	time
}: GetRecordFromZsl): Promise<typeof record.$inferSelect | undefined> {
	const precision = 0.00001;
	return await db.query.record.findFirst({
		where: and(
			eq(record.idLevel, idLevel),
			eq(record.idUser, idUser),
			gt(record.time, time - precision),
			lt(record.time, time + precision)
		),
	});
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

	const data: SubmittedRecordData = {
		idUser,
		idLevel,
		time,
		modVersion,
		gameVersion,
		dateCreated: now,
		dateUpdated: now,
	};

	if (Array.isArray(splits) && splits?.length) {
		if (splits.some((split) => typeof split !== 'number' || Number.isNaN(split))) {
			console.error('Invalid splits data', splits);
			return null;
		}
		data.splits = splits;
	}

	if (Array.isArray(speeds) && speeds?.length) {
		if (speeds.some((speed) => typeof speed !== 'number' || Number.isNaN(speed))) {
			console.error('Invalid speeds data', speeds);
			return null;
		}
		data.speeds = speeds;
	}

	const result = await db.transaction(async (tx) => {
		const [inserted] = await tx.insert(record).values(data).returning();

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

export async function getTotalRecords({
	idLevel,
}: {
	idLevel: number;
}) {
	const totalRecords = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(record)
		.where(eq(record.idLevel, idLevel))
		.then((rows) => Number(rows[0]?.count));

	return totalRecords;
}
