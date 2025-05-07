import { type Task, addJob } from '..';
import {
	getPersonalBestsWithRecord,
	getTotalUsers,
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

	const personalBests = await getPersonalBestsWithRecord({ idLevel, limit: 10 });
	const totalUsers = await getTotalUsers();
	const levelRating = await getVoteRating({ idLevel });

	const topTimes = personalBests.map((pb) => pb.time);
	const pbCount = personalBests.at(0)?.totalCount ?? 0;

	const { points, contributions } = calculateLevelPoints({
		topTimes,
		personalBests: pbCount,
		totalUsers,
		levelRating,
	});

	helpers.logger.info(
		`Level ${idLevel} points calculated: ${points}\n` +
			`WR Gap Score: ${contributions.worldRecordTimeGap}\n` +
			`Spread Score: ${contributions.timeSpread}\n` +
			`PB Count Score: ${contributions.personalBests}\n` +
			`Time Penalty Score: ${contributions.worldRecordTimePenalty}\n` +
			`Cut Penalty: ${contributions.cutPenalty}` +
			`Level Rating: ${contributions.levelRating}`,
	);

	await updateLevelPoints({
		idLevel,
		points,
	});

	// If job is triggered by a new personal best, we need to update the player score
	if (idUser) {
		addJob('updatePlayerScore', { idUser }, {
			priority: 1,
			maxAttempts: 3,
		});
	}
};

export default task;
