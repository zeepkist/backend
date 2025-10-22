import { sub } from 'date-fns';
import type { Helpers } from 'graphile-worker';
import type { Task } from '..';
import {
	type UserWithLatestRecordDate,
	getAllUsersWithLatestRecordDate,
	getUserPersonalBestsWithLevelPointsAndPosition,
	upsertUserPoints,
	updateUserRank,
	bulkUpdateUserRanks
} from '../../services';
import { batchProcess, calculatePlayerPoints } from '../../utils';

interface PointsList {
	idUser: number;
	points: number;
}

const handleRankedUsers = async (helpers: Helpers, users: UserWithLatestRecordDate[]) => {
	// Map<userId, points>
	const pointsList: PointsList[] = [];
	let usersUpdated = 0;

	for (const userBatch of batchProcess(users)) {
		await Promise.all(
			userBatch.map(async ({ idUser }) => {
				const personalBests = await getUserPersonalBestsWithLevelPointsAndPosition({
					idUser,
				});

				if (personalBests.length === 0) {
					pointsList.push({ idUser, points: 0 });

					await upsertUserPoints({
						idUser,
						points: 0,
						totalPoints: 0,
					});

					return;
				}

				const { points, totalPoints } = calculatePlayerPoints(personalBests);
				pointsList.push({ idUser, points });

				await upsertUserPoints({
					idUser,
					points,
					totalPoints,
				});
			}),
		);

		usersUpdated += userBatch.length;

		helpers.logger.info(
			`Processed ${userBatch.length} users, updated ${usersUpdated} users so far.`,
		);
	}

	helpers.logger.info(`User points updated for ${usersUpdated} users.`);

	const usersSortedByHighestPoints = pointsList.sort((a, b) => b.points - a.points);

	let currentRank = 1;
	let previousPoints: number | undefined = undefined;
	let actualRank = 1;

	// write rank to userPoints table with dense ranking (equal points get same rank)
	for (let i = 0; i < usersSortedByHighestPoints.length; i++) {
		const userPoint = usersSortedByHighestPoints[i];
		if (!userPoint) continue;

		if (previousPoints === undefined || previousPoints !== userPoint.points) {
			currentRank = actualRank;
		}

		await updateUserRank({
			idUser: userPoint.idUser,
			rank: currentRank,
		});

		previousPoints = userPoint.points;
		actualRank++;
	}

	helpers.logger.info(`User ranks updated for ${usersSortedByHighestPoints.length} users.`);
}

const handleUnrankedUsers = async (helpers: Helpers, users: UserWithLatestRecordDate[]) => {
	// set all users points to 0 and rank to -1 in one bulk operation
	if (users.length === 0) {
		helpers.logger.info('No unranked users to process.');
		return;
	}

	await bulkUpdateUserRanks({
		idUsers: users.map((user) => user.idUser),
		points: 0,
		rank: -1,
	});

	helpers.logger.info(`Set points to 0 and rank to -1 for ${users.length} unranked users.`);
}

const task: Task<never> = async (_payload, helpers) => {
	const unrankedCutoffDate = sub(new Date(), { months: 6 });
	const users = await getAllUsersWithLatestRecordDate();

	if (users.length === 0) {
		helpers.logger.info('No users found with personal bests.');
		return;
	}

	helpers.logger.info(`Found ${users.length} users with personal bests.`);

	const unrankedUsers = users.filter(
		(user) =>
			!user.latestRecordDate || new Date(user.latestRecordDate) < unrankedCutoffDate,
	);

	const rankedUsers = users.filter(
		(user) =>
			user.latestRecordDate && new Date(user.latestRecordDate) >= unrankedCutoffDate,
	);

	await Promise.all([
		handleUnrankedUsers(helpers, unrankedUsers),
		handleRankedUsers(helpers, rankedUsers),
	]);

	helpers.logger.info('Player scores update task completed.');
};

export default task;
