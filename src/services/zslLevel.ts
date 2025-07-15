import { and, eq } from 'drizzle-orm';
import { db, zslLevel } from '../db';

interface GetZslLevel {
	idRound: number;
	idLevel: number;
}

export async function getOrCreateZslLevel({
	idRound,
	idLevel
}: GetZslLevel) {
	const existingLevel = await db
		.select({
			id: zslLevel.id
		})
		.from(zslLevel)
		.where(
			and(
				eq(zslLevel.idRound, idRound),
				eq(zslLevel.idLevel, idLevel)
			)
		)
		.then(rows => rows[0]);

	if (existingLevel) {
		return existingLevel;
	}

	console.warn(`ZSL level for level "${idLevel}" not found, creating new one`);

	const [createdRound] = await db.transaction(async (tx) => {
		const inserted = await tx
			.insert(zslLevel)
			.values({
				idRound,
				idLevel
			})
			.returning();

		console.debug(`ZSL level for level "${idLevel}" created with ID ${inserted[0]?.id}`);

		return inserted;
	});

	return createdRound


}
