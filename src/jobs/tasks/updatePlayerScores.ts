import type { Task } from '..';
import {
	getAllUsers,
	getUserPersonalBestsWithLevelPointsAndPosition,
	updateUserPoints,
	updateUserRank,
} from '../../services';
import { calculatePlayerPoints } from '../../utils';

interface PointsMap {
	idUser: number;
	points: number;
}

const task: Task<never> = async (payload, helpers) => {
	const users = await getAllUsers();

	if (users.length === 0) {
		helpers.logger.info('No users found with personal bests.');
		return;
	}

	helpers.logger.info(`Found ${users.length} users with personal bests.`);

	// Map<userId, points>
	const pointsMap: PointsMap[] = [];
	let usersUpdated = 0;

	// Helper generator to yield users in batches
	function* batchUsers<T>(arr: T[], batchSize: number) {
		for (let i = 0; i < arr.length; i += batchSize) {
			yield arr.slice(i, i + batchSize);
		}
	}

	for (const userBatch of batchUsers(users, 500)) {
		await Promise.all(
			userBatch.map(async ({ idUser }) => {
				const personalBests = await getUserPersonalBestsWithLevelPointsAndPosition({
					idUser,
				});

				if (personalBests.length === 0) {
					pointsMap.push({ idUser, points: 0 });

					await updateUserPoints({
						idUser,
						points: 0,
						totalPoints: 0,
					});

					return;
				}

				const { points, totalPoints } = calculatePlayerPoints(personalBests);
				pointsMap.push({ idUser, points });

				await updateUserPoints({
					idUser,
					points,
					totalPoints,
				});
			}),
		);

		usersUpdated += userBatch.length;

		helpers.logger.info(`Processed ${userBatch.length} users, updated ${usersUpdated} users so far.`);
		users
	}

	helpers.logger.info(`User points updated for ${usersUpdated} users.`);

	const usersSortedByHighestPoints = pointsMap.sort((a, b) => b.points - a.points);

	let currentRank = 1;
	let previousPoints = 0;
	let actualRank = 1;

	// write rank to userPoints table with dense ranking (equal points get same rank)
	for (let i = 0; i < usersSortedByHighestPoints.length; i++) {
		const userPoint = usersSortedByHighestPoints[i];
		if (!userPoint) continue;

		if (previousPoints !== userPoint.points) {
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
};

export default task;
