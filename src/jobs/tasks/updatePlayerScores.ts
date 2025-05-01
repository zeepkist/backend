import type { Task } from '../../jobs';
import {
	getAllUsersWithPersonalBests,
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
	const users = await getAllUsersWithPersonalBests();
	// Map<userId, points>
	const pointsMap: PointsMap[] = [];

	for (const { idUser } of users) {
		const personalBests = await getUserPersonalBestsWithLevelPointsAndPosition({
			idUser,
		});

		if (personalBests.length === 0) {
			// helpers.logger.info(`User ${idUser} has not played any levels.`);
			continue;
		}

		const { points, totalPoints } = calculatePlayerPoints(personalBests);
		pointsMap.push({ idUser, points });

		await updateUserPoints({
			idUser,
			points,
			totalPoints,
		});
	}

	const usersSortedByHighestPoints = pointsMap.sort((a, b) => b.points - a.points);

	// write rank to userPoints table
	for (let i = 0; i < usersSortedByHighestPoints.length; i++) {
		const userPoint = usersSortedByHighestPoints[i];

		if (!userPoint) continue;

		await updateUserRank({
			idUser: userPoint.idUser,
			rank: i + 1,
		});
	}
};

export default task;
