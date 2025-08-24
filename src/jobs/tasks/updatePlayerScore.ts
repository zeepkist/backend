import type { Task } from '..';
import { getUserPersonalBestsWithLevelPointsAndPosition, upsertUserPoints } from '../../services';
import { calculatePlayerPoints } from '../../utils';

interface Payload {
	idUser: number;
}

const task: Task<Payload> = async (payload, helpers) => {
	try {
		const { idUser } = payload;

		const personalBests = await getUserPersonalBestsWithLevelPointsAndPosition({ idUser });

		if (personalBests.length === 0) {
			return;
		}

		const { points, totalPoints } = calculatePlayerPoints(personalBests);

		await upsertUserPoints({
			idUser,
			points,
			totalPoints,
		});
	} catch (error) {
		helpers.logger.error(`Error updating player score for idUser ${payload.idUser}: ${error}`, {
			idUser: payload.idUser,
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

export default task;
