import type { Task } from '..';
import { getUserPersonalBestsWithLevelPointsAndPosition, updateUserPoints } from '../../services';
import { calculatePlayerPoints } from '../../utils';

interface UpdatePlayerScorePayload {
	idUser: number;
}

const task: Task<UpdatePlayerScorePayload> = async (payload, helpers) => {
	try {
		const { idUser } = payload;
		helpers.logger.info(`User, ${idUser}!`);

		const personalBests = await getUserPersonalBestsWithLevelPointsAndPosition({ idUser });

		if (personalBests.length === 0) {
			// helpers.logger.info(`User ${idUser} has not played any levels.`);
			return;
		}

		// console.debug(`Found ${personalBests.length} personal bests for user ${idUser}.`, personalBests[0]);

		const { points, totalPoints } = calculatePlayerPoints(personalBests);

		await updateUserPoints({
			idUser,
			points,
			totalPoints,
		});

		// helpers.logger.info(`User ${idUser} points updated: ${totalPoints}, Decayed Points: ${points}`);
	} catch (error) {
		helpers.logger.error(`Error updating player score: ${error}`);
		console.trace(error);
	}
};

export default task;
