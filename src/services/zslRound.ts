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
				eq(zslRound.round, round),
				eq(zslRound.name, name),
			),
		)
		.then((rows) => rows[0]);

	if (existingRound) {
		return existingRound;
	}

	console.warn(`ZSL round "${name}" not found, creating new one`);

	const eventDate = new Date(date);
	eventDate.setHours(18, 0, 0, 0);

	const adjustedWorkshopId = workshopId === '' ? -1 : workshopId;

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
