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

export async function getVoteValues({ idLevel }: { idLevel: number }): Promise<number[]> {
	const voteValues = await db
		.select({
			values: sql<number[]>`ARRAY_AGG(${vote.value})`.as('values'),
		})
		.from(vote)
		.where(eq(vote.idLevel, idLevel))
		.limit(1)
		.then((rows) => rows[0]?.values ?? []);

	return voteValues;
}
