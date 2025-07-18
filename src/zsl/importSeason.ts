import { join } from 'node:path';
import { getOrCreateZslSeason, getOrInsertUser, upsertZslSeasonResult } from '../services';
import { SUPER_LEAGUE_DATA } from './config';
import type { SeasonMetadata, SeasonStanding } from './types';

let previousPointsStructureId: number | null = null;

export const importSeason = async (
	seasonName: string,
	metadata: SeasonMetadata,
	eventDates: string[],
) => {
	if (!metadata.events || Object.keys(metadata.events).length === 0) {
		console.warn(`Season "${seasonName}" has no events, skipping`);
		return;
	}

	const dbSeason = await getOrCreateZslSeason(seasonName, {
		idPointsStructure: previousPointsStructureId ?? 1, // Default to 1 if no previous structure
		startDate: eventDates.at(0) ?? '',
		endDate: eventDates.at(-1) ?? '',
	});

	if (!dbSeason) {
		return;
	}

	// Ensure newly created seasons carry the points structure ID forward
	previousPointsStructureId = dbSeason.idPointsStructure;

	// Import Season Results
	const seasonStandings = (await Bun.file(
		join(SUPER_LEAGUE_DATA, seasonName, 'standings.json'),
	).json()) as SeasonStanding[];

	if (!seasonStandings || seasonStandings.length === 0) {
		console.warn(`No standings found for season "${seasonName}", skipping standings import`);
		return dbSeason;
	}

	for await (const [index, standing] of seasonStandings.entries()) {
		const { totalPoints, steamId } = standing;
		const { id: idUser } = await getOrInsertUser(BigInt(steamId));

		await upsertZslSeasonResult({
			idSeason: dbSeason.id,
			idUser,
			position: index + 1, // position is 1-indexed
			points: totalPoints,
		});
	}

	return dbSeason;
};
