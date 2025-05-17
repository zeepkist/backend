import { type Task, addJob } from '..';
import {
	getPersonalBestsWithRecord,
	getTotalRecords,
	getVoteRating,
	updateLevelPoints,
} from '../../services';
import { calculateLevelPoints } from '../../utils';

interface UpdateLevelScorePayload {
	idLevel: number;
	idUser?: number;
}

const task: Task<UpdateLevelScorePayload> = async (payload, helpers) => {
	const { idLevel, idUser } = payload;

	helpers.logger.info(`Level, ${idLevel}!`);

	const personalBests = await getPersonalBestsWithRecord({ idLevel, limit: 50 });
	const totalRecords = await getTotalRecords({ idLevel });
	const levelRating = await getVoteRating({ idLevel });

	const topTimes = personalBests.map((pb) => pb.time);
	const pbCount = Number(personalBests.at(0)?.totalCount) ?? 0;

	const { points, contributions } = calculateLevelPoints({
		topTimes,
		personalBests: pbCount,
		totalRecords,
		levelRating,
	});

	await updateLevelPoints({
		idLevel,
		points,
	});

	// If job is triggered by a new personal best, we need to update the player score
	if (idUser) {
		addJob(
			'updatePlayerScore',
			{ idUser },
			{
				priority: 1,
				maxAttempts: 3,
			},
		);
	}
};

export default task;
