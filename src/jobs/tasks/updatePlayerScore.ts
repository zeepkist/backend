import type { Task } from '..';
import { getUserPersonalBestsWithLevelPointsAndPosition, updateUserPoints } from '../../services';
import { calculatePlayerPoints } from '../../utils';

interface Payload {
	idUser: number;
}

const task: Task<Payload> = async (payload, helpers) => {
	try {
		const { idUser } = payload;
		helpers.logger.info(`User, ${idUser}!`);

		const personalBests = await getUserPersonalBestsWithLevelPointsAndPosition({ idUser });

		if (personalBests.length === 0) {
			return;
		}

		const { points, totalPoints } = calculatePlayerPoints(personalBests);

		await updateUserPoints({
			idUser,
			points,
			totalPoints,
		});
	} catch (error) {
		helpers.logger.error(`Error updating player score: ${error}`);
		console.trace(error);
	}
};

export default task;
