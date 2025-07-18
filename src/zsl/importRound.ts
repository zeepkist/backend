import { join } from 'node:path';
import {
	getLevelByUuid,
	getOrCreateZslLevel,
	getOrCreateZslRound,
	getOrInsertUser,
	getRecordFromZsl,
	upsertZslLevelResult,
	upsertZslRoundResult,
} from '../services';
import { SUPER_LEAGUE_DATA } from './config';
import type { TournamentEvent } from './types';

interface ImportRoundOptions {
	seasonName: string;
	idSeason: number;
	name: string;
	round: number;
	workshopId: string;
	eventDate: string;
}

export const importRound = async ({
	seasonName,
	idSeason,
	name,
	round,
	workshopId,
	eventDate,
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

	const sortedRoundStandings = users
		.filter((u) => u.totalPoints !== null)
		.sort((a, b) => b.totalPoints - a.totalPoints);

	for await (const [index, user] of sortedRoundStandings.entries()) {
		const { totalPoints, steamId } = user;
		const { id: idUser } = await getOrInsertUser(BigInt(steamId));

		await upsertZslRoundResult({
			idRound: dbRound.id,
			idUser,
			position: index + 1, // position is 1-indexed
			points: totalPoints,
		});
	}

	console.debug(`Processed ${users.length} users for round "${name}"`);

	for await (const [index, level] of levels.entries()) {
		const { level: uuid, standings } = level;
		const dbLevel = await getLevelByUuid(uuid);
		const dbLevelId = dbLevel?.id;

		if (!dbLevelId) {
			console.warn(`Level "${uuid}" not found, skipping`);
			continue;
		}

		const dbZslLevel = await getOrCreateZslLevel({
			idRound: dbRound.id,
			idLevel: dbLevelId,
		});

		if (!dbZslLevel) {
			console.warn(`ZSL level for level "${uuid}" not found, skipping`);
			continue;
		}

		console.debug(`Processing level "${uuid}" for round "${name}"`);

		const sortedStandings = standings
			.filter((s) => s.time !== null)
			.sort((a, b) => a.time - b.time);

		for await (const standing of sortedStandings) {
			const { steamId, time, points } = standing;
			const { id: idUser } = await getOrInsertUser(BigInt(steamId));

			/*
			const { id: idRecord } = await getRecordFromZsl({
				idLevel: dbLevelId,
				idUser,
				time
			}) ?? {}
			*/

			await upsertZslLevelResult({
				idLevel: dbZslLevel.id,
				idUser,
				idRecord: undefined,
				position: index + 1, // position is 1-indexed
				points,
				time,
			});
		}
	}

	console.debug(`Processed ${levels.length} levels for round "${name}"`);

	return dbRound;
};
