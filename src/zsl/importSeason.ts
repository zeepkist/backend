import { join } from 'node:path';
import { getOrCreateZslSeason, getOrInsertUsersBulk, upsertZslSeasonResults } from '../services';
import { SUPER_LEAGUE_DATA } from './config';
import type { SeasonMetadata, SeasonStanding } from './types';
import { assignRank } from './assignRank';

let previousPointsStructureId: number | null = null;

export const importSeason = async (
	seasonName: string,
	metadata: SeasonMetadata,
	eventDates: string[],
) => {
	if (!metadata.events || Object.keys(metadata.events).length === 0) {
		console.warn(`Season "${seasonName}" has no events, skipping`);
		return {
			season: null,
			userIdMap: new Map<string, number>()
		};
	}

	const dbSeason = await getOrCreateZslSeason(seasonName, {
		idPointsStructure: previousPointsStructureId ?? 1, // Default to 1 if no previous structure
		startDate: eventDates.at(0) ?? '',
		endDate: eventDates.at(-1) ?? '',
	});

	if (!dbSeason) {
		return {
			season: null,
			userIdMap: new Map<string, number>(),
		}
	}

	console.debug(`Processing season: ${seasonName} (ID: ${dbSeason.id})`);

	// Ensure newly created seasons carry the points structure ID forward
	previousPointsStructureId = dbSeason.idPointsStructure;

	// Import Season Results
	const seasonStandings = (await Bun.file(
		join(SUPER_LEAGUE_DATA, seasonName, 'standings.json'),
	).json()) as SeasonStanding[];

	if (!seasonStandings || seasonStandings.length === 0) {
		console.warn(`No standings found for season "${seasonName}", skipping standings import`);
		return {
			season: dbSeason,
			userIdMap: new Map<string, number>(),
		};
	}

	const steamIds = seasonStandings.map(user => user.steamId);
	const userIdMap = await getOrInsertUsersBulk(steamIds);

	console.debug(`Found ${userIdMap.size} users for season "${seasonName}"`);

	const rows = assignRank(
		seasonStandings.map(standing => ({
			idSeason: dbSeason.id,
			idUser: userIdMap.get(standing.steamId) ?? -1,
			points: standing.totalPoints,
		}))
	);

	console.debug(`Prepared ${rows.length} results for season "${seasonName}"`);

	// filter out users with idUser -1 (not found)
	const filteredRows = rows.filter(row => row.idUser !== -1);

	await upsertZslSeasonResults(filteredRows);

	console.debug(`Season "${seasonName}" results imported successfully`);

	return {
		season: dbSeason,
		userIdMap
	};
};
