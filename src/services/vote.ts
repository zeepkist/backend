import { and, eq, sql } from 'drizzle-orm';
import { db, vote } from '../db';

export async function upsertVote(
	idUser: number,
	idLevel: number,
	value: -2 | -1 | 1 | 2,
): Promise<typeof vote.$inferSelect> {
	const result = await db.transaction(async (tx) => {
		// Try to update existing vote
		const [updated] = await tx
			.update(vote)
			.set({ value })
			.where(and(eq(vote.idUser, idUser), eq(vote.idLevel, idLevel)))
			.returning();

		if (updated) {
			return updated;
		}

		// If not found, insert new vote
		const [inserted] = await tx
			.insert(vote)
			.values({
				idUser,
				idLevel,
				value,
				dateCreated: new Date().toISOString(),
			})
			.returning();

		return inserted;
	});

	if (!result) {
		throw new Error(`Failed to upsert vote (${value}) for user ${idUser} on level ${idLevel}`);
	}

	console.debug(`Vote (${value}) for user ${idUser} on level ${idLevel} upserted`);

	return result;
}

export async function getVoteRating({ idLevel }: { idLevel: number }): Promise<number> {
	const rating = await db
		.select({
			percentage: sql<number>`
				ROUND(
					(SUM(${vote.value})::numeric / (COUNT(*) * 2)) * 100,
					2
				)
			`.as('percentage'),
		})
		.from(vote)
		.where(eq(vote.idLevel, idLevel))
		.limit(1)
		.then((rows) => Number(rows[0]?.percentage ?? 0));

	return rating;
}

export async function getVoteRatings() {
	const ratings = await db
		.select({
			idLevel: vote.idLevel,
			percentage: sql<number>`
				ROUND(
					(SUM(${vote.value})::numeric / (COUNT(*) * 2)) * 100,
					2
				)
			`.as('percentage'),
		})
		.from(vote)
		.groupBy(vote.idLevel)
		.orderBy(vote.idLevel);

	return ratings;
}
