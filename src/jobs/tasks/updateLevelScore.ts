import { type Task, addJob, defaultJobOptions } from '..';
import {
	getPersonalBestCount90thPercentile,
	getPersonalBestsWithRecord,
	getVoteValues,
	updateLevelPoints,
} from '../../services';
import { calculateLevelPoints, calculateVoteRating } from '../../utils';

interface Payload {
	idLevel: number;
	idUser?: number;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { idLevel, idUser } = payload;

	const [
		personalBests,
		voteValues,
		personalBestCountPercentile
	] = await Promise.all([
		getPersonalBestsWithRecord({ idLevel, limit: 50 }),
		getVoteValues({ idLevel }),
		getPersonalBestCount90thPercentile(),
	]);

	const topTimes = personalBests.map((pb) => pb.time);
	const pbCount = Number(personalBests.at(0)?.totalCount ?? 0);

	const rating = calculateVoteRating(voteValues);

	const { points, modifiers } = calculateLevelPoints({
		topTimes,
		personalBests: pbCount,
		rating,
		personalBestCountPercentile,
	});

	const {
		lengthModifier,
		competitivenessModifier,
		ratingModifier,
		popularityModifier,
		cutPenalty,
	} = modifiers;

	await updateLevelPoints({
		idLevel,
		points,
		rating,
		lengthModifier,
		competitivenessModifier,
		ratingModifier,
		popularityModifier,
		cutPenalty,
	});

	// If job is triggered by a new personal best, we need to update the player score
	if (idUser) {
		await addJob('updatePlayerScore', { idUser }, defaultJobOptions);
	}
};

export default task;
