import { and, eq } from 'drizzle-orm';
import { db, zslRound } from '../db';

interface GetZslRound {
	idSeason: number;
	round: number;
	name: string;
	workshopId: string;
	date: string;
}

export async function getOrCreateZslRound({
	idSeason,
	round,
	name,
	workshopId,
	date,
}: GetZslRound) {
	const existingRound = await db
		.select({
			id: zslRound.id,
			name: zslRound.name,
			round: zslRound.round,
			workshopId: zslRound.workshopId,
			eventDate: zslRound.eventDate,
		})
		.from(zslRound)
		.where(
			and(
				eq(zslRound.idSeason, idSeason),
				eq(zslRound.round, round)
			),
		)
		.then((rows) => rows[0]);

	const adjustedWorkshopId = BigInt(workshopId);
	const eventDate = new Date(date).toISOString();

	if (existingRound) {
		const needsUpdate =
			new Date(existingRound.eventDate).getTime() !== new Date(eventDate).getTime() ||
			existingRound.workshopId !== adjustedWorkshopId ||
			existingRound.name !== name;

		if (needsUpdate) {
			await db
				.update(zslRound)
				.set({
					eventDate,
					workshopId: adjustedWorkshopId,
					name,
				})
				.where(eq(zslRound.id, existingRound.id));

			return {
				...existingRound,
				eventDate,
				workshopId: adjustedWorkshopId,
				name,
			};
		}

		return existingRound;
	}

	console.warn(`ZSL round "${name}" not found, creating new one`);

	const [createdRound] = await db.transaction(async (tx) => {
		const inserted = await tx
			.insert(zslRound)
			.values({
				idSeason,
				round,
				name,
				workshopId: adjustedWorkshopId,
				eventDate,
			})
			.returning();

		console.debug(`ZSL round "${name}" created with ID ${inserted[0]?.id}`);

		return inserted;
	});

	return createdRound;
}
