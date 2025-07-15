import { eq } from 'drizzle-orm';
import { db, zslSeason } from '../db';

export async function getZslSeasons() {
	const seasons = await db
		.select({
			id: zslSeason.id,
			idPointsStructure: zslSeason.idPointsStructure,
			name: zslSeason.name,
			startDate: zslSeason.dateStarted,
			endDate: zslSeason.dateEnded,
		})
		.from(zslSeason)
		.orderBy(zslSeason.id);

	return seasons;
}

interface getOrCreateZslSeasonOptions {
	idPointsStructure: number;
	startDate: string;
	endDate: string;
}

export async function getOrCreateZslSeason(
	name: string,
	{ idPointsStructure, startDate, endDate }: getOrCreateZslSeasonOptions
) {
	const existingSeason = await db
		.select({
			id: zslSeason.id,
			idPointsStructure: zslSeason.idPointsStructure,
			name: zslSeason.name,
			startDate: zslSeason.dateStarted,
			endDate: zslSeason.dateEnded,
		})
		.from(zslSeason)
		.where(eq(zslSeason.name, name))
		.then(rows => rows[0]);

	if (existingSeason) {
		return existingSeason;
	}

	console.warn(`ZSL season "${name}" not found, creating new one`);

	const dateStarted = new Date(startDate);
	dateStarted.setHours(18, 0, 0, 0);

	const dateEnded = new Date(endDate);
	dateEnded.setHours(18, 0, 0, 0);

	const [createdSeason] = await db.transaction(async (tx) => {
		const inserted = await tx
			.insert(zslSeason)
			.values({
				name,
				idPointsStructure,
				dateStarted,
				dateEnded,
			})
			.returning();

		console.debug(`ZSL season "${name}" created with ID ${inserted[0]?.id}`);

		return inserted;
	});

	return createdSeason;
}
