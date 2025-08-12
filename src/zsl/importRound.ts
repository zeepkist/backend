import { join } from 'node:path';
import {
	getLevelsByUuidsBulk,
	getOrCreateZslLevel,
	getOrCreateZslRound,
	// getRecordFromZsl,
	upsertZslLevelResults,
	upsertZslRoundResults,
} from '../services';
import { SUPER_LEAGUE_DATA } from './config';
import type { TournamentEvent } from './types';
import { assignRank } from './assignRank';

interface ImportRoundOptions {
	seasonName: string;
	idSeason: number;
	name: string;
	round: number;
	workshopId: string;
	eventDate: string;
	userIdMap: Map<string, number>;
}

export const importRound = async ({
	seasonName,
	idSeason,
	name,
	round,
	workshopId,
	eventDate,
	userIdMap
}: ImportRoundOptions) => {
	console.debug(`Processing round: ${name}`);

	const dbRound = await getOrCreateZslRound({
		idSeason,
		round,
		name,
		workshopId,
		date: eventDate,
	});

	if (!dbRound) {
		return;
	}

	// if event Date is in the future, skip processing
	if (new Date(eventDate) > new Date()) {
		console.warn(`Round "${name}" is in the future, skipping`);
		return dbRound;
	}

	// Import Round Results
	const { users, levels } = (await Bun.file(
		join(SUPER_LEAGUE_DATA, seasonName, `${eventDate}.json`),
	).json()) as TournamentEvent;

	if (!users || users.length === 0 || !levels || levels.length === 0) {
		console.warn(`No users/levels found for round "${name}", skipping results import`);
		return dbRound;
	}

	const levelUuids = levels.map(level => level.level);
	const levelMap = await getLevelsByUuidsBulk(levelUuids);

	console.debug(`Found ${users.length} users and ${levels.length} levels for round "${name}"`);

	const roundRows = assignRank(
		users.map(standing => ({
			idRound: dbRound.id,
			idUser: userIdMap.get(standing.steamId) ?? -1,
			points: standing.totalPoints,
		}))
	);

	console.debug(`Prepared ${roundRows.length} results for round "${name}"`);

	// filter out users with idUser -1 (not found)
	const filteredRoundRows = roundRows.filter(row => row.idUser !== -1);

	await upsertZslRoundResults(filteredRoundRows);

	console.debug(`Round "${name}" results imported successfully`);

	for await (const level of levels) {
		const { level: uuid, standings } = level;
		const dbLevel = levelMap.get(uuid);
		const dbLevelId = dbLevel?.id;

		if (!dbLevelId) {
			console.warn(`Level "${uuid}" not found, skipping`);
			continue;
		}

		console.debug(`Processing level "${uuid}" for round "${name}"`);

		const dbZslLevel = await getOrCreateZslLevel({
			idRound: dbRound.id,
			idLevel: dbLevelId,
		});

		if (!dbZslLevel) {
			console.warn(`ZSL level for level "${uuid}" not found, skipping`);
			continue;
		}

		// Filter standings with null or undefined time
		const standingsWithTime = standings.filter(
			standing => standing.time !== null && standing.time !== undefined
		);

		const levelRows = assignRank(
			standingsWithTime.map(standing => ({
				idLevel: dbZslLevel.id,
				idUser: userIdMap.get(standing.steamId) ?? -1,
				points: standing.points,
				time: standing.time,
			}))
		);

		console.debug(`Prepared ${levelRows.length} results for level "${uuid}"`);

		const filteredLevelRows = levelRows.filter(row => row.idUser !== -1);

		await upsertZslLevelResults(filteredLevelRows);

		console.debug(`Level "${uuid}" results imported successfully`);
	}

	console.debug(`Processed ${levels.length} levels for round "${name}"`);

	return dbRound;
};
