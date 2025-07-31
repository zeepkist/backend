import type { Task } from '..';
import {
	getAllUsers,
	getUserPersonalBestsWithLevelPointsAndPosition,
	updateUserPoints,
	updateUserRank,
} from '../../services';
import { batchProcess, calculatePlayerPoints } from '../../utils';

interface PointsList {
	idUser: number;
	points: number;
}

const task: Task<never> = async (_payload, helpers) => {
	const users = await getAllUsers();

	if (users.length === 0) {
		helpers.logger.info('No users found with personal bests.');
		return;
	}

	helpers.logger.info(`Found ${users.length} users with personal bests.`);

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

					await updateUserPoints({
						idUser,
						points: 0,
						totalPoints: 0,
					});

					return;
				}

				const { points, totalPoints } = calculatePlayerPoints(personalBests);
				pointsList.push({ idUser, points });

				await updateUserPoints({
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
};

export default task;
