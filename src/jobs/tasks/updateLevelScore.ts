import { type Task, addJob, defaultJobOptions } from '..';
import {
	getPersonalBestsWithRecord,
	getTotalRecords,
	getVoteRating,
	updateLevelPoints,
} from '../../services';
import { calculateLevelPoints } from '../../utils';

interface Payload {
	idLevel: number;
	idUser?: number;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { idLevel, idUser } = payload;

	const personalBests = await getPersonalBestsWithRecord({ idLevel, limit: 50 });
	const totalRecords = await getTotalRecords({ idLevel });
	const levelRating = await getVoteRating({ idLevel });

	const topTimes = personalBests.map((pb) => pb.time);
	const pbCount = Number(personalBests.at(0)?.totalCount) ?? 0;

	const { points } = calculateLevelPoints({
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
		addJob('updatePlayerScore', { idUser }, defaultJobOptions);
	}
};

export default task;
