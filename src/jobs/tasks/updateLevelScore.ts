import { type Task, addJob, defaultJobOptions } from '..';
import {
	getPersonalBestsWithRecord,
	getTotalRecords,
	getVoteValues,
	updateLevelPoints
} from '../../services';
import { calculateLevelPoints, calculateVoteRating } from '../../utils';

interface Payload {
	idLevel: number;
	idUser?: number;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { idLevel, idUser } = payload;

	const personalBests = await getPersonalBestsWithRecord({ idLevel, limit: 50 });
	const totalRecords = await getTotalRecords({ idLevel });
	const voteValues = await getVoteValues({ idLevel });

	const topTimes = personalBests.map((pb) => pb.time);
	const pbCount = Number(personalBests.at(0)?.totalCount) ?? 0;

	const rating = calculateVoteRating(voteValues)

	const { points, modifiers } = calculateLevelPoints({
		topTimes,
		personalBests: pbCount,
		totalRecords,
		rating,
	});

	const { lengthModifier, competitivenessModifier, ratingModifier, popularityModifier } = modifiers;

	await updateLevelPoints({
		idLevel,
		points,
		rating,
		lengthModifier,
		competitivenessModifier,
		ratingModifier,
		popularityModifier,
	})

	// If job is triggered by a new personal best, we need to update the player score
	if (idUser) {
		addJob('updatePlayerScore', { idUser }, defaultJobOptions);
	}
};

export default task;
